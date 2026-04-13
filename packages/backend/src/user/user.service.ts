import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User, UserStatistics } from './entity';
import { UserProblemBank } from '../problem-bank/entity';
import { UserTierHistory } from '../tier/entity';
import { Match } from '../match/entity';
import {
  MatchStatsDto,
  MyPageResponseDto,
  ProblemStatsDto,
  ProfileDto,
  RankDto,
} from './dto/mypage-response.dto';
import { TierHistoryResponseDto } from './dto/tier-history-response.dto';
import { MatchHistoryItemDto, MatchHistoryResponseDto } from './dto/match-history-response.dto';
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

  async getMatchHistory(userId: number): Promise<MatchHistoryResponseDto> {
    // 매치 ID만 조회 (JOIN 없이, DISTINCT 없이)
    const matchIdRows = await this.matchRepository
      .createQueryBuilder('match')
      .select('match.id')
      .where('match.player1Id = :userId OR match.player2Id = :userId', { userId })
      .orderBy('match.createdAt', 'DESC')
      .limit(10)
      .getRawMany();

    const matchIds = matchIdRows.map((r: unknown) => (r as { match_id: number }).match_id);

    if (matchIds.length === 0) {
      return { matchHistory: [] };
    }

    // Steprounds 체인 로딩 (problemBanks 없음 → 카테시안 곱 방지)
    // take 없음 → TypeORM DISTINCT 서브쿼리 미생성
    const matches = await this.matchRepository.find({
      where: { id: In(matchIds) },
      relations: [
        'player1',
        'player2',
        'rounds',
        'rounds.answers',
        'rounds.question',
        'rounds.question.categoryQuestions',
        'rounds.question.categoryQuestions.category',
        'rounds.question.categoryQuestions.category.parent',
      ],
      order: { createdAt: 'DESC' },
    });

    // problemBanks 별도 로딩 (single 매치의 카테고리 fallback용)
    const singleMatchIds = matches.filter((m) => m.matchType === 'single').map((m) => Number(m.id));

    if (singleMatchIds.length > 0) {
      const problemBanks = await this.userProblemBankRepository.find({
        where: { matchId: In(singleMatchIds) },
        relations: [
          'question',
          'question.categoryQuestions',
          'question.categoryQuestions.category',
          'question.categoryQuestions.category.parent',
        ],
      });

      // 매치에 problemBanks 수동 매핑
      const pbByMatchId = new Map<number, UserProblemBank[]>();

      for (const pb of problemBanks) {
        const mid = Number(pb.matchId);
        const list = pbByMatchId.get(mid) ?? [];
        list.push(pb);
        pbByMatchId.set(mid, list);
      }

      for (const match of matches) {
        if (match.matchType === 'single') {
          match.problemBanks = pbByMatchId.get(Number(match.id)) ?? [];
        }
      }
    }

    const matchHistory = await Promise.all(
      matches.map((match) =>
        match.matchType === 'multi'
          ? this.buildMultiMatchHistory(match, userId)
          : Promise.resolve(this.buildSingleMatchHistory(match, userId)),
      ),
    );

    return { matchHistory };
  }

  private async buildMultiMatchHistory(match: Match, userId: number): Promise<MatchHistoryItemDto> {
    const isPlayer1 = Number(match.player1Id) === userId;
    const opponent = isPlayer1 ? match.player2 : match.player1;

    const { myScore, opponentScore } = this.calculateScores(match, userId);

    const result =
      match.winnerId === null ? 'draw' : Number(match.winnerId) === userId ? 'win' : 'lose';

    const tierHistory = await this.userTierHistoryRepository.findOne({
      where: { userId, matchId: Number(match.id) },
    });
    const tierPointChange = tierHistory?.tierChange ?? 0;

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

  private buildSingleMatchHistory(match: Match, userId: number): MatchHistoryItemDto {
    const firstQuestion = match.rounds?.[0]?.question || match.problemBanks?.[0]?.question;
    const category = firstQuestion?.categoryQuestions?.[0]?.category;
    const categoryName = category?.parent?.name ?? category?.name ?? 'Unknown';

    const correctCount = this.countCorrectAnswers(match, userId);
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

  private calculateScores(
    match: Match,
    userId: number,
  ): { myScore: number; opponentScore: number } {
    let myScore = 0;
    let opponentScore = 0;

    for (const round of match.rounds ?? []) {
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

  private countCorrectAnswers(match: Match, userId: number): number {
    let count = 0;

    for (const round of match.rounds ?? []) {
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
