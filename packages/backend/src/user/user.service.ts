import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User, UserStatistics } from './entity';
import { UserProblemBank } from '../problem-bank/entity';
import { UserTierHistory } from '../tier/entity';
import { Match, Round } from '../match/entity';
import { Question } from '../quiz/entity';
import {
  MatchStatsDto,
  MyPageResponseDto,
  ProblemStatsDto,
  ProfileDto,
  RankDto,
} from './dto/mypage-response.dto';
import { TierHistoryResponseDto } from './dto/tier-history-response.dto';
import { MatchHistoryItemDto, MatchHistoryResponseDto } from './dto/match-history-response.dto';
import { MatchHistoryQueryDto } from './dto/match-history-request.dto';
import { calcLevel } from '../common/utils/level.util';
import { calculateTier } from '../common/utils/tier.util';
import { ProblemStatsRaw } from './interfaces';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProblemBank)
    private readonly userProblemBankRepository: Repository<UserProblemBank>,
    @InjectRepository(UserTierHistory)
    private readonly userTierHistoryRepository: Repository<UserTierHistory>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(Round)
    private readonly roundRepository: Repository<Round>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
  ) {}

  async getMyPageData(userId: number): Promise<MyPageResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['statistics'],
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const profile = this.buildProfile(user);
    const stats = user.statistics;
    const tierPoint = stats?.tierPoint ?? 0;
    const expPoint = stats?.expPoint ?? 0;

    const rank = this.buildRank(tierPoint);
    const { level, needExpPoint, remainedExpPoint } = calcLevel(expPoint);
    const matchStats = this.buildMatchStats(stats);
    const problemStats = await this.buildProblemStats(userId);

    return {
      profile,
      rank,
      levelInfo: { level, needExpPoint, remainedExpPoint },
      matchStats,
      problemStats,
    };
  }

  async getTierHistory(userId: number): Promise<TierHistoryResponseDto> {
    const histories = await this.userTierHistoryRepository.find({
      where: { userId },
      relations: ['tier'],
      order: { updatedAt: 'DESC' },
    });

    const tierHistory = histories.map((h) => ({
      tier: h.tier?.name ?? calculateTier(h.tierPoint ?? 0),
      tierPoint: h.tierPoint ?? 0,
      tierChange: h.tierChange ?? null,
      changedAt: h.updatedAt,
    }));

    return { tierHistory };
  }

  async getMatchHistory(
    userId: number,
    query: MatchHistoryQueryDto = {},
  ): Promise<MatchHistoryResponseDto> {
    const { matchType = 'all', limit = 10, cursor } = query;

    // Step 1: Match 기본 정보만 가져오기 (Player 정보 포함, JOIN 깊이 1)
    const queryBuilder = this.matchRepository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.player1', 'player1')
      .leftJoinAndSelect('m.player2', 'player2')
      .where('(m.player1Id = :userId OR m.player2Id = :userId)', { userId })
      .orderBy('m.createdAt', 'DESC')
      .take(limit);

    // matchType 필터 추가
    if (matchType !== 'all') {
      queryBuilder.andWhere('m.matchType = :matchType', { matchType });
    }

    // 커서 기반 페이지네이션
    if (cursor) {
      queryBuilder.andWhere('m.createdAt < :cursor', { cursor });
    }

    const matches = await queryBuilder.getMany();

    if (matches.length === 0) {
      return { matchHistory: [], hasMore: false };
    }

    const hasMore = matches.length === limit;
    const nextCursor = matches.length > 0 ? matches[matches.length - 1].createdAt : undefined;

    const matchIds = matches.map((m) => Number(m.id));
    const multiMatchIds = matches.filter((m) => m.matchType === 'multi').map((m) => Number(m.id));
    const singleMatchIds = matches.filter((m) => m.matchType === 'single').map((m) => Number(m.id));

    // Step 2: 모든 match의 Round + Answer 데이터 벌크 로딩 (multi/single 모두 사용, JOIN 깊이 1)
    const roundsMap = await this.loadRoundsForMatches(matchIds);

    // Step 3: Single match의 첫 번째 Question + Category 정보 벌크 로딩 (JOIN 깊이 3)
    const categoriesMap = await this.loadCategoriesForMatches(singleMatchIds);

    // Step 4: Multi match의 TierHistory 벌크 로딩 (기존과 동일)
    const tierHistoryMap = await this.loadTierHistoriesForMatches(userId, multiMatchIds);

    // 데이터 조합하여 응답 생성
    const matchHistory = matches.map((match) => {
      if (match.matchType === 'multi') {
        const rounds = roundsMap.get(Number(match.id)) ?? [];

        return this.buildMultiMatchHistoryFromBulkData(
          match,
          userId,
          rounds,
          tierHistoryMap.get(Number(match.id)) ?? 0,
        );
      } else {
        const categoryName = categoriesMap.get(Number(match.id)) ?? 'Unknown';
        const rounds = roundsMap.get(Number(match.id)) ?? [];

        return this.buildSingleMatchHistoryFromBulkData(match, userId, categoryName, rounds);
      }
    });

    return { matchHistory, hasMore, nextCursor };
  }

  /**
   * Multi match의 Round + RoundAnswer 벌크 로딩
   * Query: SELECT rounds, answers WHERE matchId IN (...)
   */
  private async loadRoundsForMatches(
    matchIds: number[],
  ): Promise<
    Map<number, Array<{ answers: Array<{ userId: number; score: number; answerStatus: string }> }>>
  > {
    if (matchIds.length === 0) {
      return new Map();
    }

    const rounds = await this.roundRepository.find({
      where: { matchId: In(matchIds) },
      relations: ['answers'],
      select: {
        id: true,
        matchId: true,
        answers: {
          id: true,
          userId: true,
          score: true,
          answerStatus: true,
        },
      },
    });

    // matchId별로 그룹핑
    const roundsMap = new Map<
      number,
      Array<{ answers: Array<{ userId: number; score: number; answerStatus: string }> }>
    >();

    for (const round of rounds) {
      const matchId = Number(round.matchId);

      if (!roundsMap.has(matchId)) {
        roundsMap.set(matchId, []);
      }

      roundsMap.get(matchId).push({
        answers: round.answers ?? [],
      });
    }

    return roundsMap;
  }

  /**
   * Single match의 첫 번째 Question의 Category 정보 벌크 로딩
   * Query: SELECT question, category WHERE matchId IN (...)
   */
  private async loadCategoriesForMatches(matchIds: number[]): Promise<Map<number, string>> {
    if (matchIds.length === 0) {
      return new Map();
    }

    // Single match의 첫 번째 Round의 questionId 조회
    const rounds = await this.roundRepository
      .createQueryBuilder('r')
      .select(['r.matchId', 'r.questionId'])
      .where('r.matchId IN (:...matchIds)', { matchIds })
      .andWhere('r.roundNumber = 1')
      .getMany();

    const questionIds = rounds.map((r) => r.questionId).filter((id) => id != null);

    if (questionIds.length === 0) {
      return new Map();
    }

    // Question + Category 정보 벌크 로딩 (JOIN 깊이 3)
    const questions = await this.questionRepository.find({
      where: { id: In(questionIds) },
      relations: [
        'categoryQuestions',
        'categoryQuestions.category',
        'categoryQuestions.category.parent',
      ],
      select: {
        id: true,
        categoryQuestions: {
          id: true,
          category: {
            id: true,
            name: true,
            parent: {
              id: true,
              name: true,
            },
          },
        },
      },
    });

    // questionId -> categoryName 매핑
    const questionCategoryMap = new Map<number, string>();

    for (const question of questions) {
      const category = question.categoryQuestions?.[0]?.category;
      const categoryName = category?.parent?.name ?? category?.name ?? 'Unknown';
      questionCategoryMap.set(question.id, categoryName);
    }

    // matchId -> categoryName 매핑
    const categoriesMap = new Map<number, string>();

    for (const round of rounds) {
      const categoryName = questionCategoryMap.get(round.questionId) ?? 'Unknown';
      categoriesMap.set(Number(round.matchId), categoryName);
    }

    return categoriesMap;
  }

  /**
   * Multi match의 TierHistory 벌크 로딩 (기존과 동일)
   */
  private async loadTierHistoriesForMatches(
    userId: number,
    matchIds: number[],
  ): Promise<Map<number, number>> {
    if (matchIds.length === 0) {
      return new Map();
    }

    const tierHistories = await this.userTierHistoryRepository.find({
      where: {
        userId,
        matchId: In(matchIds),
      },
      select: ['matchId', 'tierChange'],
    });

    return new Map(tierHistories.map((th) => [Number(th.matchId), th.tierChange ?? 0]));
  }

  /**
   * Multi match 히스토리 빌드 (벌크 로딩된 데이터 사용)
   */
  private buildMultiMatchHistoryFromBulkData(
    match: Match,
    userId: number,
    rounds: Array<{ answers: Array<{ userId: number; score: number; answerStatus: string }> }>,
    tierPointChange: number,
  ): MatchHistoryItemDto {
    const isPlayer1 = Number(match.player1Id) === userId;
    const opponent = isPlayer1 ? match.player2 : match.player1;

    const { myScore, opponentScore } = this.calculateScoresFromRounds(rounds, userId);

    const result =
      match.winnerId === null ? 'draw' : Number(match.winnerId) === userId ? 'win' : 'lose';

    return {
      type: 'multi',
      match: {
        opponent: {
          nickname: opponent?.nickname ?? 'Unknown',
          profileImage: opponent?.userProfile ?? null,
        },
        result,
        myScore,
        opponentScore,
        tierPointChange,
        playedAt: match.createdAt,
      },
    };
  }

  /**
   * Single match 히스토리 빌드 (벌크 로딩된 데이터 사용)
   */
  private buildSingleMatchHistoryFromBulkData(
    match: Match,
    userId: number,
    categoryName: string,
    rounds: Array<{ answers: Array<{ userId: number; score: number; answerStatus: string }> }>,
  ): MatchHistoryItemDto {
    const correctCount = this.countCorrectAnswersFromRounds(rounds, userId);
    const expGained = correctCount * 10;

    return {
      type: 'single',
      match: {
        category: { name: categoryName },
        expGained,
        playedAt: match.createdAt,
      },
    };
  }

  /**
   * Rounds 데이터에서 점수 계산
   */
  private calculateScoresFromRounds(
    rounds: Array<{ answers: Array<{ userId: number; score: number; answerStatus: string }> }>,
    userId: number,
  ): { myScore: number; opponentScore: number } {
    let myScore = 0;
    let opponentScore = 0;

    for (const round of rounds) {
      for (const answer of round.answers ?? []) {
        if (Number(answer.userId) === userId) {
          myScore += answer.score ?? 0;
        } else {
          opponentScore += answer.score ?? 0;
        }
      }
    }

    return { myScore, opponentScore };
  }

  /**
   * Rounds 데이터에서 정답 개수 카운트
   */
  private countCorrectAnswersFromRounds(
    rounds: Array<{ answers: Array<{ userId: number; score: number; answerStatus: string }> }>,
    userId: number,
  ): number {
    let count = 0;

    for (const round of rounds) {
      for (const answer of round.answers ?? []) {
        if (Number(answer.userId) === userId && answer.answerStatus === 'correct') {
          count++;
        }
      }
    }

    return count;
  }

  private buildProfile(user: User): ProfileDto {
    return {
      nickname: user.nickname,
      profileImage: user.userProfile,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  private buildRank(tierPoint: number): RankDto {
    return {
      tier: calculateTier(tierPoint),
      tierPoint,
    };
  }

  private buildMatchStats(stats: UserStatistics | null): MatchStatsDto {
    const totalMatches = stats?.totalMatches ?? 0;
    const winCount = stats?.winCount ?? 0;
    const loseCount = stats?.loseCount ?? 0;
    const drawCount = Math.max(0, totalMatches - winCount - loseCount);
    const winRate = totalMatches > 0 ? Math.round((winCount / totalMatches) * 1000) / 10 : 0;

    return {
      totalMatches,
      winCount,
      loseCount,
      drawCount,
      winRate,
    };
  }

  private async buildProblemStats(userId: number): Promise<ProblemStatsDto> {
    const result = await this.userProblemBankRepository
      .createQueryBuilder('upb')
      .select('COUNT(*)', 'totalSolved')
      .addSelect("SUM(CASE WHEN upb.answer_status = 'correct' THEN 1 ELSE 0 END)", 'correctCount')
      .addSelect(
        "SUM(CASE WHEN upb.answer_status = 'incorrect' THEN 1 ELSE 0 END)",
        'incorrectCount',
      )
      .addSelect("SUM(CASE WHEN upb.answer_status = 'partial' THEN 1 ELSE 0 END)", 'partialCount')
      .where('upb.user_id = :userId', { userId })
      .getRawOne<ProblemStatsRaw>();

    const totalSolved = Number(result?.totalSolved ?? 0);
    const correctCount = Number(result?.correctCount ?? 0);
    const incorrectCount = Number(result?.incorrectCount ?? 0);
    const partialCount = Number(result?.partialCount ?? 0);
    const correctRate = totalSolved > 0 ? Math.round((correctCount / totalSolved) * 1000) / 10 : 0;

    return {
      totalSolved,
      correctCount,
      incorrectCount,
      partialCount,
      correctRate,
    };
  }
}
