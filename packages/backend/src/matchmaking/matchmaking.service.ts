import { Injectable } from '@nestjs/common';
import { Match } from './interfaces/matchmaking.interface';
import { RedisMatchQueue } from './queue/redis-match-queue';
import { MetricsService } from '../metrics';

@Injectable()
export class MatchmakingService {
  constructor(
    private readonly matchQueue: RedisMatchQueue,
    private readonly metricsService: MetricsService,
  ) {}

  async addToQueue(userId: string, eloRating: number): Promise<Match | null> {
    const match = await this.matchQueue.addAsync(userId, eloRating);
    const queueSize = await this.matchQueue.getQueueSizeAsync();
    this.metricsService.setMatchmakingQueueSize(queueSize);

    return match;
  }

  async removeFromQueue(userId: string): Promise<void> {
    await this.matchQueue.removeAsync(userId);
    const queueSize = await this.matchQueue.getQueueSizeAsync();
    this.metricsService.setMatchmakingQueueSize(queueSize);
  }

  async getQueueSize(): Promise<number> {
    return this.matchQueue.getQueueSizeAsync();
  }

  /**
   * Polling으로 발견된 매칭들을 가져옴 (Redis Lua 스크립트 — 원자적)
   */
  async getPollingMatches(): Promise<Match[]> {
    const matches = await this.matchQueue.getAndClearPendingMatchesAsync();
    const queueSize = await this.matchQueue.getQueueSizeAsync();
    this.metricsService.setMatchmakingQueueSize(queueSize);

    return matches;
  }
}
