import { HttpException, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DataSource, EntityManager } from 'typeorm';
import { GameSessionManager } from './game-session-manager';
import { QuizService } from '../quiz/quiz.service';
import {
  FinalResult,
  GameSession,
  GradeResult,
  RoundResult,
  Submission,
} from './interfaces/game.interfaces';
import { Match, Round, RoundAnswer } from '../match/entity';
import { UserProblemBank } from '../problem-bank/entity';
import { UserStatistics } from '../user/entity';
import { Tier, UserTierHistory } from '../tier/entity';
import { calculateMatchEloUpdate } from '../common/utils/elo.util';
import { calculateTier } from '../common/utils/tier.util';
import { parseUserId } from '../common/utils/parse-user-id.util';
import { MATCH_PERSISTENCE_QUEUE } from './queues/queue.constants';

class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
    Object.setPrototypeOf(this, NonRetryableError.prototype);
  }
}

export interface SerializedRoundData {
  roundNumber: number;
  questionId: number | null;
  questionType: string | null;
  submissions: { [playerId: string]: Submission | null };
  result: RoundResult | null;
}

export interface SessionSnapshot {
  roomId: string;
  player1Id: string;
  player2Id: string;
  player1Score: number;
  player2Score: number;
  rounds: SerializedRoundData[];
}

export interface MatchPersistenceJobData {
  snapshot: SessionSnapshot;
  finalResult: FinalResult;
}

@Injectable()
export class MatchPersistenceService {
  private readonly logger = new Logger(MatchPersistenceService.name);

  constructor(
    private readonly connection: DataSource,
    private readonly sessionManager: GameSessionManager,
    private readonly quizService: QuizService,
    @InjectQueue(MATCH_PERSISTENCE_QUEUE)
    private readonly persistenceQueue: Queue<MatchPersistenceJobData>,
  ) {}

  /**
   * 매치 종료 후 DB에 결과 저장
   *
   * 1차 시도는 동기 경로로 즉시 실행 → ELO 변화량을 바로 반환 가능.
   * 실패 시 세션 스냅샷을 BullMQ 큐에 저장 → Redis 기반 영속적 재시도.
   */
  async saveMatchToDatabase(
    roomId: string,
    finalResult: FinalResult,
  ): Promise<{ player1Change: number; player2Change: number } | null> {
    const session = this.sessionManager.getGameSession(roomId);

    if (!session) {
      this.logger.error(`게임 세션을 찾을 수 없습니다: ${roomId}`);

      return null;
    }

    const snapshot = this.createSnapshot(session);

    try {
      return await this.executeTransaction(snapshot, finalResult);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (error instanceof HttpException || error instanceof NonRetryableError) {
        this.logger.error(`매치 저장 실패 (재시도 불가) - room: ${roomId}`, errorMessage);

        return null;
      }

      this.logger.warn(
        `매치 저장 1차 실패 - room: ${roomId}, BullMQ 재시도 큐에 등록: ${errorMessage}`,
      );
      await this.enqueueRetry(snapshot, finalResult);

      return null;
    }
  }

  /**
   * BullMQ 워커에서 호출: 스냅샷으로 DB 저장
   */
  async saveMatchFromSnapshot(snapshot: SessionSnapshot, finalResult: FinalResult): Promise<void> {
    await this.executeTransaction(snapshot, finalResult);
  }

  private createSnapshot(session: GameSession): SessionSnapshot {
    return {
      roomId: session.roomId,
      player1Id: session.player1Id,
      player2Id: session.player2Id,
      player1Score: session.player1Score,
      player2Score: session.player2Score,
      rounds: Array.from(session.rounds.values()).map((round) => ({
        roundNumber: round.roundNumber,
        questionId: round.questionId,
        questionType: round.question?.questionType ?? null,
        submissions: round.submissions,
        result: round.result,
      })),
    };
  }

