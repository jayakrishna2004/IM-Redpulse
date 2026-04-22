import { Pool } from 'pg';
import { NotificationsService } from '../notifications/notifications.service';
export declare class TrackingService {
    private db;
    private notificationsService;
    constructor(db: Pool, notificationsService: NotificationsService);
    updateDonorLocation(requestId: string, donorUserId: string, lat: number, lng: number): Promise<{
        etaSeconds: number;
        distanceRemainingKm: number;
    } | null>;
    getTrackingSession(requestId: string): Promise<any>;
    completeTracking(requestId: string): Promise<void>;
    private haversineDistance;
    private toRad;
}
