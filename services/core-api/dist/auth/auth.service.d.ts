import { JwtService } from '@nestjs/jwt';
import { Pool } from 'pg';
export declare class AuthService {
    private db;
    private jwt;
    constructor(db: Pool, jwt: JwtService);
    register(dto: {
        email: string;
        password: string;
        name: string;
        phone?: string;
        role: string;
        bloodGroup?: string;
    }): Promise<{
        access_token: string;
        user: any;
    }>;
    login(email: string, password: string): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            name: any;
            role: any;
        };
    }>;
    loginByHospitalId(hospitalId: string, password?: string): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            name: any;
            role: any;
        };
    }>;
    validateUser(userId: string): Promise<any>;
}
