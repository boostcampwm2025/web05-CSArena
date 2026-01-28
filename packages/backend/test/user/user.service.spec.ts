import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { UserService } from '../../src/user/user.service';
import { User } from '../../src/user/entity';
import { UserProblemBank } from '../../src/problem-bank/entity';
import { UserTierHistory } from '../../src/tier/entity/user-tier-history.entity';
import { Match } from '../../src/match/entity/match.entity';

describe('UserService', () => {
  let service: UserService;

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockUserProblemBankRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockUserTierHistoryRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockMatchRepository = {
    find: jest.fn(),
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
          provide: getRepositoryToken(UserProblemBank),
          useValue: mockUserProblemBankRepository,
        },
        {
          provide: getRepositoryToken(UserTierHistory),
          useValue: mockUserTierHistoryRepository,
        },
        {
          provide: getRepositoryToken(Match),
          useValue: mockMatchRepository,
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

      mockUserProblemBankRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalSolved: '250',
          correctCount: '180',
          incorrectCount: '50',
          partialCount: '20',
        }),
      });

      const result = await service.getMyPageData(userId);

      expect(result.profile).toEqual({
        nickname: 'testuser',
        profileImage: 'https://avatars.githubusercontent.com/u/123',
        email: 'test@example.com',
        createdAt: mockCreatedAt,
      });
    });

    it('티어 정보를 정확하게 반환해야 함', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      mockUserProblemBankRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalSolved: '0',
          correctCount: '0',
          incorrectCount: '0',
          partialCount: '0',
        }),
      });

      const result = await service.getMyPageData(userId);

      expect(result.rank.tier).toBe('silver');
      expect(result.rank.tierPoint).toBe(1250);
    });

    it('레벨 정보를 정확하게 계산해야 함', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      mockUserProblemBankRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalSolved: '0',
          correctCount: '0',
          incorrectCount: '0',
          partialCount: '0',
        }),
      });

      const result = await service.getMyPageData(userId);

      expect(result.levelInfo).toEqual({
        level: 9,
        remainedExpPoint: 600,
        needExpPoint: 900,
      });
    });

    it('매치 통계를 정확하게 계산해야 함', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      mockUserProblemBankRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalSolved: '0',
          correctCount: '0',
          incorrectCount: '0',
          partialCount: '0',
        }),
      });

      const result = await service.getMyPageData(userId);

      expect(result.matchStats).toEqual({
        totalMatches: 100,
        winCount: 60,
        loseCount: 40,
        drawCount: 0,
        winRate: 60,
      });
    });

    it('문제 풀이 통계를 정확하게 계산해야 함', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      mockUserProblemBankRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalSolved: '250',
          correctCount: '180',
          incorrectCount: '50',
          partialCount: '20',
        }),
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

      mockUserProblemBankRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalSolved: '0',
          correctCount: '0',
          incorrectCount: '0',
          partialCount: '0',
        }),
      });

      const result = await service.getMyPageData(userId);

      expect(result.rank.tierPoint).toBe(0);
      expect(result.rank.tier).toBe('bronze');
      expect(result.levelInfo.level).toBe(1);
      expect(result.matchStats.totalMatches).toBe(0);
    });
  });

  describe('getTierHistory', () => {
    it('티어 히스토리를 반환해야 함', async () => {
      const mockHistories = [
        {
          id: 1,
          userId: 1,
          tierPoint: 1250,
          tierChange: 25,
          updatedAt: new Date('2025-01-15T10:30:00Z'),
          tier: { name: 'gold' },
        },
        {
          id: 2,
          userId: 1,
          tierPoint: 1200,
          tierChange: -15,
          updatedAt: new Date('2025-01-14T10:30:00Z'),
          tier: { name: 'gold' },
        },
      ];

      mockUserTierHistoryRepository.find.mockResolvedValue(mockHistories);

      const result = await service.getTierHistory(1);

      expect(result.tierHistory).toHaveLength(2);
      expect(result.tierHistory[0].tier).toBe('gold');
      expect(result.tierHistory[0].tierPoint).toBe(1250);
      expect(result.tierHistory[0].tierChange).toBe(25);
      expect(result.tierHistory[1].tierChange).toBe(-15);
    });

    it('티어 정보가 없으면 tierPoint로 계산해야 함', async () => {
      const mockHistories = [
        {
          id: 1,
          userId: 1,
          tierPoint: 1500,
          tierChange: null,
          updatedAt: new Date('2025-01-15T10:30:00Z'),
          tier: null,
        },
      ];

      mockUserTierHistoryRepository.find.mockResolvedValue(mockHistories);

      const result = await service.getTierHistory(1);

      expect(result.tierHistory[0].tier).toBe('gold');
      expect(result.tierHistory[0].tierChange).toBeNull();
    });
  });

  describe('getMatchHistory', () => {
    it('멀티플레이 매치 히스토리를 반환해야 함', async () => {
      const mockMatches = [
        {
          id: 1,
          player1Id: 1,
          player2Id: 2,
          winnerId: 1,
          matchType: 'multi',
          createdAt: new Date('2025-01-15T10:30:00Z'),
          player1: { nickname: 'player1', userProfile: null },
          player2: { nickname: 'opponent', userProfile: 'http://example.com/avatar.png' },
          rounds: [
            {
              answers: [
                { userId: 1, score: 100, answerStatus: 'correct' },
                { userId: 2, score: 80, answerStatus: 'correct' },
              ],
            },
          ],
        },
      ];

      const mockTierHistory = {
        tierChange: 25,
      };

      mockMatchRepository.find.mockResolvedValue(mockMatches);
      mockUserTierHistoryRepository.findOne.mockResolvedValue(mockTierHistory);

      const result = await service.getMatchHistory(1);

      expect(result.matchHistory).toHaveLength(1);
      expect(result.matchHistory[0].type).toBe('multi');
      expect(result.matchHistory[0].match).toHaveProperty('result', 'win');
      expect(result.matchHistory[0].match).toHaveProperty('myScore', 100);
      expect(result.matchHistory[0].match).toHaveProperty('opponentScore', 80);
      expect(result.matchHistory[0].match).toHaveProperty('tierPointChange', 25);
    });

    it('싱글플레이 매치 히스토리를 반환해야 함', async () => {
      const mockMatches = [
        {
          id: 2,
          player1Id: 1,
          player2Id: null,
          winnerId: null,
          matchType: 'single',
          createdAt: new Date('2025-01-15T11:00:00Z'),
          player1: { nickname: 'player1', userProfile: null },
          player2: null,
          rounds: [
            {
              question: {
                categoryQuestions: [
                  {
                    category: {
                      name: 'HTTP',
                      parent: { name: '네트워크' },
                    },
                  },
                ],
              },
              answers: [{ userId: 1, score: 100, answerStatus: 'correct' }],
            },
          ],
        },
      ];

      mockMatchRepository.find.mockResolvedValue(mockMatches);

      const result = await service.getMatchHistory(1);

      expect(result.matchHistory).toHaveLength(1);
      expect(result.matchHistory[0].type).toBe('single');
      expect(result.matchHistory[0].match).toHaveProperty('category');
      expect((result.matchHistory[0].match as { category: { name: string } }).category.name).toBe(
        '네트워크',
      );
      expect(result.matchHistory[0].match).toHaveProperty('expGained', 10);
    });

    it('무승부 결과를 정확히 반환해야 함', async () => {
      const mockMatches = [
        {
          id: 3,
          player1Id: 1,
          player2Id: 2,
          winnerId: null,
          matchType: 'multi',
          createdAt: new Date('2025-01-15T12:00:00Z'),
          player1: { nickname: 'player1', userProfile: null },
          player2: { nickname: 'opponent', userProfile: null },
          rounds: [],
        },
      ];

      mockMatchRepository.find.mockResolvedValue(mockMatches);
      mockUserTierHistoryRepository.findOne.mockResolvedValue(null);

      const result = await service.getMatchHistory(1);

      expect(result.matchHistory[0].type).toBe('multi');
      expect(result.matchHistory[0].match).toHaveProperty('result', 'draw');
    });
  });
});
