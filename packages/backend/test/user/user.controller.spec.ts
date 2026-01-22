import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserController } from '../../src/user/user.controller';
import { UserService } from '../../src/user/user.service';
import { AuthenticatedUser } from '../../src/auth/strategies/jwt.strategy';
import { MyPageResponseDto } from '../../src/user/dto/mypage-response.dto';

describe('UserController', () => {
  let controller: UserController;
  let userService: UserService;

  const mockUserService = {
    getMyPageData: jest.fn(),
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
    userService = module.get<UserService>(UserService);
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
        id: 1,
        nickname: 'testuser',
        profileImage: 'https://avatars.githubusercontent.com/u/123',
        email: 'test@example.com',
        oauthProvider: 'github',
        createdAt: new Date('2025-01-15T10:30:00Z'),
      },
      rank: {
        tier: 'gold',
        tierPoint: 1250,
        ranking: 42,
      },
      level: {
        level: 42,
        expPoint: 4200,
        expForCurrentLevel: 0,
        expForNextLevel: 100,
      },
      matchStats: {
        totalMatches: 100,
        winCount: 60,
        loseCount: 40,
        winRate: 60.0,
      },
      problemStats: {
        totalSolved: 250,
        correctCount: 180,
        incorrectCount: 50,
        partialCount: 20,
        correctRate: 72.0,
      },
      categoryAnalysis: {
        strong: [
          {
            categoryId: 1,
            categoryName: '네트워크',
            correctRate: 85.5,
            totalCount: 50,
            correctCount: 43,
          },
        ],
        weak: [
          {
            categoryId: 2,
            categoryName: '운영체제',
            correctRate: 55.0,
            totalCount: 30,
            correctCount: 17,
          },
        ],
        all: [
          {
            categoryId: 1,
            categoryName: '네트워크',
            correctRate: 85.5,
            totalCount: 50,
            correctCount: 43,
          },
          {
            categoryId: 2,
            categoryName: '운영체제',
            correctRate: 55.0,
            totalCount: 30,
            correctCount: 17,
          },
        ],
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
});
