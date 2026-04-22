import { Pool } from 'pg';
import { MatchingService } from '../matching/matching.service';
import { DonorsService } from '../donors/donors.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class RequestsService {
    private db;
    private matchingService;
    private donorsService;
    private notificationsService;
    constructor(db: Pool, matchingService: MatchingService, donorsService: DonorsService, notificationsService: NotificationsService);
    createRequest(dto: {
        hospitalId: string;
        bloodGroup: string;
        urgency: string;
        lat: number;
        lng: number;
        unitsNeeded?: number;
        notes?: string;
    }): Promise<any>;
    fulfillInternally(requestId: string, hospitalId: string, bloodGroup: string, units: number): Promise<boolean>;
    getAll(filters?: {
        status?: string;
        hospitalId?: string;
    }): Promise<any[]>;
    getById(id: string): Promise<any>;
    respondToRequest(requestId: string, donorUserId: string, action: 'ACCEPTED' | 'REJECTED'): Promise<{
        success: boolean;
        action: "ACCEPTED" | "REJECTED";
        requestId: string;
        donorId: any;
    }>;
    cancelRequest(id: string): Promise<{
        success: boolean;
    }>;
    getDonorResponsesForRequest(requestId: string): Promise<any[]>;
}
