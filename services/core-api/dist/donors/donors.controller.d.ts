import { DonorsService } from './donors.service';
export declare class UpdateLocationDto {
    lat: number;
    lng: number;
}
export declare class UpdateAvailabilityDto {
    status: 'ACTIVE' | 'INACTIVE';
}
export declare class DonorsController {
    private donorsService;
    constructor(donorsService: DonorsService);
    findAll(): Promise<any[]>;
    getMe(req: any): Promise<any>;
    getHistory(req: any): Promise<any[]>;
    findOne(id: string): Promise<any>;
    updateLocation(req: any, dto: UpdateLocationDto): Promise<void>;
    updateAvailability(req: any, dto: UpdateAvailabilityDto): Promise<any>;
}
