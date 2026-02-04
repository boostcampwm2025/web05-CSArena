import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserController } from '../../src/user/user.controller';
import { UserService } from '../../src/user/user.service';
import { AuthenticatedUser } from '../../src/auth/strategies/jwt.strategy';
import { MyPageResponseDto } from '../../src/user/dto/mypage-response.dto';
import { TierHistoryResponseDto } from '../../src/user/dto/tier-history-response.dto';
import { MatchHistoryResponseDto } from '../../src/user/dto/match-history-response.dto';

describe('UserController', () => {
  let controller: UserController;

  const mockUserService = {
    getMyPageData: jest.fn(),
    getTierHistory: jest.fn(),
    getMatchHistory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /users/me', () => {
    const mockUser: AuthenticatedUser = {
      id: '1',
      visibleId: 'user-123',
      nickname: 'testuser',
      oauthProvider: 'github',
    };

    const mockMyPageResponse: MyPageResponseDto = {
      profile: {
        nickname: 'testuser',
        profileImage: 'https://avatars.githubusercontent.com/u/123',
        email: 'test@example.com',
        createdAt: new Date('2025-01-15T10:30:00Z'),
      },
      rank: {
        tier: 'gold',
        tierPoint: 1250,
      },
      levelInfo: {
        level: 42,
        remainedExpPoint: 0,
        needExpPoint: 100,
      },
      matchStats: {
        totalMatches: 100,
        winCount: 60,
        loseCount: 40,
        drawCount: 0,
        winRate: 60.0,
      },
      problemStats: {
        totalSolved: 250,
        correctCount: 180,
        incorrectCount: 50,
        partialCount: 20,
        correctRate: 72.0,
      },
    };

    it('인증된 사용자의 마이페이지 데이터를 반환해야 함', async () => {
      mockUserService.getMyPageData.mockResolvedValue(mockMyPageResponse);

      const result = await controller.getMyPage(mockUser);

      expect(result).toEqual(mockMyPageResponse);
      expect(mockUserService.getMyPageData).toHaveBeenCalledWith(1);
    });

    it('Service 에러를 전파해야 함', async () => {
      mockUserService.getMyPageData.mockRejectedValue(
        new NotFoundException('사용자를 찾을 수 없습니다.'),
      );

      await expect(controller.getMyPage(mockUser)).rejects.toThrow(NotFoundException);
      await expect(controller.getMyPage(mockUser)).rejects.toThrow('사용자를 찾을 수 없습니다.');
    });

    it('user.id를 숫자로 변환하여 Service에 전달해야 함', async () => {
      const userWithStringId: AuthenticatedUser = {
        id: '999',
        visibleId: 'user-999',
        nickname: 'testuser',
        oauthProvider: 'github',
      };

      mockUserService.getMyPageData.mockResolvedValue(mockMyPageResponse);

      await controller.getMyPage(userWithStringId);

      expect(mockUserService.getMyPageData).toHaveBeenCalledWith(999);
    });
  });

  describe('GET /users/me/tier-history', () => {
    const mockUser: AuthenticatedUser = {
      id: '1',
      visibleId: 'user-123',
      nickname: 'testuser',
      oauthProvider: 'github',
    };

    const mockTierHistoryResponse: TierHistoryResponseDto = {
      tierHistory: [
        {
          tier: 'gold',
          tierPoint: 1250,
          tierChange: 25,
          changedAt: new Date('2025-01-15T10:30:00Z'),
        },
        {
          tier: 'gold',
          tierPoint: 1200,
          tierChange: -15,
          changedAt: new Date('2025-01-14T10:30:00Z'),
        },
      ],
    };

    it('티어 히스토리를 반환해야 함', async () => {
      mockUserService.getTierHistory.mockResolvedValue(mockTierHistoryResponse);

      const result = await controller.getTierHistory(mockUser);

      expect(result).toEqual(mockTierHistoryResponse);
      expect(mockUserService.getTierHistory).toHaveBeenCalledWith(1);
    });
  });

  describe('GET /users/me/match-history', () => {
    const mockUser: AuthenticatedUser = {
      id: '1',
      visibleId: 'user-123',
      nickname: 'testuser',
      oauthProvider: 'github',
    };

    const mockMatchHistoryResponse: MatchHistoryResponseDto = {
      matchHistory: [
        {
          type: 'multi',
          match: {
            opponent: {
              nickname: 'opponent',
              profileImage: null,
            },
            result: 'win',
            myScore: 100,
            opponentScore: 80,
            tierPointChange: 25,
            playedAt: new Date('2025-01-15T10:30:00Z'),
          },
        },
        {
          type: 'single',
          match: {
            category: { name: '네트워크' },
            expGained: 30,
            playedAt: new Date('2025-01-15T11:00:00Z'),
          },
        },
      ],
      hasMore: false,
    };

    const mockQuery = {
      matchType: 'all' as const,
      limit: 10,
    };

    it('매치 히스토리를 반환해야 함', async () => {
      mockUserService.getMatchHistory.mockResolvedValue(mockMatchHistoryResponse);

      const result = await controller.getMatchHistory(mockUser, mockQuery);

      expect(result).toEqual(mockMatchHistoryResponse);
      expect(mockUserService.getMatchHistory).toHaveBeenCalledWith(1, mockQuery);
    });
  });
});
