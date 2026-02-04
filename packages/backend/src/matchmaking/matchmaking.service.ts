import { Injectable } from '@nestjs/common';
import { IMatchQueue, Match } from './interfaces/matchmaking.interface';
import { EloMatchQueue } from './queue/elo-match-queue';
import { MetricsService } from '../metrics';

@Injectable()
export class MatchmakingService {
  private readonly matchQueue: IMatchQueue;
  private readonly userToSessionId = new Map<string, string>();

  constructor(private readonly metricsService: MetricsService) {
    this.matchQueue = new EloMatchQueue();
  }

  addToQueue(userId: string, eloRating: number): Match | null {
    const sessionId = `session-${userId}-${Date.now()}`;
    this.userToSessionId.set(userId, sessionId);

    const match = this.matchQueue.add(userId, eloRating);
    this.metricsService.setMatchmakingQueueSize(this.matchQueue.getQueueSize());

    return match;
  }

  removeFromQueue(userId: string): void {
    this.matchQueue.remove(userId);
    this.userToSessionId.delete(userId);
    this.metricsService.setMatchmakingQueueSize(this.matchQueue.getQueueSize());
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
      const matches = (this.matchQueue as EloMatchQueue).getAndClearPendingMatches();
      this.metricsService.setMatchmakingQueueSize(this.matchQueue.getQueueSize());

      return matches;
    }

    return [];
  }
}
