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
import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { calculateTier } from '../common/utils/tier.util';

interface AuthenticatedSocket extends Socket {
  data: {
    user: AuthenticatedUser;
    userInfo: UserInfo;
  };
}

@WebSocketGateway({ namespace: '/ws', cors: true })
export class MatchmakingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly matchmakingService: MatchmakingService,
    private readonly sessionManager: MatchmakingSessionManager,
    private readonly gameService: GameService,
    private readonly roundProgression: RoundProgressionService,
    private readonly authService: AuthService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth?.token as string;

    if (!token) {
      client.emit('error', { message: 'Authentication required' });
      client.disconnect();

      return;
    }

    const authUser = this.authService.validateToken(token);

    if (!authUser) {
      client.emit('error', { message: 'Invalid token' });
      client.disconnect();

      return;
    }

    const fullUser = await this.authService.getUserById(authUser.id);
    const userInfo: UserInfo = {
      nickname: authUser.nickname,
      tier: fullUser ? calculateTier(fullUser.statistics?.tierPoint || 0) : 'bronze',
      exp_point: fullUser?.statistics?.expPoint || 0,
    };

    const authSocket = client as AuthenticatedSocket;
    authSocket.data.user = authUser;
    authSocket.data.userInfo = userInfo;

    this.sessionManager.registerUser(client.id, authUser.id);

    client.emit('user:info', userInfo);
  }

  @SubscribeMessage('match:enqueue')
  handleMatchEnqueue(@ConnectedSocket() client: Socket): {
    ok: boolean;
    sessionId?: string;
    error?: string;
  } {
    try {
      const authSocket = client as AuthenticatedSocket;
      const user = authSocket.data.user;
      const userInfo = authSocket.data.userInfo;

      if (!user) {
        return { ok: false, error: 'Not authenticated' };
      }

      const existingSession = this.sessionManager.getQueueSessionBySocketId(client.id);

      if (existingSession) {
        return { ok: true, sessionId: existingSession.sessionId };
      }

      const sessionId = this.sessionManager.createQueueSession(client.id, user.id, userInfo);

      const match = this.matchmakingService.addToQueue(user.id);

      if (match) {
        const player1Session = this.sessionManager.getQueueSessionByUserId(match.player1);
        const player2Session = this.sessionManager.getQueueSessionByUserId(match.player2);

        if (player1Session && player2Session) {
          this.sessionManager.removeQueueSession(player1Session.sessionId);
          this.sessionManager.removeQueueSession(player2Session.sessionId);

          this.sessionManager.addToRoom(match.roomId, match.player1);
          this.sessionManager.addToRoom(match.roomId, match.player2);

          setImmediate(() => {
            this.server
              .in([player1Session.socketId, player2Session.socketId])
              .socketsJoin(match.roomId);

            this.server.to(player1Session.socketId).emit('match:found', {
              opponent: player2Session.userInfo,
            });

            this.server.to(player2Session.socketId).emit('match:found', {
              opponent: player1Session.userInfo,
            });

            this.gameService.startGameFromMatch(
              match.roomId,
              player1Session.userId,
              player1Session.socketId,
              player1Session.userInfo,
              player2Session.userId,
              player2Session.socketId,
              player2Session.userInfo,
            );

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

    if (disconnectInfo.userId) {
      this.matchmakingService.removeFromQueue(disconnectInfo.userId);
    }
  }
}