  private async enqueueRetry(snapshot: SessionSnapshot, finalResult: FinalResult): Promise<void> {
    await this.persistenceQueue.add(
      'save-match',
      { snapshot, finalResult },
      {
        jobId: `save-match:${snapshot.roomId}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
    this.logger.log(`매치 ${snapshot.roomId} 재시도 큐 등록 완료`);
  }

  /**
   * 트랜잭션 실행 (스냅샷 기반)
   */
  private async executeTransaction(
    snapshot: SessionSnapshot,
    finalResult: FinalResult,
  ): Promise<{ player1Change: number; player2Change: number } | null> {
    let eloChanges: { player1Change: number; player2Change: number } | null = null;

    await this.connection.transaction(async (manager) => {
      const matchId = await this.insertMatch(manager, snapshot, finalResult);

      if (matchId === null) {
        this.logger.warn(`중복 저장 감지 (ON CONFLICT) - roomId: ${snapshot.roomId}, 건너뜀`);

        return;
      }

      const roundIdMap = await this.insertRounds(manager, matchId, snapshot);
      await this.insertRoundAnswers(manager, roundIdMap, snapshot);
      await this.insertUserProblemBanks(manager, matchId, snapshot);

      if (!finalResult.isDraw && finalResult.winnerId) {
        eloChanges = await this.updateEloRatings(manager, matchId, snapshot, finalResult);
      }
    });

    return eloChanges;
  }

  private async insertMatch(
    manager: EntityManager,
    snapshot: SessionSnapshot,
    finalResult: FinalResult,
  ): Promise<number | null> {
    const result = await manager
      .createQueryBuilder()
      .insert()
      .into(Match)
      .values({
        roomId: snapshot.roomId,
        player1Id: parseUserId(snapshot.player1Id),
        player2Id: parseUserId(snapshot.player2Id),
        winnerId: finalResult.winnerId ? parseUserId(finalResult.winnerId) : null,
        matchType: 'multi',
      })
      .orIgnore()
      .returning('id')
      .execute();

    const generated = result.generatedMaps[0];

    if (!generated) {
      // ON CONFLICT DO NOTHING: 동일 roomId의 매치가 이미 저장됨
      return null;
    }

    return generated.id as number;
  }

  private async insertRounds(
    manager: EntityManager,
    matchId: number,
    snapshot: SessionSnapshot,
  ): Promise<Map<number, number>> {
    const roundsData = snapshot.rounds.map((round) => ({
      matchId,
      questionId: round.questionId,
      roundNumber: round.roundNumber,
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

  private async insertRoundAnswers(
    manager: EntityManager,
    roundIdMap: Map<number, number>,
    snapshot: SessionSnapshot,
  ): Promise<void> {
    const answersData = this.prepareRoundAnswersData(roundIdMap, snapshot);

    if (answersData.length > 0) {
      await manager.createQueryBuilder().insert().into(RoundAnswer).values(answersData).execute();
    }
  }

  private prepareRoundAnswersData(
    roundIdMap: Map<number, number>,
    snapshot: SessionSnapshot,
  ): Partial<RoundAnswer>[] {
    const answersData: Partial<RoundAnswer>[] = [];

    for (const round of snapshot.rounds) {
      const roundId = roundIdMap.get(round.roundNumber);
      const questionType = round.questionType;

      if (roundId === undefined) {
        this.logger.warn(`roundId 없음: round ${round.roundNumber}`);
        continue;
      }

      if (!questionType) {
        this.logger.warn(`questionType 없음: round ${round.roundNumber}`);
        continue;
      }

      for (const [playerId, submission] of Object.entries(round.submissions)) {
        if (!submission) {
          continue;
        }

        const grade = round.result?.grades.find((g: GradeResult) => g.playerId === playerId);

        if (!grade) {
          continue;
        }

        answersData.push({
          userId: parseUserId(playerId),
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

  private async insertUserProblemBanks(
    manager: EntityManager,
    matchId: number,
    snapshot: SessionSnapshot,
  ): Promise<void> {
    const problemBanksData = this.prepareProblemBanksData(matchId, snapshot);

    if (problemBanksData.length > 0) {
      await manager
        .createQueryBuilder()
        .insert()
        .into(UserProblemBank)
        .values(problemBanksData)
        .execute();
    }
  }

  private prepareProblemBanksData(
    matchId: number,
    snapshot: SessionSnapshot,
  ): Partial<UserProblemBank>[] {
    const problemBanksData: Partial<UserProblemBank>[] = [];

    for (const round of snapshot.rounds) {
      const questionType = round.questionType;

      if (!questionType) {
        this.logger.warn(`questionType 없음 (problemBank): round ${round.roundNumber}`);
        continue;
      }

      for (const [playerId, submission] of Object.entries(round.submissions)) {
        if (!submission) {
          continue;
        }

        const grade = round.result?.grades.find((g: GradeResult) => g.playerId === playerId);

        if (!grade) {
          continue;
        }

        problemBanksData.push({
          userId: parseUserId(playerId),
          questionId: round.questionId,
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

  private async updateEloRatings(
    manager: EntityManager,
    matchId: number,
    snapshot: SessionSnapshot,
    finalResult: FinalResult,
  ): Promise<{ player1Change: number; player2Change: number }> {
    const winnerId = parseUserId(finalResult.winnerId);
    const loserId =
      parseUserId(snapshot.player1Id) === winnerId
        ? parseUserId(snapshot.player2Id)
        : parseUserId(snapshot.player1Id);

    const winnerStats = await manager.findOne(UserStatistics, { where: { userId: winnerId } });
    const loserStats = await manager.findOne(UserStatistics, { where: { userId: loserId } });

    if (!winnerStats) {
      throw new NonRetryableError(`승자의 UserStatistics를 찾을 수 없습니다. userId: ${winnerId}`);
    }

    if (!loserStats) {
      throw new NonRetryableError(`패자의 UserStatistics를 찾을 수 없습니다. userId: ${loserId}`);
    }

    const winnerElo = winnerStats.tierPoint ?? 1000;
    const loserElo = loserStats.tierPoint ?? 1000;
    const winnerTotalGames = winnerStats.totalMatches ?? 0;
    const loserTotalGames = loserStats.totalMatches ?? 0;

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

    await manager.update(
      UserStatistics,
      { userId: winnerId },
      {
        tierPoint: winnerNewRating,
        winCount: () => 'win_count + 1',
        totalMatches: () => 'total_matches + 1',
      },
    );

    await manager.update(
      UserStatistics,
      { userId: loserId },
      {
        tierPoint: loserNewRating,
        loseCount: () => 'lose_count + 1',
        totalMatches: () => 'total_matches + 1',
      },
    );

    await this.recordTierHistory(manager, winnerId, matchId, winnerChange, winnerNewRating);
    await this.recordTierHistory(manager, loserId, matchId, loserChange, loserNewRating);

    const player1Id = parseUserId(snapshot.player1Id);
    const player2Id = parseUserId(snapshot.player2Id);

    return {
      player1Change: player1Id === winnerId ? winnerChange : loserChange,
      player2Change: player2Id === winnerId ? winnerChange : loserChange,
    };
  }

  private async recordTierHistory(
    manager: EntityManager,
    userId: number,
    matchId: number,
    tierChange: number,
    newElo: number,
  ): Promise<void> {
    const tierName = calculateTier(newElo);
    const tier = await manager.findOne(Tier, { where: { name: tierName } });

    if (!tier) {
      throw new NonRetryableError(
        `티어 '${tierName}'을(를) 찾을 수 없습니다. ELO: ${newElo}, userId: ${userId}`,
      );
    }

    await manager.insert(UserTierHistory, {
      userId,
      tierId: tier.id,
      tierPoint: newElo,
      matchId,
      tierChange,
    });
  }
}
