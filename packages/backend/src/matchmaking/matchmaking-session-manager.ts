import { Inject, Injectable, Logger } from '@nestjs/common';
import { QueueSession } from './queue/queue.session';
import { UserInfo } from '../user/interfaces';
import { randomUUID } from 'crypto';
import { REDIS_CLIENT } from '../common/redis.module';
import Redis from 'ioredis';

const SESSION_TTL = 300; // 5분

@Injectable()
export class MatchmakingSessionManager {
  private readonly logger = new Logger(MatchmakingSessionManager.name);
  private roomSessions = new Map<string, Set<string>>();

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async registerUser(socketId: string, userId: string): Promise<void> {
    await Promise.all([
      this.redis.set(`mm:socket:${socketId}`, userId, 'EX', SESSION_TTL),
      this.redis.set(`mm:user:${userId}`, socketId, 'EX', SESSION_TTL),
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
      this.redis.set(`mm:socket:${socketId}`, userId, 'EX', SESSION_TTL),
      this.redis.set(`mm:user:${userId}`, socketId, 'EX', SESSION_TTL),
      this.redis.set(`mm:session:${sessionId}`, JSON.stringify(session), 'EX', SESSION_TTL),
      this.redis.set(`mm:session:user:${userId}`, sessionId, 'EX', SESSION_TTL),
      this.redis.set(`mm:session:socket:${socketId}`, sessionId, 'EX', SESSION_TTL),
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

    await Promise.all([
      this.redis.del(`mm:socket:${session.socketId}`),
      this.redis.del(`mm:user:${session.userId}`),
      this.redis.del(`mm:session:${sessionId}`),
      this.redis.del(`mm:session:user:${session.userId}`),
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
    await this.redis.del(`mm:socket:${socketId}`);

    if (userId) {
      await this.redis.del(`mm:user:${userId}`);
    }

    return {
      userId,
      sessionId: session?.sessionId,
      roomId,
    };
  }
}
