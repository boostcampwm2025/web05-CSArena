import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Inject, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { MatchmakingService } from './matchmaking.service';
import { GameSessionManager } from '../game/game-session-manager';
import { RoundProgressionService } from '../game/round-progression.service';
import { UserInfo } from '../user/interfaces';
import { MatchmakingSessionManager } from './matchmaking-session-manager';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { calculateTier } from '../common/utils/tier.util';
import { DEFAULT_ELO_RATING, POLLING_INTERVAL_MS } from './constants/matchmaking.constants';
import { MetricsService } from '../metrics';
import { REDIS_CLIENT } from '../common/redis.module';
import Redis from 'ioredis';

interface AuthenticatedSocket extends Socket {
  data: {
    user: AuthenticatedUser;
    userInfo: UserInfo;
  };
}

@WebSocketGateway({ namespace: '/ws', cors: true })
export class MatchmakingGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(MatchmakingGateway.name);
  private pollingInterval: NodeJS.Timeout | null = null;

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly matchmakingService: MatchmakingService,
    private readonly sessionManager: MatchmakingSessionManager,
    private readonly gameSessionManager: GameSessionManager,
    private readonly roundProgression: RoundProgressionService,
    private readonly authService: AuthService,
    private readonly metricsService: MetricsService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  onModuleInit() {
    // 주기적으로 polling으로 발견된 매칭 처리
    this.pollingInterval = setInterval(() => {
      void this.processPollingMatches();
    }, POLLING_INTERVAL_MS);

    this.logger.log('MatchmakingGateway polling started');
  }

  onModuleDestroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.logger.log('MatchmakingGateway polling stopped');
    }
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth?.token as string;

    if (!token) {
      client.emit('error', { message: '인증이 필요합니다.' });
      client.disconnect();

      return;
    }

    const authUser = this.authService.validateToken(token);

    if (!authUser) {
      client.emit('error', { message: '유효하지 않은 토큰입니다.' });
      client.disconnect();

      return;
    }

    const fullUser = await this.authService.getUserById(authUser.id);
    const tierPoint = fullUser?.statistics?.tierPoint ?? DEFAULT_ELO_RATING;
    const userInfo: UserInfo = {
      nickname: authUser.nickname,
      profileImage: fullUser?.userProfile ?? null,
      tier: fullUser ? calculateTier(tierPoint) : 'bronze',
      tierPoint,
      exp_point: fullUser?.statistics?.expPoint ?? 0,
    };

    const authSocket = client as AuthenticatedSocket;
    authSocket.data.user = authUser;
    authSocket.data.userInfo = userInfo;

    await this.sessionManager.registerUser(client.id, authUser.id);

    this.metricsService.incrementWebsocketConnections();

    client.emit('connect:completed');
  }

  @SubscribeMessage('match:enqueue')
  async handleMatchEnqueue(@ConnectedSocket() client: Socket): Promise<{
    ok: boolean;
    sessionId?: string;
    error?: string;
  }> {
    try {
      const authSocket = client as AuthenticatedSocket;
      const user = authSocket.data.user;
      const userInfo = authSocket.data.userInfo;

      if (!user) {
        return { ok: false, error: '인증되지 않은 사용자입니다.' };
      }

      const existingSession = await this.sessionManager.getQueueSessionBySocketId(client.id);

      if (existingSession) {
        return { ok: true, sessionId: existingSession.sessionId };
      }

      const sessionId = await this.sessionManager.createQueueSession(client.id, user.id, userInfo);

      // ELO 레이팅 조회
      const fullUser = await this.authService.getUserById(user.id);
      const eloRating = fullUser?.statistics?.tierPoint ?? DEFAULT_ELO_RATING;
      const match = await this.matchmakingService.addToQueue(user.id, eloRating);

      if (match) {
        const player1Session = await this.sessionManager.getQueueSessionByUserId(match.player1);
        const player2Session = await this.sessionManager.getQueueSessionByUserId(match.player2);

        if (player1Session && player2Session) {
          await this.handleMatchFound(match, player1Session, player2Session);
        }
      }

      return { ok: true, sessionId };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      };
    }
  }

  @SubscribeMessage('match:dequeue')
  async handleMatchDequeue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const session = await this.sessionManager.getQueueSession(data.sessionId);

      if (!session) {
        return { ok: false, error: '세션을 찾을 수 없습니다.' };
      }

      if (session.socketId !== client.id) {
        return { ok: false, error: '유효하지 않은 세션입니다.' };
      }

      await this.matchmakingService.removeFromQueue(session.userId);
      await this.sessionManager.removeQueueSession(data.sessionId);

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      };
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const disconnectInfo = await this.sessionManager.disconnect(client.id);

    if (disconnectInfo.userId) {
      await this.matchmakingService.removeFromQueue(disconnectInfo.userId);
      this.metricsService.decrementWebsocketConnections();
    }
  }

  /**
   * Polling으로 발견된 매칭들을 처리
   */
  private async processPollingMatches(): Promise<void> {
    const matches = await this.matchmakingService.getPollingMatches();

    if (matches.length === 0) {
      return;
    }

    this.logger.log(`Processing ${matches.length} polling matches`);

    for (const match of matches) {
      const player1Session = await this.sessionManager.getQueueSessionByUserId(match.player1);
      const player2Session = await this.sessionManager.getQueueSessionByUserId(match.player2);

      if (player1Session && player2Session) {
        await this.handleMatchFound(match, player1Session, player2Session);
      } else {
        this.logger.warn(`Sessions not found for match: ${match.player1} vs ${match.player2}`);
      }
    }
  }

  /**
   * 매칭 성공 시 공통 처리 로직
   *
   * Redis SETNX로 매치 소유권을 원자적으로 획득합니다.
   * 여러 인스턴스가 동시에 같은 매치를 처리하려 해도
   * 하나의 인스턴스만 게임 세션을 생성합니다.
   */
  private async handleMatchFound(
    match: { player1: string; player2: string; roomId: string },
    player1Session: { sessionId: string; socketId: string; userId: string; userInfo: UserInfo },
    player2Session: { sessionId: string; socketId: string; userId: string; userInfo: UserInfo },
  ): Promise<void> {
    // Redis SETNX로 매치 소유권 원자적 획득 (TTL 60초)
    const lockKey = `match:lock:${match.roomId}`;
    const acquired = await this.redis.set(
      lockKey,
      process.env.INSTANCE_ID || 'default',
      'EX',
      60,
      'NX',
    );

    if (!acquired) {
      this.logger.log(`Match ${match.roomId} already claimed by another instance`);

      return;
    }

    await this.sessionManager.removeQueueSession(player1Session.sessionId);
    await this.sessionManager.removeQueueSession(player2Session.sessionId);

    this.sessionManager.addToRoom(match.roomId, match.player1);
    this.sessionManager.addToRoom(match.roomId, match.player2);

    setImmediate(() => {
      try {
        this.server
          .in([player1Session.socketId, player2Session.socketId])
          .socketsJoin(match.roomId);

        this.server.to(player1Session.socketId).emit('match:found', {
          opponent: player2Session.userInfo,
        });

        this.server.to(player2Session.socketId).emit('match:found', {
          opponent: player1Session.userInfo,
        });

        this.gameSessionManager.createGameSession(
          match.roomId,
          player1Session.userId,
          player1Session.socketId,
          player1Session.userInfo,
          player2Session.userId,
          player2Session.socketId,
          player2Session.userInfo,
        );

        this.roundProgression.startRoundSequence(match.roomId);
      } catch (error) {
        this.logger.error(
          `매치 처리 중 오류가 발생했습니다: ${match.roomId}`,
          error instanceof Error ? error.stack : error,
        );
      }
    });
  }
}
