import { TrackingService } from './tracking.service';
export declare class LocationUpdateDto {
    lat: number;
    lng: number;
}
export declare class TrackingController {
    private trackingService;
    constructor(trackingService: TrackingService);
    updateLocation(requestId: string, dto: LocationUpdateDto, req: any): Promise<{
        etaSeconds: number;
        distanceRemainingKm: number;
    } | null>;
    getSession(requestId: string): Promise<any>;
    complete(requestId: string): Promise<void>;
}
