import { Injectable, Logger } from '@nestjs/common';
import { IMatchQueue, Match, QueuedPlayer } from '../interfaces/matchmaking.interface';
import { randomUUID } from 'crypto';
import { MATCH_RANGES } from '../constants/matchmaking.constants';

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

    const playerWaitTime = now - player.queuedAt;
    const playerAllowedRange = this.getEloRangeForWaitTime(playerWaitTime);

    for (const candidate of this.queue) {
      const candidateWaitTime = now - candidate.queuedAt;
      const candidateAllowedRange = this.getEloRangeForWaitTime(candidateWaitTime);
      const eloDiff = Math.abs(player.eloRating - candidate.eloRating);

      // 두 플레이어 모두의 허용 범위를 확인
      if (
        eloDiff <= playerAllowedRange &&
        eloDiff <= candidateAllowedRange &&
        eloDiff < smallestEloDiff
      ) {
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
    for (const range of MATCH_RANGES) {
      if (waitTime < range.maxWaitTime) {
        return range.eloRange;
      }
    }

    return MATCH_RANGES[MATCH_RANGES.length - 1].eloRange;
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

  /**
   * 큐에 있는 플레이어들끼리 재매칭 시도
   * Polling으로 주기적으로 호출됨
   */
  private attemptRematchExistingPlayers(): Match[] {
    const matches: Match[] = [];

    if (this.queue.length < 2) {
      return matches;
    }

    const now = Date.now();
    const processedPlayers = new Set<string>();

    // 큐를 순회하면서 각 플레이어에 대해 매칭 시도
    for (let i = 0; i < this.queue.length; i++) {
      const player = this.queue[i];

      // 이미 처리된 플레이어는 스킵
      if (processedPlayers.has(player.userId)) {
        continue;
      }

      // 현재 플레이어에게 맞는 상대 찾기
      const waitTime = now - player.queuedAt;
      const allowedRange = this.getEloRangeForWaitTime(waitTime);

      let bestMatch: QueuedPlayer | null = null;
      let smallestEloDiff = Infinity;

      for (let j = i + 1; j < this.queue.length; j++) {
        const candidate = this.queue[j];

        // 이미 처리된 플레이어는 스킵
        if (processedPlayers.has(candidate.userId)) {
          continue;
        }

        const candidateWaitTime = now - candidate.queuedAt;
        const candidateAllowedRange = this.getEloRangeForWaitTime(candidateWaitTime);

        const eloDiff = Math.abs(player.eloRating - candidate.eloRating);

        // 두 플레이어 모두의 허용 범위를 확인
        if (
          eloDiff <= allowedRange &&
          eloDiff <= candidateAllowedRange &&
          eloDiff < smallestEloDiff
        ) {
          bestMatch = candidate;
          smallestEloDiff = eloDiff;
        }
      }

      // 매칭 성공
      if (bestMatch) {
        matches.push({
          player1: player.userId,
          player2: bestMatch.userId,
          roomId: randomUUID(),
        });

        processedPlayers.add(player.userId);
        processedPlayers.add(bestMatch.userId);

        this.logger.log(
          `Rematch found: ${player.userId} (${player.eloRating}) vs ${bestMatch.userId} (${bestMatch.eloRating})`,
        );
      }
    }

    // 매칭된 플레이어들을 큐에서 제거
    for (const userId of processedPlayers) {
      this.removeFromQueue(userId);
    }

    return matches;
  }

  /**
   * Polling으로 발견된 매칭들을 가져옴
   */
  getAndClearPendingMatches(): Match[] {
    return this.attemptRematchExistingPlayers();
  }
}
