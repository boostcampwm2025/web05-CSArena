import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { GameSessionManager } from './game-session-manager';
import { QuizService } from '../quiz/quiz.service';
import { FinalResult, GameSession } from './interfaces/game.interfaces';
import { Match, Round, RoundAnswer } from '../match/entity';
import { UserProblemBank } from '../problem-bank/entity';
import { UserStatistics } from '../user/entity';
import { Tier, UserTierHistory } from '../tier/entity';
import { calculateMatchEloUpdate } from '../common/utils/elo.util';
import { calculateTier } from '../common/utils/tier.util';

class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
    Object.setPrototypeOf(this, NonRetryableError.prototype);
  }
}

@Injectable()
export class MatchPersistenceService {
  private readonly logger = new Logger(MatchPersistenceService.name);
  private readonly MAX_RETRIES = 5;
  private readonly BASE_DELAY = 1000;

  constructor(
    private readonly connection: DataSource,
    private readonly sessionManager: GameSessionManager,
    private readonly quizService: QuizService,
  ) {}

  /**
   * 매치 종료 후 DB에 결과 저장 (Batch INSERT, 지수 백오프 재시도)
   */
  async saveMatchToDatabase(roomId: string, finalResult: FinalResult): Promise<void> {
    const session = this.sessionManager.getGameSession(roomId);

    if (!session) {
      this.logger.error(`게임 세션을 찾을 수 없습니다: ${roomId}`);

      return;
    }

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        await this.connection.transaction(async (manager) => {
          const matchId = await this.insertMatch(manager, session, finalResult);
          const roundIdMap = await this.insertRounds(manager, matchId, session);
          await this.insertRoundAnswers(manager, roundIdMap, session);
          await this.insertUserProblemBanks(manager, matchId, session);

          // ELO 업데이트 (무승부가 아닐 때만)
          if (!finalResult.isDraw && finalResult.winnerId) {
            await this.updateEloRatings(manager, session, finalResult);
          }
        });

        return;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;

        if (error instanceof Error && error.name === 'NonRetryableError') {
          this.logger.error(
            `매치 저장 실패 (재시도 불가) - room: ${roomId}`,
            JSON.stringify({ roomId, finalResult, error: errorMessage }),
          );

          return;
        }

        const delay = this.calculateBackoff(attempt);

        if (attempt < this.MAX_RETRIES) {
          this.logger.warn(
            `매치 저장 실패 - room: ${roomId} (${attempt}/${this.MAX_RETRIES}회), ${delay}ms 후 재시도`,
            errorStack,
          );
          await this.delay(delay);
        } else {
          this.logger.error(
            `매치 저장 최종 실패 - room: ${roomId}. 데이터 유실 가능성 있음.`,
            JSON.stringify({ roomId, finalResult, error: errorMessage }),
          );
        }
      }
    }
  }

  private calculateBackoff(attempt: number): number {
    return this.BASE_DELAY * Math.pow(2, attempt - 1);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Match 테이블에 INSERT
   */
  private async insertMatch(
    manager: EntityManager,
    session: GameSession,
    finalResult: FinalResult,
  ): Promise<number> {
    const result = await manager
      .createQueryBuilder()
      .insert()
      .into(Match)
      .values({
        player1Id: this.parseUserId(session.player1Id),
        player2Id: this.parseUserId(session.player2Id),
        winnerId: finalResult.winnerId ? this.parseUserId(finalResult.winnerId) : null,
        matchType: 'multi',
      })
      .returning('id')
      .execute();

    const generated = result.generatedMaps[0];

    if (!generated) {
      throw new NonRetryableError('Match INSERT 실패: ID가 반환되지 않음');
    }

    return generated.id as number;
  }

  /**
   * Rounds 테이블에 Bulk INSERT
   */
  private async insertRounds(
    manager: EntityManager,
    matchId: number,
    session: GameSession,
  ): Promise<Map<number, number>> {
    const roundsData = Array.from(session.rounds.entries()).map(([roundNum, roundData]) => ({
      matchId,
      questionId: roundData.questionId,
      roundNumber: roundNum,
    }));

    const result = await manager
      .createQueryBuilder()
      .insert()
      .into(Round)
      .values(roundsData)
      .returning(['id', 'roundNumber'])
      .execute();

    if (roundsData.length > 0 && result.generatedMaps.length === 0) {
      throw new NonRetryableError('Round INSERT 실패: ID가 반환되지 않음');
    }

    const roundIdMap = new Map<number, number>();

    for (const r of result.generatedMaps) {
      roundIdMap.set(r.roundNumber as number, r.id as number);
    }

    return roundIdMap;
  }

  /**
   * RoundAnswers 테이블에 Bulk INSERT
   */
  private async insertRoundAnswers(
    manager: EntityManager,
    roundIdMap: Map<number, number>,
    session: GameSession,
  ): Promise<void> {
    const answersData = this.prepareRoundAnswersData(roundIdMap, session);

    if (answersData.length > 0) {
      await manager.createQueryBuilder().insert().into(RoundAnswer).values(answersData).execute();
    }
  }

  /**
   * RoundAnswers INSERT용 데이터 준비
   */
  private prepareRoundAnswersData(
    roundIdMap: Map<number, number>,
    session: GameSession,
  ): Partial<RoundAnswer>[] {
    const answersData: Partial<RoundAnswer>[] = [];

    for (const [roundNum, roundData] of session.rounds.entries()) {
      const roundId = roundIdMap.get(roundNum);
      const questionType = roundData.question?.questionType;

      if (roundId === undefined) {
        this.logger.warn(`roundId 없음: round ${roundNum}`);
        continue;
      }

      if (!questionType) {
        this.logger.warn(`questionType 없음: round ${roundNum}`);
        continue;
      }

      for (const [playerId, submission] of Object.entries(roundData.submissions)) {
        if (!submission) {
          continue;
        }

        const grade = roundData.result?.grades.find((g) => g.playerId === playerId);

        if (!grade) {
          continue;
        }

        answersData.push({
          userId: this.parseUserId(playerId),
          roundId,
          userAnswer: submission.answer || '',
          score: grade.score,
          answerStatus: this.quizService.determineAnswerStatus(
            questionType,
            grade.isCorrect,
            grade.score,
          ),
          aiFeedback: grade.feedback,
        });
      }
    }

    return answersData;
  }

  /**
   * UserProblemBanks 테이블에 Bulk INSERT
   */
  private async insertUserProblemBanks(
    manager: EntityManager,
    matchId: number,
    session: GameSession,
  ): Promise<void> {
    const problemBanksData = this.prepareProblemBanksData(matchId, session);

    if (problemBanksData.length > 0) {
      await manager
        .createQueryBuilder()
        .insert()
        .into(UserProblemBank)
        .values(problemBanksData)
        .execute();
    }
  }

  /**
   * UserProblemBanks INSERT용 데이터 준비
   */
  private prepareProblemBanksData(
    matchId: number,
    session: GameSession,
  ): Partial<UserProblemBank>[] {
    const problemBanksData: Partial<UserProblemBank>[] = [];

    for (const [roundNum, roundData] of session.rounds.entries()) {
      const questionType = roundData.question?.questionType;

      if (!questionType) {
        this.logger.warn(`questionType 없음 (problemBank): round ${roundNum}`);
        continue;
      }

      for (const [playerId, submission] of Object.entries(roundData.submissions)) {
        if (!submission) {
          continue;
        }

        const grade = roundData.result?.grades.find((g) => g.playerId === playerId);

        if (!grade) {
          continue;
        }

        problemBanksData.push({
          userId: this.parseUserId(playerId),
          questionId: roundData.questionId,
          matchId,
          userAnswer: submission.answer || '',
          answerStatus: this.quizService.determineAnswerStatus(
            questionType,
            grade.isCorrect,
            grade.score,
          ),
          aiFeedback: grade.feedback,
        });
      }
    }

    return problemBanksData;
  }

  private parseUserId(userId: string): number {
    const parsed = parseInt(userId, 10);

    if (isNaN(parsed)) {
      throw new NonRetryableError(`Invalid userId: ${userId}`);
    }

    return parsed;
  }

  /**
   * ELO 레이팅 업데이트
   *
   * @param manager - 트랜잭션 매니저
   * @param session - 게임 세션
   * @param finalResult - 게임 결과
   */
  private async updateEloRatings(
    manager: EntityManager,
    session: GameSession,
    finalResult: FinalResult,
  ): Promise<void> {
    const winnerId = this.parseUserId(finalResult.winnerId);
    const loserId =
      this.parseUserId(session.player1Id) === winnerId
        ? this.parseUserId(session.player2Id)
        : this.parseUserId(session.player1Id);

    // 현재 통계 조회
    const winnerStats = await manager.findOne(UserStatistics, {
      where: { userId: winnerId },
    });

    const loserStats = await manager.findOne(UserStatistics, {
      where: { userId: loserId },
    });

    if (!winnerStats) {
      throw new Error(
        `UserStatistics not found for winner userId: ${winnerId}. Cannot update ELO.`,
      );
    }

    if (!loserStats) {
      throw new Error(`UserStatistics not found for loser userId: ${loserId}. Cannot update ELO.`);
    }

    const winnerElo = winnerStats.tierPoint || 1000;
    const loserElo = loserStats.tierPoint || 1000;
    const winnerTotalGames = winnerStats.totalMatches || 0;
    const loserTotalGames = loserStats.totalMatches || 0;

    // ELO 계산
    const { winnerNewRating, loserNewRating, winnerChange, loserChange } = calculateMatchEloUpdate(
      winnerElo,
      loserElo,
      winnerTotalGames,
      loserTotalGames,
    );

    this.logger.log(
      `ELO 업데이트 - 승자: ${winnerId} (${winnerElo} → ${winnerNewRating}, +${winnerChange}), ` +
        `패자: ${loserId} (${loserElo} → ${loserNewRating}, ${loserChange})`,
    );

    // UserStatistics 업데이트
    await manager.update(UserStatistics, { userId: winnerId }, { tierPoint: winnerNewRating });
    await manager.update(UserStatistics, { userId: loserId }, { tierPoint: loserNewRating });

    // 티어 변동 히스토리 기록
    await this.recordTierHistory(manager, winnerId, winnerNewRating);
    await this.recordTierHistory(manager, loserId, loserNewRating);
  }

  /**
   * 티어 변동 히스토리 기록
   *
   * @param manager - 트랜잭션 매니저
   * @param userId - 유저 ID
   * @param newElo - 새로운 ELO
   */
  private async recordTierHistory(
    manager: EntityManager,
    userId: number,
    newElo: number,
  ): Promise<void> {
    const tierName = calculateTier(newElo);

    const tier = await manager.findOne(Tier, {
      where: { name: tierName },
    });

    const tierId = tier?.id || 1;

    await manager.insert(UserTierHistory, {
      userId,
      tierId,
      tierPoint: newElo,
    });
  }
}
