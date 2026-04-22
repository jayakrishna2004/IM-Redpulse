import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getInfo(): {
        status: string;
        message: string;
        docs: string;
        health: string;
    };
    getHealth(): {
        status: string;
        timestamp: string;
    };
}
