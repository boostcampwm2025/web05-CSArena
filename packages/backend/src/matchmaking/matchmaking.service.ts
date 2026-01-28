import { Injectable } from '@nestjs/common';
import { IMatchQueue, Match } from './interfaces/matchmaking.interface';
import { EloMatchQueue } from './queue/elo-match-queue';

@Injectable()
export class MatchmakingService {
  private readonly matchQueue: IMatchQueue;
  private readonly userToSessionId = new Map<string, string>();

  constructor() {
    this.matchQueue = new EloMatchQueue();
  }

  addToQueue(userId: string, eloRating: number): Match | null {
    const sessionId = `session-${userId}-${Date.now()}`;
    this.userToSessionId.set(userId, sessionId);

    return this.matchQueue.add(userId, eloRating);
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

  /**
   * Polling으로 발견된 매칭들을 가져옴
   */
  getPollingMatches(): Match[] {
    if ('getAndClearPendingMatches' in this.matchQueue) {
      return (this.matchQueue as EloMatchQueue).getAndClearPendingMatches();
    }

    return [];
  }
}
