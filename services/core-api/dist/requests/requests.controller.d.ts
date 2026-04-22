import { RequestsService } from './requests.service';
export declare class CreateRequestDto {
    hospitalId: string;
    bloodGroup: string;
    urgency: string;
    lat: number;
    lng: number;
    unitsNeeded?: number;
    notes?: string;
}
export declare class RespondDto {
    action: 'ACCEPTED' | 'REJECTED';
}
export declare class RequestsController {
    private requestsService;
    private readonly logger;
    constructor(requestsService: RequestsService);
    create(dto: CreateRequestDto): Promise<any>;
    findAll(status?: string, hospitalId?: string): Promise<any[]>;
    findOne(id: string): Promise<any>;
    getResponses(id: string): Promise<any[]>;
    respond(id: string, dto: RespondDto, req: any): Promise<{
        success: boolean;
        action: "ACCEPTED" | "REJECTED";
        requestId: string;
        donorId: any;
    }>;
    cancel(id: string): Promise<{
        success: boolean;
    }>;
}
