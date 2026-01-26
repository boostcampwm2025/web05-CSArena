import { Injectable, Logger } from '@nestjs/common';
import { IMatchQueue, Match, QueuedPlayer } from '../interfaces/matchmaking.interface';
import { randomUUID } from 'crypto';

/**
 * ELO 기반 매칭 큐
 *
 * 대기 시간에 따라 매칭 범위를 확대하여 매칭 성공률을 높입니다.
 * - 0-10초: ±100 ELO
 * - 10-30초: ±200 ELO
 * - 30초+: ±500 ELO
 */
@Injectable()
export class EloMatchQueue implements IMatchQueue {
  private readonly logger = new Logger(EloMatchQueue.name);
  private queue: QueuedPlayer[] = [];

  // 매칭 범위 설정 (밀리초)
  private readonly MATCH_RANGES = [
    { maxWaitTime: 10000, eloRange: 100 }, // 0-10초: ±100 ELO
    { maxWaitTime: 30000, eloRange: 200 }, // 10-30초: ±200 ELO
    { maxWaitTime: Infinity, eloRange: 500 }, // 30초+: ±500 ELO
  ];

  add(userId: string, eloRating: number): Match | null {
    // 중복 체크
    if (this.queue.some((player) => player.userId === userId)) {
      this.logger.warn(`User ${userId} is already in queue`);

      return null;
    }

    const newPlayer: QueuedPlayer = {
      userId,
      eloRating,
      queuedAt: Date.now(),
    };

    // 매칭 시도
    const opponent = this.findBestMatch(newPlayer);

    if (opponent) {
      // 매칭 성공
      this.removeFromQueue(opponent.userId);

      this.logger.log(
        `Match found: ${userId} (${eloRating}) vs ${opponent.userId} (${opponent.eloRating})`,
      );

      return {
        player1: userId,
        player2: opponent.userId,
        roomId: randomUUID(),
      };
    }

    // 매칭 실패 - 큐에 추가
    this.queue.push(newPlayer);
    this.logger.log(`User ${userId} added to queue (ELO: ${eloRating})`);

    return null;
  }

  remove(userId: string): void {
    this.removeFromQueue(userId);
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * 최적의 상대 찾기
   *
   * @param player - 매칭을 원하는 플레이어
   * @returns 매칭된 상대 또는 null
   */
  private findBestMatch(player: QueuedPlayer): QueuedPlayer | null {
    if (this.queue.length === 0) {
      return null;
    }

    const now = Date.now();
    let bestMatch: QueuedPlayer | null = null;
    let smallestEloDiff = Infinity;

    for (const candidate of this.queue) {
      const waitTime = now - candidate.queuedAt;
      const allowedRange = this.getEloRangeForWaitTime(waitTime);
      const eloDiff = Math.abs(player.eloRating - candidate.eloRating);

      // 범위 내에 있고, ELO 차이가 가장 작은 상대 선택
      if (eloDiff <= allowedRange && eloDiff < smallestEloDiff) {
        bestMatch = candidate;
        smallestEloDiff = eloDiff;
      }
    }

    return bestMatch;
  }

  /**
   * 대기 시간에 따른 허용 ELO 범위 계산
   *
   * @param waitTime - 대기 시간 (밀리초)
   * @returns 허용 ELO 범위
   */
  private getEloRangeForWaitTime(waitTime: number): number {
    for (const range of this.MATCH_RANGES) {
      if (waitTime < range.maxWaitTime) {
        return range.eloRange;
      }
    }

    return this.MATCH_RANGES[this.MATCH_RANGES.length - 1].eloRange;
  }

  /**
   * 큐에서 플레이어 제거
   *
   * @param userId - 제거할 유저 ID
   */
  private removeFromQueue(userId: string): void {
    const index = this.queue.findIndex((player) => player.userId === userId);

    if (index > -1) {
      this.queue.splice(index, 1);
      this.logger.log(`User ${userId} removed from queue`);
    }
  }

  /**
   * 디버그용: 현재 큐 상태 조회
   */
  getQueueStatus(): QueuedPlayer[] {
    return [...this.queue];
  }
}
