import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsGateway } from './notifications.gateway';
import { MailService } from './mail.service';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private gateway: NotificationsGateway,
    private mailService: MailService, 
    private configService: ConfigService,
    @Inject(DATABASE_POOL) private db: Pool,
  ) {}

  async notifyDonor(donorId: string, payload: {
    type: string;
    requestId: string;
    bloodGroup: string;
    urgency: string;
    hospitalName: string;
    distanceKm: number;
    score: number;
    lat: number;
    lng: number;
    email?: string;
    phone?: string;
  }) {
    this.logger.log(`📲 Notifying donor ${donorId}: ${payload.urgency} ${payload.bloodGroup} request`);
    
    // Check for Hospital testing overrides
    let overrideEmail: string | undefined;
    let overridePhone: string | undefined;

    try {
      const res = await this.db.query(
        `SELECT h.test_email, h.test_phone FROM hospitals h 
         JOIN requests r ON r.hospital_id = h.id 
         WHERE r.id = $1`,
        [payload.requestId]
      );
      if (res.rows[0]) {
        overrideEmail = res.rows[0].test_email;
        overridePhone = res.rows[0].test_phone;
      }
    } catch (e) {
      this.logger.warn(`Could not fetch hospital overrides: ${e.message}`);
    }

    const donorEmail = payload.email || `donor_${donorId.split('-')[0]}@redpulse.local`;
    const donorPhone = payload.phone;

    // 1. Dispatch Email Alert
    this.mailService.sendEmergencyEmail(donorEmail, {
        hospitalName: payload.hospitalName,
        bloodGroup: payload.bloodGroup,
        urgency: payload.urgency,
        distanceKm: payload.distanceKm,
        requestId: payload.requestId,
        overrideEmail,
    }).catch(e => this.logger.error(`[MAIL] Background delivery failed: ${e.message}`));

    // 2. Dispatch SMS Alert (if phone available)
    if (donorPhone) {
      const smsMsg = `🚨 REDPULSE: ${payload.bloodGroup} needed at ${payload.hospitalName} (${payload.distanceKm}km). Check app now!`;
      this.mailService.sendEmergencySms(donorPhone, smsMsg, overridePhone).catch(e => this.logger.error(`[SMS] Background delivery failed: ${e.message}`));
    }

    // 3. Real-time WebSocket Alert
    this.gateway.server?.to(`donor:${donorId}`).emit('emergency_alert', {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  async notifyRequester(payload: {
    hospitalName: string;
    bloodGroup: string;
    urgency: string;
    isInStock: boolean;
    email?: string;
    phone?: string;
  }) {
    this.logger.log(`📢 Notifying requester: ${payload.hospitalName} for ${payload.bloodGroup} | InStock: ${payload.isInStock}`);
    
    // 0. Notify Dashboard (WebSocket)
    this.gateway.server?.to('dashboard').emit('request_alert', {
      ...payload,
      timestamp: new Date().toISOString(),
    });

    const hospitalEmail = payload.email || this.configService.get('MAIL_FROM');
    const hospitalPhone = payload.phone;

    // 1. Dispatch Email
    if (hospitalEmail) {
      this.mailService.sendEmergencyEmail(hospitalEmail, {
        hospitalName: payload.hospitalName,
        bloodGroup: payload.bloodGroup,
        urgency: payload.urgency,
        distanceKm: 0,
        requestId: 'REQUESTER_CONFIRMATION'
      }).catch(e => this.logger.error(`[MAIL] Requester delivery failed: ${e.message}`));
    }

    // 2. Dispatch SMS
    if (hospitalPhone) {
      const smsMsg = `🚨 REDPULSE: Your emergency request for ${payload.bloodGroup} at ${payload.hospitalName} has been triggered. Searching for nearby donors...`;
      this.mailService.sendEmergencySms(hospitalPhone, smsMsg).catch(e => this.logger.error(`[SMS] Requester delivery failed: ${e.message}`));
    }
  }

  broadcastRequestUpdate(requestId: string, status: string, data: any) {
    this.gateway.server?.to('dashboard').emit('request_update', {
      requestId,
      status,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastToDonors(donorIds: Set<string>, requestId: string, eventType: string) {
    donorIds.forEach(donorId => {
      this.gateway.server?.to(`donor:${donorId}`).emit(eventType, { requestId });
    });
  }

  broadcastTracking(requestId: string, trackingData: {
    donorId: string;
    lat: number;
    lng: number;
    etaSeconds: number;
    distanceRemainingKm: number;
  }) {
    this.gateway.server?.to(`request:${requestId}`).emit('tracking_update', {
      ...trackingData,
      timestamp: new Date().toISOString(),
    });
    this.gateway.server?.to('dashboard').emit('tracking_update', {
      ...trackingData,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastBloodStock(hospitalId: string, stock: Record<string, number>) {
    this.gateway.server?.to('dashboard').emit('blood_stock_update', { hospitalId, stock });
  }
}
