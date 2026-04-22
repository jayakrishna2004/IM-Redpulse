import { HospitalsService } from './hospitals.service';
export declare class HospitalsController {
    private hospitalsService;
    constructor(hospitalsService: HospitalsService);
    findAll(): Promise<any[]>;
    getStats(): Promise<any>;
    getMe(req: any): Promise<any>;
    getDashboard(req: any): Promise<{
        hospital: any;
        activeRequests: any[];
        recentResponses: any[];
    }>;
    findOne(id: string): Promise<any>;
    getDashboardById(id: string): Promise<{
        hospital: any;
        activeRequests: any[];
        recentResponses: any[];
    }>;
    updateStock(req: any, dto: Record<string, number>): Promise<{
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
    updateStockById(id: string, dto: Record<string, number>): Promise<{
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
    updateVerifiedRecipients(req: any, dto: {
        testEmail: string;
        testPhone: string;
    }): Promise<{
        success: boolean;
    }>;
}
