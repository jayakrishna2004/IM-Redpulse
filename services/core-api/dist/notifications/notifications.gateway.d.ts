import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private readonly logger;
    private connectedClients;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinDashboard(client: Socket, data: {
        hospitalId: string;
    }): void;
    handleJoinDonor(client: Socket, data: {
        donorId: string;
    }): void;
    handleJoinRequest(client: Socket, data: {
        requestId: string;
    }): void;
    handlePing(client: Socket): void;
    getConnectedCount(): number;
}
