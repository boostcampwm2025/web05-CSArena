import { Inject, Injectable, Logger } from '@nestjs/common';
import { QueueSession } from './queue/queue.session';
import { UserInfo } from '../user/interfaces';
import { randomUUID } from 'crypto';
import { REDIS_CLIENT } from '../common/redis.module';
import Redis from 'ioredis';

// 큐 대기 세션 TTL — 매칭 대기는 짧게
const QUEUE_SESSION_TTL = 300; // 5분
// 소켓↔유저 매핑 TTL — 게임 도중 만료되어 disconnect 처리가 실패하는 일이 없도록 충분히 길게
const SOCKET_MAP_TTL = 3600; // 1시간

// 조건부 DEL Lua: 현재 값이 expected와 일치할 때만 삭제.
// 재접속 race에서 이전 소켓의 cleanup이 최신 매핑을 덮어쓰지 않도록 보호.
const DEL_IF_EQUAL_SCRIPT = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  end
  return 0
`;

@Injectable()
export class MatchmakingSessionManager {
  private readonly logger = new Logger(MatchmakingSessionManager.name);
  private roomSessions = new Map<string, Set<string>>();

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async registerUser(socketId: string, userId: string): Promise<void> {
    await Promise.all([
      this.redis.set(`mm:socket:${socketId}`, userId, 'EX', SOCKET_MAP_TTL),
      this.redis.set(`mm:user:${userId}`, socketId, 'EX', SOCKET_MAP_TTL),
    ]);
  }

  async createQueueSession(socketId: string, userId: string, userInfo: UserInfo): Promise<string> {
    const sessionId = randomUUID();
    const session: QueueSession = {
      sessionId,
      socketId,
      userId,
      userInfo,
    };

    await Promise.all([
      // 소켓↔유저 매핑은 재활용 — 긴 TTL
      this.redis.set(`mm:socket:${socketId}`, userId, 'EX', SOCKET_MAP_TTL),
      this.redis.set(`mm:user:${userId}`, socketId, 'EX', SOCKET_MAP_TTL),
      // 큐 대기 전용 키는 짧은 TTL (매칭 성사/취소 시 제거됨)
      this.redis.set(`mm:session:${sessionId}`, JSON.stringify(session), 'EX', QUEUE_SESSION_TTL),
      this.redis.set(`mm:session:user:${userId}`, sessionId, 'EX', QUEUE_SESSION_TTL),
      this.redis.set(`mm:session:socket:${socketId}`, sessionId, 'EX', QUEUE_SESSION_TTL),
    ]);

    return sessionId;
  }

  async getQueueSession(sessionId: string): Promise<QueueSession | undefined> {
    const data = await this.redis.get(`mm:session:${sessionId}`);

    return data ? (JSON.parse(data) as QueueSession) : undefined;
  }

  async getQueueSessionBySocketId(socketId: string): Promise<QueueSession | undefined> {
    const sessionId = await this.redis.get(`mm:session:socket:${socketId}`);

    if (!sessionId) {
      return undefined;
    }

    return this.getQueueSession(sessionId);
  }

  async getQueueSessionByUserId(userId: string): Promise<QueueSession | undefined> {
    const sessionId = await this.redis.get(`mm:session:user:${userId}`);

    if (!sessionId) {
      return undefined;
    }

    return this.getQueueSession(sessionId);
  }

  async removeQueueSession(sessionId: string): Promise<void> {
    const session = await this.getQueueSession(sessionId);

    if (!session) {
      return;
    }

    // 재접속 race 방지: userId로 keyed된 매핑은 현재 값이
    // 이 세션의 socketId/sessionId일 때만 삭제.
    // 그 외 (socketId로 keyed된 키들, sessionId 자체)는 고유하므로 무조건 삭제 안전.
    await Promise.all([
      this.redis.del(`mm:socket:${session.socketId}`),
      this.redis.eval(DEL_IF_EQUAL_SCRIPT, 1, `mm:user:${session.userId}`, session.socketId),
      this.redis.del(`mm:session:${sessionId}`),
      this.redis.eval(DEL_IF_EQUAL_SCRIPT, 1, `mm:session:user:${session.userId}`, sessionId),
      this.redis.del(`mm:session:socket:${session.socketId}`),
    ]);
  }

  async getUserId(socketId: string): Promise<string | undefined> {
    const userId = await this.redis.get(`mm:socket:${socketId}`);

    return userId || undefined;
  }

  // roomSessions는 로컬 유지 (해당 인스턴스의 disconnect 처리용)
  addToRoom(roomId: string, userId: string): void {
    if (!this.roomSessions.has(roomId)) {
      this.roomSessions.set(roomId, new Set());
    }

    this.roomSessions.get(roomId).add(userId);
  }

  removeFromRoom(roomId: string, userId: string): void {
    const room = this.roomSessions.get(roomId);

    if (room) {
      room.delete(userId);

      if (room.size === 0) {
        this.roomSessions.delete(roomId);
      }
    }
  }

  getUserRoom(userId: string): string | undefined {
    for (const [roomId, users] of this.roomSessions.entries()) {
      if (users.has(userId)) {
        return roomId;
      }
    }

    return undefined;
  }

  async getRoomBySocketId(socketId: string): Promise<string | undefined> {
    const userId = await this.getUserId(socketId);

    if (!userId) {
      return undefined;
    }

    return this.getUserRoom(userId);
  }

  async disconnect(
    socketId: string,
  ): Promise<{ userId?: string; sessionId?: string; roomId?: string }> {
    const userId = await this.getUserId(socketId);
    const session = await this.getQueueSessionBySocketId(socketId);
    const roomId = userId ? this.getUserRoom(userId) : undefined;

    if (session) {
      await this.removeQueueSession(session.sessionId);
    }

    if (userId && roomId) {
      this.removeFromRoom(roomId, userId);
    }

    // 소켓-유저 매핑 정리
    // mm:socket:{socketId}는 socketId가 고유하므로 무조건 삭제 안전.
    // mm:user:{userId}는 재접속 race 방지를 위해 현재 값이 이 socketId일 때만 삭제.
    await this.redis.del(`mm:socket:${socketId}`);

    if (userId) {
      await this.redis.eval(DEL_IF_EQUAL_SCRIPT, 1, `mm:user:${userId}`, socketId);
    }

    return {
      userId,
      sessionId: session?.sessionId,
      roomId,
    };
  }
}
