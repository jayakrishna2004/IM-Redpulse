import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';
import { MatchingService } from '../matching/matching.service';
import { DonorsService } from '../donors/donors.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RequestsService {
  constructor(
    @Inject(DATABASE_POOL) private db: Pool,
    private matchingService: MatchingService,
    private donorsService: DonorsService,
    private notificationsService: NotificationsService,
  ) {}

  async createRequest(dto: {
    hospitalId: string;
    bloodGroup: string;
    urgency: string;
    lat: number;
    lng: number;
    unitsNeeded?: number;
    notes?: string;
  }) {
    const hospitalQuery = await this.db.query('SELECT * FROM hospitals WHERE id=$1', [dto.hospitalId]);
    if (!hospitalQuery.rows.length) throw new NotFoundException('Hospital not found');
    const hospital = hospitalQuery.rows[0];

    const requestedUnits = dto.unitsNeeded ?? 1;
    let bloodStock = hospital.blood_stock;
    if (typeof bloodStock === 'string') {
      try { bloodStock = JSON.parse(bloodStock); } catch (e) { bloodStock = {}; }
    }
    bloodStock = bloodStock || {};

    const hasInternalStock = (bloodStock[dto.bloodGroup] || 0) >= requestedUnits;
    if (hasInternalStock) {
      const finalNotes = `(Fulfilled internally from hospital stock)\n${dto.notes || ''}`;
      const res = await this.db.query(
        `INSERT INTO requests (hospital_id, blood_group, urgency, lat, lng, units_needed, notes, status, fulfilled_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [
          dto.hospitalId, dto.bloodGroup, dto.urgency, dto.lat, dto.lng, requestedUnits, finalNotes, 'FULFILLED', new Date()
        ],
      );
      const request = res.rows[0];
      
      bloodStock[dto.bloodGroup] -= requestedUnits;
      await this.db.query('UPDATE hospitals SET blood_stock=$1 WHERE id=$2', [JSON.stringify(bloodStock), dto.hospitalId]);
      this.notificationsService.broadcastBloodStock(dto.hospitalId, bloodStock);
      this.notificationsService.broadcastRequestUpdate(request.id, 'FULFILLED', null);
      this.notificationsService.notifyRequester({
        hospitalName: hospital.name,
        bloodGroup: dto.bloodGroup,
        urgency: dto.urgency,
        isInStock: true,
        phone: hospital.phone || null,
      });
      return request;
    }

    // Standard Matching Flow
    const res = await this.db.query(
      `INSERT INTO requests (hospital_id, blood_group, urgency, lat, lng, units_needed, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [dto.hospitalId, dto.bloodGroup, dto.urgency, dto.lat, dto.lng, requestedUnits, dto.notes, 'MATCHING'],
    );
    const request = res.rows[0];

    this.matchingService.startMatching(
      request.id, dto.lat, dto.lng, dto.bloodGroup,
      dto.urgency, hospital.name,
    );

    // Notify Requester (Hospital/Admin) - New SMS logic
    this.notificationsService.notifyRequester({
      hospitalName: hospital.name,
      bloodGroup: dto.bloodGroup,
      urgency: dto.urgency,
      isInStock: false,
      phone: hospital.phone || null, // Hospital contact
    });

    return request;
  }

  async fulfillInternally(requestId: string, hospitalId: string, bloodGroup: string, units: number) {
    const hospitalQuery = await this.db.query('SELECT blood_stock FROM hospitals WHERE id=$1', [hospitalId]);
    let bloodStock = hospitalQuery.rows[0]?.blood_stock || {};
    if (typeof bloodStock === 'string') bloodStock = JSON.parse(bloodStock);

    if ((bloodStock[bloodGroup] || 0) < units) return false;

    // Deduct stock
    bloodStock[bloodGroup] -= units;
    await this.db.query('UPDATE hospitals SET blood_stock=$1 WHERE id=$2', [JSON.stringify(bloodStock), hospitalId]);
    
    // Update request
    await this.db.query(
      `UPDATE requests SET status='FULFILLED', fulfilled_at=NOW(), 
              notes=COALESCE(notes, '') || '\n(Reactive fulfillment from manual stock update)'
       WHERE id=$1`,
      [requestId]
    );

    // Notify
    this.notificationsService.broadcastBloodStock(hospitalId, bloodStock);
    this.notificationsService.broadcastRequestUpdate(requestId, 'FULFILLED', null);
    
    return true;
  }

  async getAll(filters?: { status?: string; hospitalId?: string }) {
    let query = `
      SELECT r.*, h.name as hospital_name, h.lat as hospital_lat, h.lng as hospital_lng,
             u.name as donor_name
      FROM requests r
      JOIN hospitals h ON r.hospital_id = h.id
      LEFT JOIN donors d ON r.matched_donor_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (filters?.status) {
      conditions.push(`r.status = $${params.length + 1}`);
      params.push(filters.status);
    }
    if (filters?.hospitalId) {
      conditions.push(`r.hospital_id = $${params.length + 1}`);
      params.push(filters.hospitalId);
    }

    if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;
    query += ' ORDER BY r.created_at DESC';

    const res = await this.db.query(query, params);
    return res.rows;
  }

  async getById(id: string) {
    const res = await this.db.query(
      `SELECT r.*, h.name as hospital_name,
              d.blood_group as donor_blood_group, u.name as donor_name, u.phone as donor_phone
       FROM requests r
       JOIN hospitals h ON r.hospital_id = h.id
       LEFT JOIN donors d ON r.matched_donor_id = d.id
       LEFT JOIN users u ON d.user_id = u.id
       WHERE r.id = $1`,
      [id],
    );
    if (!res.rows.length) throw new NotFoundException('Request not found');
    return res.rows[0];
  }

  async respondToRequest(requestId: string, donorUserId: string, action: 'ACCEPTED' | 'REJECTED') {
    // Get donor
    const donorRes = await this.db.query('SELECT * FROM donors WHERE user_id=$1', [donorUserId]);
    if (!donorRes.rows.length) throw new BadRequestException('Donor profile not found');
    const donor = donorRes.rows[0];

    // Check if notified
    const notifRes = await this.db.query(
      `SELECT *, EXTRACT(EPOCH FROM (NOW() - notified_at)) as elapsed_seconds
       FROM donor_responses WHERE request_id=$1 AND donor_id=$2`,
      [requestId, donor.id],
    );
    if (!notifRes.rows.length) throw new BadRequestException('You were not notified for this request');
    if (notifRes.rows[0].action !== 'PENDING') throw new BadRequestException('Already responded');

    const elapsed = parseFloat(notifRes.rows[0].elapsed_seconds);

    await this.donorsService.recordResponse(donor.id, requestId, action, elapsed);

    if (action === 'ACCEPTED') {
      const request = await this.getById(requestId);
      if (request.status !== 'MATCHING' && request.status !== 'PENDING') {
        throw new BadRequestException('Request is no longer available');
      }
      await this.matchingService.acceptRequest(requestId, donor.id);

      // Start tracking session
      const requestData = await this.db.query('SELECT * FROM requests WHERE id=$1', [requestId]);
      const req = requestData.rows[0];
      await this.db.query(
        `INSERT INTO tracking_sessions (request_id, donor_id, donor_lat, donor_lng, hospital_lat, hospital_lng)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [requestId, donor.id, donor.lat, donor.lng, req.lat, req.lng],
      );
    }

    return { success: true, action, requestId, donorId: donor.id };
  }

  async cancelRequest(id: string) {
    this.matchingService.cancelMatching(id);
    await this.db.query(`UPDATE requests SET status='CANCELLED' WHERE id=$1`, [id]);
    this.notificationsService.broadcastRequestUpdate(id, 'CANCELLED', null);
    return { success: true };
  }

  async getDonorResponsesForRequest(requestId: string) {
    const res = await this.db.query(
      `SELECT dr.*, u.name, d.blood_group, d.ai_score,
              ST_Distance(d.location, r.location) / 1000 as distance_km
       FROM donor_responses dr
       JOIN donors d ON dr.donor_id = d.id
       JOIN users u ON d.user_id = u.id
       JOIN requests r ON dr.request_id = r.id
       WHERE dr.request_id = $1
       ORDER BY d.ai_score DESC`,
      [requestId],
    );
    return res.rows;
  }
}
