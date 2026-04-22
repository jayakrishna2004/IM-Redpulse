import { Pool } from 'pg';
import { NotificationsService } from '../notifications/notifications.service';
export declare class HospitalsService {
    private db;
    private notificationsService;
    constructor(db: Pool, notificationsService: NotificationsService);
    findAll(): Promise<any[]>;
    findById(id: string): Promise<any>;
    findByUserId(userId: string): Promise<any>;
    getDashboardData(hospitalId: string): Promise<{
        hospital: any;
        activeRequests: any[];
        recentResponses: any[];
    }>;
    updateBloodStock(hospitalId: string, stock: Record<string, number>): Promise<{
        success: boolean;
        stock: {
            [x: string]: number;
        };
        autoFulfilled: boolean;
    } | {
        success: boolean;
        stock: Record<string, number>;
        autoFulfilled?: undefined;
    }>;
    getStats(): Promise<any>;
    updateVerifiedRecipients(hospitalId: string, testEmail: string, testPhone: string): Promise<{
        success: boolean;
    }>;
}
