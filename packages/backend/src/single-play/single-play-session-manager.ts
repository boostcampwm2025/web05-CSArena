import { Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { SinglePlayGame } from './domain/single-play-game';

/**
 * 싱글 플레이 게임 세션을 관리하는 Repository
 * 도메인 모델(SinglePlayGame)의 라이프사이클을 관리
 * TTL 기반 자동 정리 기능 포함
 */
@Injectable()
export class SinglePlaySessionManager implements OnModuleDestroy {
  private readonly logger = new Logger(SinglePlaySessionManager.name);
  private games = new Map<string, SinglePlayGame>();
  private cleanupInterval: NodeJS.Timeout;

  // 세션 만료 시간 (30분)
  private readonly SESSION_TTL = 30 * 60 * 1000;
  // 정리 작업 실행 주기 (5분)
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000;

  constructor() {
    // 주기적으로 만료된 세션 정리
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.CLEANUP_INTERVAL);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * 새로운 게임 시작
   */
  createGame(userId: string, categoryIds: number[], questionIds: number[]): SinglePlayGame {
    // 이미 진행 중인 게임이 있으면 제거
    if (this.games.has(userId)) {
      this.games.delete(userId);
    }

    const game = new SinglePlayGame(userId, categoryIds, questionIds);
    this.games.set(userId, game);

    return game;
  }

  /**
   * 게임 조회
   */
  findGame(userId: string): SinglePlayGame | null {
    return this.games.get(userId) || null;
  }

  /**
   * 게임 조회 (없으면 에러)
   */
  findGameOrThrow(userId: string): SinglePlayGame {
    const game = this.games.get(userId);

    if (!game) {
      throw new NotFoundException('게임 세션을 찾을 수 없습니다. 먼저 문제를 요청해주세요.');
    }

    return game;
  }

  /**
   * 게임 삭제
   */
  deleteGame(userId: string): boolean {
    return this.games.delete(userId);
  }

  /**
   * 모든 게임 조회 (관리자용)
   */
  getAllGames(): SinglePlayGame[] {
    return Array.from(this.games.values());
  }

  /**
   * 만료된 세션 자동 정리
   * - 생성된 지 30분 이상 지난 세션
   * - 완료된 지 5분 이상 지난 세션
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [userId, game] of this.games.entries()) {
      const sessionAge = now - game.createdAt;

      // 완료된 게임은 5분 후 삭제
      if (game.isCompleted() && sessionAge > 5 * 60 * 1000) {
        this.games.delete(userId);
        cleanedCount++;
        continue;
      }

      // 진행 중인 게임은 30분 후 삭제 (방치된 세션)
      if (!game.isCompleted() && sessionAge > this.SESSION_TTL) {
        this.games.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(
        `Cleaned up ${cleanedCount} expired session(s). Active sessions: ${this.games.size}`,
      );
    }
  }
}
