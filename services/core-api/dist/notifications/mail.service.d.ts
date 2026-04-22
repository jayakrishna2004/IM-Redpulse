import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private configService;
    private readonly logger;
    private transporter;
    private sesClient;
    private hubUrl;
    constructor(configService: ConfigService);
    private normalizePhone;
    private normalizeEmail;
    sendEmergencyEmail(to: string, data: {
        hospitalName: string;
        bloodGroup: string;
        urgency: string;
        distanceKm: number;
        requestId: string;
        overrideEmail?: string;
    }): Promise<void>;
    sendEmergencySms(phone: string, message: string, overridePhone?: string): Promise<void>;
}
