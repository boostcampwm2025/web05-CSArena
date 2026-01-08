import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MatchService } from './match.service';
import { SessionManager } from './session-manager';
import { UserInfo } from './interfaces/user.interface';
import { SubmitAnswerRequest, SubmitAnswerResponse } from './interfaces/match.interfaces';

@WebSocketGateway({ cors: true })
export class MatchGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly matchService: MatchService,
    private readonly sessionManager: SessionManager,
  ) {}

  handleConnection(client: Socket): void {
    const query = client.handshake.query;

    const userInfo: UserInfo = {
      nickname: (query.nickname as string) || `Player${Math.floor(Math.random() * 10000)}`,
      tier: (query.tier as string) || 'bronze',
      exp_point: parseInt((query.exp_point as string) || '0', 10),
    };

    const userId = (query.userId as string) || client.id;

    this.sessionManager.registerUser(client.id, userId);

    client.emit('user:info', userInfo);
  }

  @SubscribeMessage('match:enqueue')
  handleMatchEnqueue(@ConnectedSocket() client: Socket): {
    ok: boolean;
    sessionId?: string;
    error?: string;
  } {
    try {
      const query = client.handshake.query;

      const userInfo: UserInfo = {
        nickname: (query.nickname as string) || `Player${client.id.slice(0, 8)}`,
        tier: (query.tier as string) || 'bronze',
        exp_point: parseInt((query.exp_point as string) || '0', 10),
      };

      const userId = this.sessionManager.getUserId(client.id) || client.id;

      const existingSession = this.sessionManager.getQueueSessionBySocketId(client.id);

      if (existingSession) {
        return { ok: true, sessionId: existingSession.sessionId };
      }

      const sessionId = this.sessionManager.createQueueSession(client.id, userId, userInfo);

      const match = this.matchService.addToQueue(userId, userInfo);

      if (match) {
        const player1Session = this.sessionManager.getQueueSessionByUserId(match.player1);
        const player2Session = this.sessionManager.getQueueSessionByUserId(match.player2);

        if (player1Session && player2Session) {
          this.sessionManager.removeQueueSession(player1Session.sessionId);
          this.sessionManager.removeQueueSession(player2Session.sessionId);

          this.sessionManager.addToRoom(match.roomId, match.player1);
          this.sessionManager.addToRoom(match.roomId, match.player2);

          setImmediate(() => {
            Promise.all([
              this.server.sockets.sockets.get(player1Session.socketId)?.join(match.roomId),
              this.server.sockets.sockets.get(player2Session.socketId)?.join(match.roomId),
            ])
              .then(() => {
                this.server.to(player1Session.socketId).emit('match:found', {
                  opponent: player2Session.userInfo,
                });

                this.server.to(player2Session.socketId).emit('match:found', {
                  opponent: player1Session.userInfo,
                });

                this.matchService.startGame(
                  match.roomId,
                  match.player1,
                  player1Session.socketId,
                  player1Session.userInfo,
                  match.player2,
                  player2Session.socketId,
                  player2Session.userInfo,
                  this.server,
                );
              })
              .catch((err) => {
                console.error('Failed to setup match:', err);
              });
          });
        }
      }

      return { ok: true, sessionId };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  @SubscribeMessage('match:dequeue')
  handleMatchDequeue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ): { ok: boolean; error?: string } {
    try {
      const session = this.sessionManager.getQueueSession(data.sessionId);

      if (!session) {
        return { ok: false, error: 'Session not found' };
      }

      if (session.socketId !== client.id) {
        return { ok: false, error: 'Invalid session' };
      }

      this.matchService.removeFromQueue(session.userId);
      this.sessionManager.removeQueueSession(data.sessionId);

      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  @SubscribeMessage('submit:answer')
  async handleSubmitAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubmitAnswerRequest,
  ): Promise<SubmitAnswerResponse> {
    try {
      const userId = this.sessionManager.getUserId(client.id);

      if (!userId) {
        return { ok: false, error: 'User not found' };
      }

      const roomId = this.sessionManager.getRoomBySocketId(client.id);

      if (!roomId) {
        return { ok: false, error: 'Room not found' };
      }

      await this.matchService.submitAnswer(roomId, userId, data.answer);

      const gameSession = this.sessionManager.getGameSession(roomId);

      if (gameSession) {
        const opponentSocketId =
          userId === gameSession.player1Id
            ? gameSession.player2SocketId
            : gameSession.player1SocketId;

        this.server.to(opponentSocketId).emit('opponent:submitted', {});
      }

      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  handleDisconnect(client: Socket): void {
    const disconnectInfo = this.sessionManager.disconnect(client.id);

    if (disconnectInfo.userId) {
      this.matchService.removeFromQueue(disconnectInfo.userId);
    }

    if (disconnectInfo.roomId && disconnectInfo.userId) {
      this.matchService.handlePlayerDisconnect(disconnectInfo.roomId, disconnectInfo.userId);
    }
  }
}
