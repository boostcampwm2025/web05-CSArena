import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserStatistics } from '../user/entity/user-statistics.entity';
import { Tier } from '../tier/entity/tier.entity';
import { MatchType } from './dto/leaderboard-query.dto';
import { calcLevel } from '../common/utils/level.util';
import {
  MultiLeaderboardResponseDto,
  MultiMyRankingDto,
  MultiRankingItemDto,
  SingleLeaderboardResponseDto,
  SingleMyRankingDto,
  SingleRankingItemDto,
} from './dto/leaderboard-response.dto';

const LEADERBOARD_LIMIT = 100;

interface MultiRankingRaw {
  nickname: string;
  userProfile: string | null;
  tierPoint: string;
  winCount: string;
  loseCount: string;
  tier: string;
}

interface SingleRankingRaw {
  nickname: string;
  userProfile: string | null;
  expPoint: string;
  solvedCount: string;
  correctCount: string;
}

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(UserStatistics)
    private readonly userStatisticsRepository: Repository<UserStatistics>,
    private readonly dataSource: DataSource,
  ) {}

  async getLeaderboard(
    type: MatchType,
    userId: number,
  ): Promise<MultiLeaderboardResponseDto | SingleLeaderboardResponseDto> {
    if (type === MatchType.MULTI) {
      return this.getMultiLeaderboard(userId);
    }

    return this.getSingleLeaderboard(userId);
  }

  private async getMultiLeaderboard(userId: number): Promise<MultiLeaderboardResponseDto> {
    const rankings = await this.getMultiRankings();
    const myRanking = await this.getMultiMyRanking(userId);

    return { rankings, myRanking };
  }

  private async getMultiRankings(): Promise<MultiRankingItemDto[]> {
    const results = await this.userStatisticsRepository
      .createQueryBuilder('us')
      .innerJoin('us.user', 'u')
      .innerJoin(
        Tier,
        't',
        't.minPoints <= us.tierPoint AND (t.maxPoints >= us.tierPoint OR t.maxPoints IS NULL)',
      )
      .select([
        'u.nickname AS nickname',
        'u.userProfile AS "userProfile"',
        'us.tierPoint AS "tierPoint"',
        'us.winCount AS "winCount"',
        'us.loseCount AS "loseCount"',
        't.name AS tier',
      ])
      .orderBy('us.tierPoint', 'DESC')
      .addOrderBy(
        'CASE WHEN us.winCount + us.loseCount > 0 THEN us.winCount * 1.0 / (us.winCount + us.loseCount) ELSE 0 END',
        'DESC',
      )
      .addOrderBy('us.winCount + us.loseCount', 'DESC')
      .limit(LEADERBOARD_LIMIT)
      .getRawMany<MultiRankingRaw>();

    const items = results.map((item) => ({
      nickname: item.nickname,
      userProfile: item.userProfile,
      tierPoint: Number(item.tierPoint),
      winCount: Number(item.winCount),
      loseCount: Number(item.loseCount),
      tier: item.tier,
    }));

    return this.assignMultiRanks(items);
  }

  private assignMultiRanks(items: Omit<MultiRankingItemDto, 'rank'>[]): MultiRankingItemDto[] {
    const getWinRate = (item: Omit<MultiRankingItemDto, 'rank'>) => {
      const total = item.winCount + item.loseCount;

      return total > 0 ? item.winCount / total : 0;
    };

    const getTotalGames = (item: Omit<MultiRankingItemDto, 'rank'>) =>
      item.winCount + item.loseCount;

    return items.reduce<MultiRankingItemDto[]>((acc, item, idx) => {
      const prev = acc[idx - 1];
      const isSameRank =
        prev &&
        item.tierPoint === prev.tierPoint &&
        getWinRate(item) === getWinRate(prev) &&
        getTotalGames(item) === getTotalGames(prev);

      const rank = isSameRank ? prev.rank : idx + 1;

      return [...acc, { rank, ...item }];
    }, []);
  }

  private async getMultiMyRanking(userId: number): Promise<MultiMyRankingDto> {
    const myStats = await this.userStatisticsRepository
      .createQueryBuilder('us')
      .innerJoin('us.user', 'u')
      .innerJoin(
        Tier,
        't',
        't.minPoints <= us.tierPoint AND (t.maxPoints >= us.tierPoint OR t.maxPoints IS NULL)',
      )
      .select([
        'u.nickname AS nickname',
        'u.userProfile AS "userProfile"',
        'us.tierPoint AS "tierPoint"',
        'us.winCount AS "winCount"',
        'us.loseCount AS "loseCount"',
        't.name AS tier',
      ])
      .where('us.userId = :userId', { userId })
      .getRawOne<MultiRankingRaw>();

    if (!myStats) {
      throw new NotFoundException('내 랭킹 정보를 찾을 수 없습니다.');
    }

    const tierPoint = Number(myStats.tierPoint);
    const winCount = Number(myStats.winCount);
    const loseCount = Number(myStats.loseCount);

    const rankRow = await this.dataSource.query<{ rank: number }[]>(
      'SELECT rank FROM mv_multi_rank WHERE user_id = $1',
      [userId],
    );

    const rank = rankRow[0]?.rank ?? 0;

    return {
      rank,
      nickname: myStats.nickname,
      userProfile: myStats.userProfile,
      tierPoint,
      winCount,
      loseCount,
      tier: myStats.tier,
    };
  }

  private async getSingleLeaderboard(userId: number): Promise<SingleLeaderboardResponseDto> {
    const rankings = await this.getSingleRankings();
    const myRanking = await this.getSingleMyRanking(userId);

    return { rankings, myRanking };
  }

  private async getSingleRankings(): Promise<SingleRankingItemDto[]> {
    const results = await this.userStatisticsRepository
      .createQueryBuilder('us')
      .innerJoin('us.user', 'u')
      .select([
        'u.nickname AS nickname',
        'u.userProfile AS "userProfile"',
        'us.expPoint AS "expPoint"',
        'us.solvedCount AS "solvedCount"',
        'us.correctCount AS "correctCount"',
      ])
      .orderBy('us.expPoint', 'DESC')
      .addOrderBy(
        'CASE WHEN us.solvedCount > 0 THEN us.correctCount * 1.0 / us.solvedCount ELSE 0 END',
        'DESC',
      )
      .addOrderBy('us.solvedCount', 'DESC')
      .limit(LEADERBOARD_LIMIT)
      .getRawMany<SingleRankingRaw>();

    const items = results.map((item) => ({
      nickname: item.nickname,
      userProfile: item.userProfile,
      expPoint: Number(item.expPoint),
      level: calcLevel(Number(item.expPoint)).level,
      solvedCount: Number(item.solvedCount),
      correctCount: Number(item.correctCount),
    }));

    return this.assignSingleRanks(items);
  }

  private assignSingleRanks(items: Omit<SingleRankingItemDto, 'rank'>[]): SingleRankingItemDto[] {
    const getCorrectRate = (item: Omit<SingleRankingItemDto, 'rank'>) =>
      item.solvedCount > 0 ? item.correctCount / item.solvedCount : 0;

    return items.reduce<SingleRankingItemDto[]>((acc, item, idx) => {
      const prev = acc[idx - 1];
      const isSameRank =
        prev &&
        item.expPoint === prev.expPoint &&
        getCorrectRate(item) === getCorrectRate(prev) &&
        item.solvedCount === prev.solvedCount;

      const rank = isSameRank ? prev.rank : idx + 1;

      return [...acc, { rank, ...item }];
    }, []);
  }

  private async getSingleMyRanking(userId: number): Promise<SingleMyRankingDto> {
    const myStats = await this.userStatisticsRepository
      .createQueryBuilder('us')
      .innerJoin('us.user', 'u')
      .select([
        'u.nickname AS nickname',
        'u.userProfile AS "userProfile"',
        'us.expPoint AS "expPoint"',
        'us.solvedCount AS "solvedCount"',
        'us.correctCount AS "correctCount"',
      ])
      .where('us.userId = :userId', { userId })
      .getRawOne<SingleRankingRaw>();

    if (!myStats) {
      throw new NotFoundException('내 랭킹 정보를 찾을 수 없습니다.');
    }

    const expPoint = Number(myStats.expPoint);
    const solvedCount = Number(myStats.solvedCount);
    const correctCount = Number(myStats.correctCount);

    const rankRow = await this.dataSource.query<{ rank: number }[]>(
      'SELECT rank FROM mv_single_rank WHERE user_id = $1',
      [userId],
    );

    const rank = rankRow[0]?.rank ?? 0;

    return {
      rank,
      nickname: myStats.nickname,
      userProfile: myStats.userProfile,
      expPoint,
      level: calcLevel(expPoint).level,
      solvedCount,
      correctCount,
    };
  }
}
