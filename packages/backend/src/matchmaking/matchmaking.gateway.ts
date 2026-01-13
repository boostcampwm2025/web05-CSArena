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
import { MatchmakingService } from './matchmaking.service';
import { GameService } from '../game/game.service';
import { RoundProgressionService } from '../game/round-progression.service';
import { UserInfo } from '../game/interfaces/user.interface';
import { MatchmakingSessionManager } from './matchmaking-session-manager';

@WebSocketGateway({ namespace: '/ws', cors: true })
export class MatchmakingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly matchmakingService: MatchmakingService,
    private readonly sessionManager: MatchmakingSessionManager,
    private readonly gameService: GameService,
    private readonly roundProgression: RoundProgressionService,
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

      const match = this.matchmakingService.addToQueue(userId);

      if (match) {
        const player1Session = this.sessionManager.getQueueSessionByUserId(match.player1);
        const player2Session = this.sessionManager.getQueueSessionByUserId(match.player2);

        if (player1Session && player2Session) {
          this.sessionManager.removeQueueSession(player1Session.sessionId);
          this.sessionManager.removeQueueSession(player2Session.sessionId);

          this.sessionManager.addToRoom(match.roomId, match.player1);
          this.sessionManager.addToRoom(match.roomId, match.player2);

          setImmediate(() => {
            // Socket.IO의 socketsJoin 메서드 사용
            this.server
              .in([player1Session.socketId, player2Session.socketId])
              .socketsJoin(match.roomId);

            this.server.to(player1Session.socketId).emit('match:found', {
              opponent: player2Session.userInfo,
            });

            this.server.to(player2Session.socketId).emit('match:found', {
              opponent: player1Session.userInfo,
            });

            // 게임 세션 생성
            this.gameService.startGameFromMatch(
              match.roomId,
              match.player1,
              player1Session.socketId,
              player1Session.userInfo,
              match.player2,
              player2Session.socketId,
              player2Session.userInfo,
            );

            // 라운드 시퀀스 시작
            this.roundProgression.startRoundSequence(match.roomId);
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

      this.matchmakingService.removeFromQueue(session.userId);
      this.sessionManager.removeQueueSession(data.sessionId);

      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  handleDisconnect(client: Socket): void {
    const disconnectInfo = this.sessionManager.disconnect(client.id);

    // 큐에서 제거
    if (disconnectInfo.userId) {
      this.matchmakingService.removeFromQueue(disconnectInfo.userId);
    }
  }
}
