import {
  ConnectedSocket,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MatchService } from './match.service';

@WebSocketGateway({ cors: true })
export class MatchGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly matchService: MatchService) {}

  @SubscribeMessage('match.request')
  handleMatchRequest(@ConnectedSocket() client: Socket): void {
    const match = this.matchService.addToQueue(client.id);

    if (match) {
      this.server
        .to(match.player1)
        .emit('match.found', { roomId: match.roomId, opponentId: match.player2 });
      this.server
        .to(match.player2)
        .emit('match.found', { roomId: match.roomId, opponentId: match.player1 });
    } else {
      const queueSize = this.matchService.getQueueSize();
      client.emit('match.waiting', { queueSize });
    }
  }

  handleDisconnect(client: Socket): void {
    this.matchService.removeFromQueue(client.id);
  }
}
