import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TrackingService {
  constructor(
    @Inject(DATABASE_POOL) private db: Pool,
    private notificationsService: NotificationsService,
  ) {}

  async updateDonorLocation(requestId: string, donorUserId: string, lat: number, lng: number) {
    // Get tracking session
    const tsRes = await this.db.query(
      `SELECT ts.*, d.id as donor_id
       FROM tracking_sessions ts
       JOIN donors d ON ts.donor_id = d.id
       WHERE ts.request_id = $1 AND d.user_id = $2 AND ts.completed_at IS NULL`,
      [requestId, donorUserId],
    );
    if (!tsRes.rows.length) return null;

    const session = tsRes.rows[0];

    // Calculate distance remaining and ETA (simplified: 30 km/h average speed)
    const distKm = this.haversineDistance(lat, lng, session.hospital_lat, session.hospital_lng);
    const etaSec = Math.round((distKm / 30) * 3600); // 30 km/h

    await this.db.query(
      `UPDATE tracking_sessions SET donor_lat=$1, donor_lng=$2, eta_seconds=$3, distance_remaining_km=$4
       WHERE id=$5`,
      [lat, lng, etaSec, distKm, session.id],
    );

    // Update donor location too
    await this.db.query(
      `UPDATE donors SET lat=$1, lng=$2, last_seen_at=NOW() WHERE id=$3`,
      [lat, lng, session.donor_id],
    );

    // Broadcast to dashboard & request room
    this.notificationsService.broadcastTracking(requestId, {
      donorId: session.donor_id,
      lat, lng,
      etaSeconds: etaSec,
      distanceRemainingKm: Math.round(distKm * 100) / 100,
    });

    return { etaSeconds: etaSec, distanceRemainingKm: distKm };
  }

  async getTrackingSession(requestId: string) {
    const res = await this.db.query(
      `SELECT ts.*, u.name as donor_name, d.blood_group
       FROM tracking_sessions ts
       JOIN donors d ON ts.donor_id = d.id
       JOIN users u ON d.user_id = u.id
       WHERE ts.request_id = $1 AND ts.completed_at IS NULL`,
      [requestId],
    );
    return res.rows[0] || null;
  }

  async completeTracking(requestId: string) {
    await this.db.query(
      `UPDATE tracking_sessions SET completed_at=NOW() WHERE request_id=$1`,
      [requestId],
    );
    await this.db.query(
      `UPDATE requests SET status='FULFILLED', fulfilled_at=NOW() WHERE id=$1`,
      [requestId],
    );
    this.notificationsService.broadcastRequestUpdate(requestId, 'FULFILLED', null);
  }

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRad(deg: number) { return (deg * Math.PI) / 180; }
}
