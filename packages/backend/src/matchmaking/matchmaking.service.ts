import { Injectable } from '@nestjs/common';
import { IMatchQueue, Match } from './interfaces/matchmaking.interface';
import { InMemoryMatchQueue } from './queue/in-memory-queue';

@Injectable()
export class MatchmakingService {
  private readonly matchQueue: IMatchQueue;
  private readonly userToSessionId = new Map<string, string>();

  constructor() {
    this.matchQueue = new InMemoryMatchQueue();
  }

  addToQueue(userId: string): Match | null {
    const sessionId = `session-${userId}-${Date.now()}`;
    this.userToSessionId.set(userId, sessionId);

    return this.matchQueue.add(userId);
  }

  removeFromQueue(userId: string): void {
    this.matchQueue.remove(userId);
    this.userToSessionId.delete(userId);
  }

  getQueueSize(): number {
    return this.matchQueue.getQueueSize();
  }

  getSessionId(userId: string): string | undefined {
    return this.userToSessionId.get(userId);
  }
}
