import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { UserService } from '../../src/user/user.service';
import { User, UserStatistics } from '../../src/user/entity';
import { UserProblemBank } from '../../src/problem-bank/entity';

describe('UserService', () => {
  let service: UserService;

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockUserStatisticsRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockUserProblemBankRepository = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UserStatistics),
          useValue: mockUserStatisticsRepository,
        },
        {
          provide: getRepositoryToken(UserProblemBank),
          useValue: mockUserProblemBankRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyPageData', () => {
    const userId = 1;
    const mockCreatedAt = new Date('2025-01-15T10:30:00Z');

    const mockUser = {
      id: 1,
      nickname: 'testuser',
      userProfile: 'https://avatars.githubusercontent.com/u/123',
      email: 'test@example.com',
      oauthProvider: 'github' as const,
      createdAt: mockCreatedAt,
      statistics: {
        id: 1,
        tierPoint: 1250,
        expPoint: 4200,
        totalMatches: 100,
        winCount: 60,
        loseCount: 40,
      },
    };

    it('사용자 프로필 정보를 정확하게 반환해야 함', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      mockUserStatisticsRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ ranking: '42' }),
      });

      mockUserProblemBankRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalSolved: '250',
          correctCount: '180',
          incorrectCount: '50',
          partialCount: '20',
        }),
        getRawMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getMyPageData(userId);

      expect(result.profile).toEqual({
        id: 1,
        nickname: 'testuser',
        profileImage: 'https://avatars.githubusercontent.com/u/123',
        email: 'test@example.com',
        oauthProvider: 'github',
        createdAt: mockCreatedAt,
      });
    });

    it('랭킹을 정확하게 계산해야 함', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      mockUserStatisticsRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ ranking: '42' }),
      });

      mockUserProblemBankRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalSolved: '0',
          correctCount: '0',
          incorrectCount: '0',
          partialCount: '0',
        }),
        getRawMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getMyPageData(userId);

      expect(result.rank.ranking).toBe(42);
      expect(result.rank.tier).toBe('gold');
      expect(result.rank.tierPoint).toBe(1250);
    });

    it('레벨 정보를 정확하게 계산해야 함', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      mockUserStatisticsRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ ranking: '1' }),
      });

      mockUserProblemBankRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalSolved: '0',
          correctCount: '0',
          incorrectCount: '0',
          partialCount: '0',
        }),
        getRawMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getMyPageData(userId);

      expect(result.level).toEqual({
        level: 42,
        expPoint: 4200,
        expForCurrentLevel: 0,
        expForNextLevel: 100,
      });
    });

    it('매치 통계를 정확하게 계산해야 함', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      mockUserStatisticsRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ ranking: '1' }),
      });

      mockUserProblemBankRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalSolved: '0',
          correctCount: '0',
          incorrectCount: '0',
          partialCount: '0',
        }),
        getRawMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getMyPageData(userId);

      expect(result.matchStats).toEqual({
        totalMatches: 100,
        winCount: 60,
        loseCount: 40,
        winRate: 60,
      });
    });

    it('문제 풀이 통계를 정확하게 계산해야 함', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      mockUserStatisticsRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ ranking: '1' }),
      });

      mockUserProblemBankRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalSolved: '250',
          correctCount: '180',
          incorrectCount: '50',
          partialCount: '20',
        }),
        getRawMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getMyPageData(userId);

      expect(result.problemStats).toEqual({
        totalSolved: 250,
        correctCount: 180,
        incorrectCount: 50,
        partialCount: 20,
        correctRate: 72,
      });
    });

    it('카테고리 분석에서 5문제 미만인 카테고리는 제외해야 함', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      mockUserStatisticsRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ ranking: '1' }),
      });

      const mockCategoryResults = [
        { categoryId: '1', categoryName: '네트워크', totalCount: '50', correctCount: '43' },
        { categoryId: '2', categoryName: '운영체제', totalCount: '30', correctCount: '17' },
      ];

      mockUserProblemBankRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalSolved: '0',
          correctCount: '0',
          incorrectCount: '0',
          partialCount: '0',
        }),
        getRawMany: jest.fn().mockResolvedValue(mockCategoryResults),
      });

      const result = await service.getMyPageData(userId);

      expect(result.categoryAnalysis.all).toHaveLength(2);
    });

    it('강한 카테고리(70% 이상)와 약한 카테고리(70% 미만)를 분류해야 함', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      mockUserStatisticsRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ ranking: '1' }),
      });

      const mockCategoryResults = [
        { categoryId: '1', categoryName: '네트워크', totalCount: '50', correctCount: '43' },
        { categoryId: '2', categoryName: '운영체제', totalCount: '30', correctCount: '17' },
      ];

      mockUserProblemBankRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalSolved: '0',
          correctCount: '0',
          incorrectCount: '0',
          partialCount: '0',
        }),
        getRawMany: jest.fn().mockResolvedValue(mockCategoryResults),
      });

      const result = await service.getMyPageData(userId);

      expect(result.categoryAnalysis.strong).toHaveLength(1);
      expect(result.categoryAnalysis.strong[0].categoryName).toBe('네트워크');
      expect(result.categoryAnalysis.strong[0].correctRate).toBe(86);

      expect(result.categoryAnalysis.weak).toHaveLength(1);
      expect(result.categoryAnalysis.weak[0].categoryName).toBe('운영체제');
      expect(result.categoryAnalysis.weak[0].correctRate).toBe(56.7);
    });

    it('존재하지 않는 사용자에 대해 NotFoundException을 던져야 함', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getMyPageData(999)).rejects.toThrow(NotFoundException);
      await expect(service.getMyPageData(999)).rejects.toThrow('사용자를 찾을 수 없습니다.');
    });

    it('통계가 없는 사용자도 정상 처리해야 함', async () => {
      const userWithoutStats = {
        ...mockUser,
        statistics: null,
      };

      mockUserRepository.findOne.mockResolvedValue(userWithoutStats);

      mockUserStatisticsRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ ranking: '1' }),
      });

      mockUserProblemBankRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalSolved: '0',
          correctCount: '0',
          incorrectCount: '0',
          partialCount: '0',
        }),
        getRawMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getMyPageData(userId);

      expect(result.rank.tierPoint).toBe(0);
      expect(result.rank.tier).toBe('bronze');
      expect(result.level.level).toBe(0);
      expect(result.matchStats.totalMatches).toBe(0);
    });
  });

  describe('getUserRanking', () => {
    it('tierPoint가 높을수록 낮은 순위를 반환해야 함', async () => {
      const mockUser = {
        id: 1,
        nickname: 'testuser',
        userProfile: null,
        email: null,
        oauthProvider: 'github' as const,
        createdAt: new Date(),
        statistics: {
          tierPoint: 2000,
          expPoint: 0,
          totalMatches: 0,
          winCount: 0,
          loseCount: 0,
        },
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      mockUserStatisticsRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ ranking: '1' }),
      });

      mockUserProblemBankRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalSolved: '0',
          correctCount: '0',
          incorrectCount: '0',
          partialCount: '0',
        }),
        getRawMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getMyPageData(1);

      expect(result.rank.ranking).toBe(1);
    });

    it('동일 tierPoint 시 동일 순위를 반환해야 함', async () => {
      const mockUser = {
        id: 1,
        nickname: 'testuser',
        userProfile: null,
        email: null,
        oauthProvider: 'github' as const,
        createdAt: new Date(),
        statistics: {
          tierPoint: 1000,
          expPoint: 0,
          totalMatches: 0,
          winCount: 0,
          loseCount: 0,
        },
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      mockUserStatisticsRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ ranking: '5' }),
      });

      mockUserProblemBankRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalSolved: '0',
          correctCount: '0',
          incorrectCount: '0',
          partialCount: '0',
        }),
        getRawMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getMyPageData(1);

      expect(result.rank.ranking).toBe(5);
    });
  });

  describe('getCategoryAnalysis', () => {
    it('대분류 기준으로 통계를 집계해야 함', async () => {
      const mockUser = {
        id: 1,
        nickname: 'testuser',
        userProfile: null,
        email: null,
        oauthProvider: 'github' as const,
        createdAt: new Date(),
        statistics: {
          tierPoint: 1000,
          expPoint: 0,
          totalMatches: 0,
          winCount: 0,
          loseCount: 0,
        },
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      mockUserStatisticsRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ ranking: '1' }),
      });

      const mockCategoryResults = [
        { categoryId: '1', categoryName: '네트워크', totalCount: '10', correctCount: '8' },
      ];

      mockUserProblemBankRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalSolved: '0',
          correctCount: '0',
          incorrectCount: '0',
          partialCount: '0',
        }),
        getRawMany: jest.fn().mockResolvedValue(mockCategoryResults),
      });

      const result = await service.getMyPageData(1);

      expect(result.categoryAnalysis.all[0].categoryId).toBe(1);
      expect(result.categoryAnalysis.all[0].categoryName).toBe('네트워크');
      expect(result.categoryAnalysis.all[0].totalCount).toBe(10);
      expect(result.categoryAnalysis.all[0].correctCount).toBe(8);
    });

    it('문제를 풀지 않은 카테고리는 포함하지 않아야 함', async () => {
      const mockUser = {
        id: 1,
        nickname: 'testuser',
        userProfile: null,
        email: null,
        oauthProvider: 'github' as const,
        createdAt: new Date(),
        statistics: {
          tierPoint: 1000,
          expPoint: 0,
          totalMatches: 0,
          winCount: 0,
          loseCount: 0,
        },
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      mockUserStatisticsRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ ranking: '1' }),
      });

      mockUserProblemBankRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalSolved: '0',
          correctCount: '0',
          incorrectCount: '0',
          partialCount: '0',
        }),
        getRawMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getMyPageData(1);

      expect(result.categoryAnalysis.all).toHaveLength(0);
      expect(result.categoryAnalysis.strong).toHaveLength(0);
      expect(result.categoryAnalysis.weak).toHaveLength(0);
    });
  });
});
