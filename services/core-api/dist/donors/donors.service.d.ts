import { Pool } from 'pg';
export declare class DonorsService {
    private db;
    constructor(db: Pool);
    findAll(): Promise<any[]>;
    findByUserId(userId: string): Promise<any>;
    findById(id: string): Promise<any>;
    updateLocation(userId: string, lat: number, lng: number): Promise<void>;
    updateAvailability(userId: string, status: 'ACTIVE' | 'INACTIVE'): Promise<any>;
    getDonationHistory(userId: string): Promise<any[]>;
    updateScore(donorId: string, score: number): Promise<void>;
    recordResponse(donorId: string, requestId: string, action: 'ACCEPTED' | 'REJECTED' | 'TIMEOUT', responseTimeSec: number): Promise<void>;
    getEligibleDonorsInRadius(lat: number, lng: number, radiusKm: number, bloodGroups: string[]): Promise<any[]>;
}
