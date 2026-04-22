import { Pool } from 'pg';
import { DonorsService } from '../donors/donors.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ConfigService } from '@nestjs/config';
export declare class MatchingService {
    private db;
    private donorsService;
    private notificationsService;
    private config;
    private readonly logger;
    private activeJobs;
    constructor(db: Pool, donorsService: DonorsService, notificationsService: NotificationsService, config: ConfigService);
    startMatching(requestId: string, lat: number, lng: number, bloodGroup: string, urgency: string, hospitalName: string): Promise<void>;
    private runMatchingRound;
    private expandRadius;
    acceptRequest(requestId: string, donorId: string): Promise<void>;
    cancelMatching(requestId: string): void;
    getActiveJobs(): {
        requestId: string;
        currentRadius: number;
        notifiedCount: number;
    }[];
}
