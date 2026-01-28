import { QueueSession } from './queue/queue.session';
import { UserInfo } from '../user/interfaces';
import { randomUUID } from 'crypto';

export class MatchmakingSessionManager {
  private socketToUser = new Map<string, string>();
  private userToSocket = new Map<string, string>();
  private queueSessions = new Map<string, QueueSession>();
  private roomSessions = new Map<string, Set<string>>();

  registerUser(socketId: string, userId: string): void {
    this.socketToUser.set(socketId, userId);
    this.userToSocket.set(userId, socketId);
  }

  createQueueSession(socketId: string, userId: string, userInfo: UserInfo): string {
    const sessionId = randomUUID();
    const session: QueueSession = {
      sessionId,
      socketId,
      userId,
      userInfo,
    };

    this.socketToUser.set(socketId, userId);
    this.userToSocket.set(userId, socketId);
    this.queueSessions.set(sessionId, session);

    return sessionId;
  }

  getQueueSession(sessionId: string): QueueSession | undefined {
    return this.queueSessions.get(sessionId);
  }

  getQueueSessionBySocketId(socketId: string): QueueSession | undefined {
    return Array.from(this.queueSessions.values()).find((s) => s.socketId === socketId);
  }

  getQueueSessionByUserId(userId: string): QueueSession | undefined {
    return Array.from(this.queueSessions.values()).find((s) => s.userId === userId);
  }

  removeQueueSession(sessionId: string): void {
    const session = this.queueSessions.get(sessionId);

    if (session) {
      this.socketToUser.delete(session.socketId);
      this.userToSocket.delete(session.userId);
      this.queueSessions.delete(sessionId);
    }
  }

  getUserId(socketId: string): string | undefined {
    return this.socketToUser.get(socketId);
  }

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

  getRoomBySocketId(socketId: string): string | undefined {
    const userId = this.socketToUser.get(socketId);

    if (!userId) {
      return undefined;
    }

    return this.getUserRoom(userId);
  }

  disconnect(socketId: string): { userId?: string; sessionId?: string; roomId?: string } {
    const userId = this.socketToUser.get(socketId);
    const session = this.getQueueSessionBySocketId(socketId);
    const roomId = userId ? this.getUserRoom(userId) : undefined;

    if (session) {
      this.removeQueueSession(session.sessionId);
    }

    if (userId && roomId) {
      this.removeFromRoom(roomId, userId);
    }

    this.socketToUser.delete(socketId);

    if (userId) {
      this.userToSocket.delete(userId);
    }

    return {
      userId,
      sessionId: session?.sessionId,
      roomId,
    };
  }
}
