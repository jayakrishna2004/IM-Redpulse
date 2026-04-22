import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';

@Injectable()
export class DonorsService {
  constructor(@Inject(DATABASE_POOL) private db: Pool) {}

  async findAll() {
    const res = await this.db.query(`
      SELECT d.*, u.name, u.email, u.phone
      FROM donors d JOIN users u ON d.user_id = u.id
      ORDER BY d.ai_score DESC
    `);
    return res.rows;
  }

  async findByUserId(userId: string) {
    const res = await this.db.query(
      `SELECT d.*, u.name, u.email, u.phone
       FROM donors d JOIN users u ON d.user_id = u.id
       WHERE d.user_id = $1`,
      [userId],
    );
    return res.rows[0];
  }

  async findById(id: string) {
    const res = await this.db.query(
      `SELECT d.*, u.name, u.email, u.phone
       FROM donors d JOIN users u ON d.user_id = u.id
       WHERE d.id = $1`,
      [id],
    );
    return res.rows[0];
  }

  async updateLocation(userId: string, lat: number, lng: number) {
    await this.db.query(
      `UPDATE donors SET lat=$1, lng=$2, last_seen_at=NOW() WHERE user_id=$3`,
      [lat, lng, userId],
    );
  }

  async updateAvailability(userId: string, status: 'ACTIVE' | 'INACTIVE') {
    const res = await this.db.query(
      `UPDATE donors SET status=$1, last_seen_at=NOW() WHERE user_id=$2 RETURNING *`,
      [status, userId],
    );
    return res.rows[0];
  }

  async getDonationHistory(userId: string) {
    const res = await this.db.query(
      `SELECT dr.*, r.blood_group, r.urgency, r.created_at as request_date,
              h.name as hospital_name
       FROM donor_responses dr
       JOIN requests r ON dr.request_id = r.id
       JOIN donors d ON dr.donor_id = d.id
       JOIN hospitals h ON r.hospital_id = h.id
       WHERE d.user_id = $1
       ORDER BY dr.notified_at DESC LIMIT 20`,
      [userId],
    );
    return res.rows;
  }

  async updateScore(donorId: string, score: number) {
    await this.db.query(
      `UPDATE donors SET ai_score=$1 WHERE id=$2`,
      [score, donorId],
    );
  }

  async recordResponse(donorId: string, requestId: string, action: 'ACCEPTED' | 'REJECTED' | 'TIMEOUT', responseTimeSec: number) {
    await this.db.query(
      `UPDATE donor_responses SET action=$1, responded_at=NOW(), response_time_seconds=$2
       WHERE donor_id=$3 AND request_id=$4`,
      [action, responseTimeSec, donorId, requestId],
    );

    if (action === 'ACCEPTED') {
      await this.db.query(
        `UPDATE donors SET total_accepted = total_accepted + 1,
         avg_response_time_seconds = (avg_response_time_seconds * total_accepted + $1) / (total_accepted + 1)
         WHERE id = $2`,
        [responseTimeSec, donorId],
      );
    } else if (action === 'REJECTED') {
      await this.db.query(`UPDATE donors SET total_rejected = total_rejected + 1 WHERE id=$1`, [donorId]);
    } else {
      await this.db.query(`UPDATE donors SET total_ignored = total_ignored + 1 WHERE id=$1`, [donorId]);
    }
  }

  async getEligibleDonorsInRadius(lat: number, lng: number, radiusKm: number, bloodGroups: string[]) {
    const radiusM = radiusKm * 1000;
    const res = await this.db.query(
      `SELECT d.*, u.name, u.phone,
              ST_Distance(d.location, ST_MakePoint($2, $1)::geography) / 1000 AS distance_km
       FROM donors d
       JOIN users u ON d.user_id = u.id
       WHERE d.location IS NOT NULL
         AND ST_DWithin(d.location, ST_MakePoint($2, $1)::geography, $3)
         AND d.blood_group = ANY($4::text[])
         AND d.status = 'ACTIVE'
         AND (d.last_donation_date IS NULL OR d.last_donation_date < NOW() - INTERVAL '90 days')
       ORDER BY distance_km ASC`,
      [lat, lng, radiusM, bloodGroups],
    );
    return res.rows;
  }
}
