import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect,
  MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private connectedClients = new Map<string, string>(); // socketId → role/id

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('join_dashboard')
  handleJoinDashboard(@ConnectedSocket() client: Socket, @MessageBody() data: { hospitalId: string }) {
    client.join('dashboard');
    this.connectedClients.set(client.id, `dashboard:${data.hospitalId}`);
    this.logger.log(`Dashboard joined: ${data.hospitalId}`);
    client.emit('joined', { room: 'dashboard' });
  }

  @SubscribeMessage('join_donor')
  handleJoinDonor(@ConnectedSocket() client: Socket, @MessageBody() data: { donorId: string }) {
    client.join(`donor:${data.donorId}`);
    this.connectedClients.set(client.id, `donor:${data.donorId}`);
    this.logger.log(`Donor joined: ${data.donorId}`);
    client.emit('joined', { room: `donor:${data.donorId}` });
  }

  @SubscribeMessage('join_request')
  handleJoinRequest(@ConnectedSocket() client: Socket, @MessageBody() data: { requestId: string }) {
    client.join(`request:${data.requestId}`);
    client.emit('joined', { room: `request:${data.requestId}` });
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { time: new Date().toISOString() });
  }

  getConnectedCount() {
    return this.server?.sockets?.sockets?.size ?? 0;
  }
}
