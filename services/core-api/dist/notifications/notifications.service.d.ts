import { ConfigService } from '@nestjs/config';
import { NotificationsGateway } from './notifications.gateway';
import { MailService } from './mail.service';
import { Pool } from 'pg';
export declare class NotificationsService {
    private gateway;
    private mailService;
    private configService;
    private db;
    private readonly logger;
    constructor(gateway: NotificationsGateway, mailService: MailService, configService: ConfigService, db: Pool);
    notifyDonor(donorId: string, payload: {
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
    }): Promise<void>;
    notifyRequester(payload: {
        hospitalName: string;
        bloodGroup: string;
        urgency: string;
        isInStock: boolean;
        email?: string;
        phone?: string;
    }): Promise<void>;
    broadcastRequestUpdate(requestId: string, status: string, data: any): void;
    broadcastToDonors(donorIds: Set<string>, requestId: string, eventType: string): void;
    broadcastTracking(requestId: string, trackingData: {
        donorId: string;
        lat: number;
        lng: number;
        etaSeconds: number;
        distanceRemainingKm: number;
    }): void;
    broadcastBloodStock(hospitalId: string, stock: Record<string, number>): void;
}
