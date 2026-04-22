export declare class OracleController {
    getOracle(): {
        status: string;
        message: string;
        tunnels?: undefined;
        timestamp?: undefined;
    } | {
        status: string;
        tunnels: {
            cloudflare: any;
            localtunnel: any;
        };
        timestamp: string;
        message?: undefined;
    };
}
