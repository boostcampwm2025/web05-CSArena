import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { LeaderboardService } from '../../src/leaderboard/leaderboard.service';
import { UserStatistics } from '../../src/user/entity/user-statistics.entity';
import { MatchType } from '../../src/leaderboard/dto/leaderboard-query.dto';
import {
  MultiLeaderboardResponseDto,
  SingleLeaderboardResponseDto,
} from '../../src/leaderboard/dto/leaderboard-response.dto';

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let mockUserStatisticsRepository: any;

  const createMockQueryBuilder = (overrides = {}) => ({
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(null),
    getRawOne: jest.fn().mockResolvedValue(null),
    getCount: jest.fn().mockResolvedValue(0),
    getRawMany: jest.fn().mockResolvedValue([]),
    ...overrides,
  });

  beforeEach(async () => {
    mockUserStatisticsRepository = {
      createQueryBuilder: jest.fn(),
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        {
          provide: getRepositoryToken(UserStatistics),
          useValue: mockUserStatisticsRepository,
        },
      ],
    }).compile();

    service = module.get<LeaderboardService>(LeaderboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Multi 모드 리더보드', () => {
    const setupMultiMocks = (rankings: any[], myStats: any, myRank = 1) => {
      const rankingsQB = createMockQueryBuilder({
        getRawMany: jest.fn().mockResolvedValue(rankings),
      });
      const myStatsQB = createMockQueryBuilder({
        getRawOne: jest.fn().mockResolvedValue(myStats),
      });

      mockUserStatisticsRepository.createQueryBuilder
        .mockReturnValueOnce(rankingsQB)
        .mockReturnValueOnce(myStatsQB);

      mockUserStatisticsRepository.query.mockResolvedValue([{ rank: String(myRank) }]);
    };

    it('랭킹 목록과 내 순위를 반환한다', async () => {
      const rankings = [
        {
          nickname: 'user1',
          userProfile: 'http://example.com/1.jpg',
          tierPoint: '2500',
          winCount: '50',
          loseCount: '10',
          tier: 'diamond',
        },
        {
          nickname: 'user2',
          userProfile: null,
          tierPoint: '2000',
          winCount: '40',
          loseCount: '15',
          tier: 'platinum',
        },
      ];
      const myStats = {
        nickname: 'testUser',
        userProfile: null,
        tierPoint: '1500',
        winCount: '20',
        loseCount: '10',
        tier: 'gold',
      };

      setupMultiMocks(rankings, myStats, 6);

      const result = (await service.getLeaderboard(
        MatchType.MULTI,
        1,
      )) as MultiLeaderboardResponseDto;

      expect(result.rankings).toHaveLength(2);
      expect(result.rankings[0].rank).toBe(1);
      expect(result.rankings[0].tierPoint).toBe(2500);
      expect(result.rankings[0].tier).toBe('diamond');
      expect(result.rankings[1].rank).toBe(2);
      expect(result.myRanking.rank).toBe(6);
      expect(result.myRanking.tierPoint).toBe(1500);
      expect(result.myRanking.tier).toBe('gold');
    });

    it('tierPoint가 가장 높으면 1등을 반환한다', async () => {
      const rankings = [
        {
          nickname: 'topUser',
          userProfile: null,
          tierPoint: '3000',
          winCount: '100',
          loseCount: '5',
          tier: 'diamond',
        },
      ];
      const myStats = {
        nickname: 'topUser',
        userProfile: null,
        tierPoint: '3000',
        winCount: '100',
        loseCount: '5',
        tier: 'diamond',
      };

      setupMultiMocks(rankings, myStats, 1);

      const result = (await service.getLeaderboard(
        MatchType.MULTI,
        1,
      )) as MultiLeaderboardResponseDto;

      expect(result.rankings[0].rank).toBe(1);
      expect(result.myRanking.rank).toBe(1);
    });

    it('동점자는 같은 rank를 가진다 (tierPoint, 승률, 플레이 수 모두 동일)', async () => {
      const rankings = [
        {
          nickname: 'user1',
          userProfile: null,
          tierPoint: '1000',
          winCount: '10',
          loseCount: '10',
          tier: 'silver',
        },
        {
          nickname: 'user2',
          userProfile: null,
          tierPoint: '1000',
          winCount: '10',
          loseCount: '10',
          tier: 'silver',
        },
        {
          nickname: 'user3',
          userProfile: null,
          tierPoint: '1000',
          winCount: '10',
          loseCount: '10',
          tier: 'silver',
        },
      ];
      const myStats = {
        nickname: 'user1',
        userProfile: null,
        tierPoint: '1000',
        winCount: '10',
        loseCount: '10',
        tier: 'silver',
      };

      setupMultiMocks(rankings, myStats, 1);

      const result = (await service.getLeaderboard(
        MatchType.MULTI,
        1,
      )) as MultiLeaderboardResponseDto;

      expect(result.rankings[0].rank).toBe(1);
      expect(result.rankings[1].rank).toBe(1);
      expect(result.rankings[2].rank).toBe(1);
    });

    it('tierPoint가 같아도 승률이 다르면 다른 rank를 가진다', async () => {
      const rankings = [
        {
          nickname: 'user1',
          userProfile: null,
          tierPoint: '1000',
          winCount: '8',
          loseCount: '2',
          tier: 'silver',
        }, // 80%
        {
          nickname: 'user2',
          userProfile: null,
          tierPoint: '1000',
          winCount: '6',
          loseCount: '4',
          tier: 'silver',
        }, // 60%
      ];
      const myStats = {
        nickname: 'user2',
        userProfile: null,
        tierPoint: '1000',
        winCount: '6',
        loseCount: '4',
        tier: 'silver',
      };

      setupMultiMocks(rankings, myStats, 2);

      const result = (await service.getLeaderboard(
        MatchType.MULTI,
        1,
      )) as MultiLeaderboardResponseDto;

      expect(result.rankings[0].rank).toBe(1);
      expect(result.rankings[1].rank).toBe(2);
    });

    it('tierPoint와 승률이 같아도 플레이 수가 다르면 다른 rank를 가진다', async () => {
      const rankings = [
        {
          nickname: 'user1',
          userProfile: null,
          tierPoint: '1000',
          winCount: '10',
          loseCount: '10',
          tier: 'silver',
        }, // 50%, 20판
        {
          nickname: 'user2',
          userProfile: null,
          tierPoint: '1000',
          winCount: '5',
          loseCount: '5',
          tier: 'silver',
        }, // 50%, 10판
      ];
      const myStats = {
        nickname: 'user2',
        userProfile: null,
        tierPoint: '1000',
        winCount: '5',
        loseCount: '5',
        tier: 'silver',
      };

      setupMultiMocks(rankings, myStats, 2);

      const result = (await service.getLeaderboard(
        MatchType.MULTI,
        1,
      )) as MultiLeaderboardResponseDto;

      expect(result.rankings[0].rank).toBe(1);
      expect(result.rankings[1].rank).toBe(2);
    });

    it('내 통계 정보가 없으면 NotFoundException을 던진다', async () => {
      const rankings = [
        {
          nickname: 'user1',
          userProfile: null,
          tierPoint: '2500',
          winCount: '50',
          loseCount: '10',
          tier: 'diamond',
        },
      ];

      setupMultiMocks(rankings, null, 0);

      await expect(service.getLeaderboard(MatchType.MULTI, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('Single 모드 리더보드', () => {
    const setupSingleMocks = (rankings: any[], myStats: any, myRank = 1) => {
      const rankingsQB = createMockQueryBuilder({
        getRawMany: jest.fn().mockResolvedValue(rankings),
      });
      const myStatsQB = createMockQueryBuilder({
        getRawOne: jest.fn().mockResolvedValue(myStats),
      });

      mockUserStatisticsRepository.createQueryBuilder
        .mockReturnValueOnce(rankingsQB)
        .mockReturnValueOnce(myStatsQB);

      mockUserStatisticsRepository.query.mockResolvedValue([{ rank: String(myRank) }]);
    };

    it('랭킹 목록과 내 순위를 반환한다', async () => {
      const rankings = [
        {
          nickname: 'user1',
          userProfile: null,
          expPoint: '15000',
          solvedCount: '100',
          correctCount: '85',
        },
        {
          nickname: 'user2',
          userProfile: null,
          expPoint: '12000',
          solvedCount: '80',
          correctCount: '60',
        },
      ];
      const myStats = {
        nickname: 'testUser',
        userProfile: null,
        expPoint: '8000',
        solvedCount: '50',
        correctCount: '40',
      };

      setupSingleMocks(rankings, myStats, 3);

      const result = (await service.getLeaderboard(
        MatchType.SINGLE,
        1,
      )) as SingleLeaderboardResponseDto;

      expect(result.rankings).toHaveLength(2);
      expect(result.rankings[0].rank).toBe(1);
      expect(result.rankings[0].expPoint).toBe(15000);
      expect(result.rankings[0].level).toBe(17);
      expect(result.rankings[0].solvedCount).toBe(100);
      expect(result.rankings[1].rank).toBe(2);
      expect(result.myRanking.rank).toBe(3);
      expect(result.myRanking.level).toBe(13);
    });

    it('동점자는 같은 rank를 가진다 (expPoint, 정답률, 푼 문제 수 모두 동일)', async () => {
      const rankings = [
        {
          nickname: 'user1',
          userProfile: null,
          expPoint: '1000',
          solvedCount: '10',
          correctCount: '8',
        },
        {
          nickname: 'user2',
          userProfile: null,
          expPoint: '1000',
          solvedCount: '10',
          correctCount: '8',
        },
        {
          nickname: 'user3',
          userProfile: null,
          expPoint: '1000',
          solvedCount: '10',
          correctCount: '8',
        },
      ];
      const myStats = {
        nickname: 'user1',
        userProfile: null,
        expPoint: '1000',
        solvedCount: '10',
        correctCount: '8',
      };

      setupSingleMocks(rankings, myStats, 1);

      const result = (await service.getLeaderboard(
        MatchType.SINGLE,
        1,
      )) as SingleLeaderboardResponseDto;

      expect(result.rankings[0].rank).toBe(1);
      expect(result.rankings[1].rank).toBe(1);
      expect(result.rankings[2].rank).toBe(1);
    });

    it('expPoint가 같아도 정답률이 다르면 다른 rank를 가진다', async () => {
      const rankings = [
        {
          nickname: 'user1',
          userProfile: null,
          expPoint: '1000',
          solvedCount: '10',
          correctCount: '9',
        }, // 90%
        {
          nickname: 'user2',
          userProfile: null,
          expPoint: '1000',
          solvedCount: '10',
          correctCount: '7',
        }, // 70%
      ];
      const myStats = {
        nickname: 'user2',
        userProfile: null,
        expPoint: '1000',
        solvedCount: '10',
        correctCount: '7',
      };

      setupSingleMocks(rankings, myStats, 2);

      const result = (await service.getLeaderboard(
        MatchType.SINGLE,
        1,
      )) as SingleLeaderboardResponseDto;

      expect(result.rankings[0].rank).toBe(1);
      expect(result.rankings[1].rank).toBe(2);
    });

    it('expPoint와 정답률이 같아도 푼 문제 수가 다르면 다른 rank를 가진다', async () => {
      const rankings = [
        {
          nickname: 'user1',
          userProfile: null,
          expPoint: '1000',
          solvedCount: '20',
          correctCount: '16',
        }, // 80%, 20문제
        {
          nickname: 'user2',
          userProfile: null,
          expPoint: '1000',
          solvedCount: '10',
          correctCount: '8',
        }, // 80%, 10문제
      ];
      const myStats = {
        nickname: 'user2',
        userProfile: null,
        expPoint: '1000',
        solvedCount: '10',
        correctCount: '8',
      };

      setupSingleMocks(rankings, myStats, 2);

      const result = (await service.getLeaderboard(
        MatchType.SINGLE,
        1,
      )) as SingleLeaderboardResponseDto;

      expect(result.rankings[0].rank).toBe(1);
      expect(result.rankings[1].rank).toBe(2);
    });

    it('푼 문제가 없으면 solvedCount와 correctCount는 0을 반환한다', async () => {
      const rankings = [
        {
          nickname: 'user1',
          userProfile: null,
          expPoint: '100',
          solvedCount: '0',
          correctCount: '0',
        },
      ];
      const myStats = {
        nickname: 'testUser',
        userProfile: null,
        expPoint: '100',
        solvedCount: '0',
        correctCount: '0',
      };

      setupSingleMocks(rankings, myStats, 1);

      const result = (await service.getLeaderboard(
        MatchType.SINGLE,
        1,
      )) as SingleLeaderboardResponseDto;

      expect(result.rankings[0].solvedCount).toBe(0);
      expect(result.rankings[0].correctCount).toBe(0);
      expect(result.myRanking.solvedCount).toBe(0);
    });

    it('내 통계 정보가 없으면 NotFoundException을 던진다', async () => {
      const rankings = [
        {
          nickname: 'user1',
          userProfile: null,
          expPoint: '15000',
          solvedCount: '100',
          correctCount: '85',
        },
      ];

      setupSingleMocks(rankings, null, 0);

      await expect(service.getLeaderboard(MatchType.SINGLE, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('엣지 케이스', () => {
    it('유저가 없으면 빈 랭킹을 반환한다', async () => {
      const rankingsQB = createMockQueryBuilder({ getRawMany: jest.fn().mockResolvedValue([]) });
      const myStatsQB = createMockQueryBuilder({
        getRawOne: jest.fn().mockResolvedValue({
          nickname: 'testUser',
          userProfile: null,
          tierPoint: '1000',
          winCount: '10',
          loseCount: '5',
          tier: 'silver',
        }),
      });

      mockUserStatisticsRepository.createQueryBuilder
        .mockReturnValueOnce(rankingsQB)
        .mockReturnValueOnce(myStatsQB);

      mockUserStatisticsRepository.query.mockResolvedValue([{ rank: '1' }]);

      const result = (await service.getLeaderboard(
        MatchType.MULTI,
        1,
      )) as MultiLeaderboardResponseDto;

      expect(result.rankings).toHaveLength(0);
      expect(result.myRanking.rank).toBe(1);
    });

    it('동점자 다음 순위는 건너뛴다 (1, 1, 1, 4)', async () => {
      const rankings = [
        {
          nickname: 'user1',
          userProfile: null,
          tierPoint: '2000',
          winCount: '10',
          loseCount: '10',
          tier: 'gold',
        },
        {
          nickname: 'user2',
          userProfile: null,
          tierPoint: '2000',
          winCount: '10',
          loseCount: '10',
          tier: 'gold',
        },
        {
          nickname: 'user3',
          userProfile: null,
          tierPoint: '2000',
          winCount: '10',
          loseCount: '10',
          tier: 'gold',
        },
        {
          nickname: 'user4',
          userProfile: null,
          tierPoint: '1000',
          winCount: '5',
          loseCount: '5',
          tier: 'silver',
        },
      ];
      const myStats = {
        nickname: 'user4',
        userProfile: null,
        tierPoint: '1000',
        winCount: '5',
        loseCount: '5',
        tier: 'silver',
      };

      const rankingsQB = createMockQueryBuilder({
        getRawMany: jest.fn().mockResolvedValue(rankings),
      });
      const myStatsQB = createMockQueryBuilder({
        getRawOne: jest.fn().mockResolvedValue(myStats),
      });

      mockUserStatisticsRepository.createQueryBuilder
        .mockReturnValueOnce(rankingsQB)
        .mockReturnValueOnce(myStatsQB);

      mockUserStatisticsRepository.query.mockResolvedValue([{ rank: '4' }]);

      const result = (await service.getLeaderboard(
        MatchType.MULTI,
        1,
      )) as MultiLeaderboardResponseDto;

      expect(result.rankings[0].rank).toBe(1);
      expect(result.rankings[1].rank).toBe(1);
      expect(result.rankings[2].rank).toBe(1);
      expect(result.rankings[3].rank).toBe(4);
    });
  });
});
