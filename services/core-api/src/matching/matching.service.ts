import { Injectable, Inject, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';
import { DonorsService } from '../donors/donors.service';
import { NotificationsService } from '../notifications/notifications.service';
import { getCompatibleDonorGroups, scoreDonor } from './scoring.engine';
import { ConfigService } from '@nestjs/config';

interface MatchingJob {
  requestId: string;
  lat: number;
  lng: number;
  bloodGroup: string;
  urgency: string;
  hospitalName: string;
  currentRadius: number;
  notifiedDonorIds: Set<string>;
  timer?: NodeJS.Timeout;
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);
  private activeJobs: Map<string, MatchingJob> = new Map();

  constructor(
    @Inject(DATABASE_POOL) private db: Pool,
    private donorsService: DonorsService,
    private notificationsService: NotificationsService,
    private config: ConfigService,
  ) {}

  async startMatching(requestId: string, lat: number, lng: number, bloodGroup: string, urgency: string, hospitalName: string) {
    const initialRadius = parseFloat(this.config.get('INITIAL_RADIUS_KM', '3'));
    const job: MatchingJob = {
      requestId, lat, lng, bloodGroup, urgency, hospitalName,
      currentRadius: initialRadius,
      notifiedDonorIds: new Set(),
    };
    this.activeJobs.set(requestId, job);

    this.logger.log(`🔴 Starting matching for request ${requestId} | Blood: ${bloodGroup} | Urgency: ${urgency}`);
    await this.runMatchingRound(job);
  }

  private async runMatchingRound(job: MatchingJob) {
    const maxRadius = parseFloat(this.config.get('MAX_RADIUS_KM', '20'));
    if (job.currentRadius > maxRadius) {
      this.logger.warn(`⚠️ Max radius reached for request ${job.requestId}. No donors found.`);
      await this.db.query(
        `UPDATE requests SET status='CANCELLED', notes='No donors found within ${maxRadius}km' WHERE id=$1`,
        [job.requestId],
      );
      this.activeJobs.delete(job.requestId);
      this.notificationsService.broadcastRequestUpdate(job.requestId, 'CANCELLED', null);
      return;
    }

    this.logger.log(`📡 Scanning ${job.currentRadius}km radius for ${job.bloodGroup} donors...`);

    const compatibleGroups = getCompatibleDonorGroups(job.bloodGroup);
    const donors = await this.donorsService.getEligibleDonorsInRadius(
      job.lat, job.lng, job.currentRadius, compatibleGroups,
    );

    // Filter out already-notified donors
    const newDonors = donors.filter(d => !job.notifiedDonorIds.has(d.id));

    if (newDonors.length === 0) {
      this.logger.log(`No new donors at ${job.currentRadius}km. Expanding...`);
      await this.expandRadius(job);
      return;
    }

    // Score and rank donors
    const scored = newDonors
      .map(d => ({
        ...d,
        computedScore: scoreDonor(d, job.currentRadius),
      }))
      .sort((a, b) => b.computedScore - a.computedScore);

    const topN = parseInt(this.config.get('TOP_DONORS_PER_BATCH', '5'));
    const topDonors = scored.slice(0, topN);

    this.logger.log(`🎯 Top ${topDonors.length} donors selected (out of ${newDonors.length}):`);
    topDonors.forEach(d => this.logger.log(`  → ${d.name} | ${d.blood_group} | ${d.distance_km?.toFixed(2)}km | score: ${d.computedScore}`));

    // Record notification & mark as notified
    for (const donor of topDonors) {
      job.notifiedDonorIds.add(donor.id);
      await this.db.query(
        `INSERT INTO donor_responses (request_id, donor_id, action, notified_radius_km)
         VALUES ($1, $2, 'PENDING', $3)
         ON CONFLICT (request_id, donor_id) DO NOTHING`,
        [job.requestId, donor.id, job.currentRadius],
      );
    }

    // Update request status and current radius
    await this.db.query(
      `UPDATE requests SET status='MATCHING', current_radius_km=$1 WHERE id=$2`,
      [job.currentRadius, job.requestId],
    );

    // Broadcast: send notification to each donor via WebSocket
    for (const donor of topDonors) {
      this.notificationsService.notifyDonor(donor.id, {
        type: 'EMERGENCY_REQUEST',
        requestId: job.requestId,
        bloodGroup: job.bloodGroup,
        urgency: job.urgency,
        hospitalName: job.hospitalName,
        distanceKm: parseFloat(donor.distance_km?.toFixed(1)),
        score: donor.computedScore,
        lat: job.lat,
        lng: job.lng,
        email: donor.email,
        phone: donor.phone,
      });
    }

    // Broadcast dashboard update
    this.notificationsService.broadcastRequestUpdate(job.requestId, 'MATCHING', {
      radius: job.currentRadius,
      donorsNotified: job.notifiedDonorIds.size,
      topDonors: topDonors.map(d => ({ id: d.id, name: d.name, distanceKm: d.distance_km, score: d.computedScore })),
    });

    // Schedule radius expansion
    const expandMs = parseInt(this.config.get('EXPANSION_INTERVAL_MS', '120000'));
    job.timer = setTimeout(() => this.expandRadius(job), expandMs);
  }

  private async expandRadius(job: MatchingJob) {
    const expansionKm = parseFloat(this.config.get('RADIUS_EXPANSION_KM', '2'));
    job.currentRadius += expansionKm;
    this.logger.log(`🔄 Expanding radius to ${job.currentRadius}km for request ${job.requestId}`);
    await this.runMatchingRound(job);
  }

  async acceptRequest(requestId: string, donorId: string) {
    const job = this.activeJobs.get(requestId);
    if (!job) return;

    // Clear expansion timer
    if (job.timer) clearTimeout(job.timer);
    this.activeJobs.delete(requestId);

    this.logger.log(`✅ Donor ${donorId} accepted request ${requestId}`);

    // Update request status
    await this.db.query(
      `UPDATE requests SET status='MATCHED', matched_donor_id=$1 WHERE id=$2`,
      [donorId, requestId],
    );

    // Broadcast to dashboard
    this.notificationsService.broadcastRequestUpdate(requestId, 'MATCHED', { donorId });

    // Notify other pending donors that request is filled
    this.notificationsService.broadcastToDonors(job.notifiedDonorIds, requestId, 'REQUEST_FILLED');
  }

  cancelMatching(requestId: string) {
    const job = this.activeJobs.get(requestId);
    if (job?.timer) clearTimeout(job.timer);
    this.activeJobs.delete(requestId);
  }

  getActiveJobs() {
    return Array.from(this.activeJobs.entries()).map(([id, job]) => ({
      requestId: id,
      currentRadius: job.currentRadius,
      notifiedCount: job.notifiedDonorIds.size,
    }));
  }
}
