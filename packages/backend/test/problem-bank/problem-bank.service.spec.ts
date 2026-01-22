import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProblemBankService } from '../../src/problem-bank/problem-bank.service';
import { UserProblemBank } from '../../src/problem-bank/entity/user-problem-bank.entity';
import { DifficultyFilter } from '../../src/problem-bank/dto/get-problem-bank-query.dto';
import { NotFoundException } from '@nestjs/common';

describe('ProblemBankService', () => {
  let service: ProblemBankService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProblemBankService,
        {
          provide: getRepositoryToken(UserProblemBank),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProblemBankService>(ProblemBankService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProblemBank', () => {
    it('should return problem bank data with pagination', async () => {
      const userId = 1;
      const query = { page: 1, limit: 10 };

      const mockProblemBankItem = {
        id: 1,
        questionId: 101,
        userId: 1,
        matchId: 1,
        userAnswer: 'Hash Map 사용',
        answerStatus: 'correct',
        isBookmarked: true,
        aiFeedback: '좋은 답변입니다',
        question: {
          id: 101,
          content: 'Two Sum 문제',
          correctAnswer: 'Hash Map 사용',
          difficulty: 1,
          categoryQuestions: [
            {
              category: {
                id: 1,
                name: 'Array',
                parentId: null,
                parent: null,
              },
            },
          ],
        },
        match: {
          id: 1,
          createdAt: new Date('2024-01-15'),
        },
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(15),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockProblemBankItem]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getProblemBank(userId, query);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe(1);
      expect(result.items[0].difficulty).toBe('easy');
      expect(result.items[0].categories).toEqual(['Array']);
      expect(result.totalPages).toBe(2);
      expect(result.currentPage).toBe(1);
    });

    it('should apply category filter (includes parent categories)', async () => {
      const userId = 1;
      const query = { page: 1, limit: 10, categoryIds: [1, 2] };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getProblemBank(userId, query);

      // 대분류 ID를 전달하면 해당 대분류의 모든 소분류도 포함
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(c.id IN (:...categoryIds) OR c.parentId IN (:...categoryIds))',
        { categoryIds: [1, 2] },
      );
    });

    it('should apply difficulty filter (easy)', async () => {
      const userId = 1;
      const query = { page: 1, limit: 10, difficulty: DifficultyFilter.EASY };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getProblemBank(userId, query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'q.difficulty BETWEEN :min AND :max',
        { min: 1, max: 2 },
      );
    });

    it('should apply search filter', async () => {
      const userId = 1;
      const query = { page: 1, limit: 10, search: 'binary tree' };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getProblemBank(userId, query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(CAST(q.content AS TEXT) ILIKE :search)',
        { search: '%binary tree%' },
      );
    });

    it('should apply bookmark filter', async () => {
      const userId = 1;
      const query = { page: 1, limit: 10, isBookmarked: true };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getProblemBank(userId, query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'pb.isBookmarked = :isBookmarked',
        { isBookmarked: true },
      );
    });

    it('should map difficulty correctly (1-2: easy, 3: medium, 4-5: hard)', async () => {
      const userId = 1;
      const query = { page: 1, limit: 10 };

      const mockItems = [
        {
          id: 1,
          questionId: 1,
          userId: 1,
          matchId: 1,
          userAnswer: 'answer',
          answerStatus: 'correct',
          isBookmarked: false,
          aiFeedback: 'feedback',
          question: {
            content: 'Q1',
            correctAnswer: 'A1',
            difficulty: 1,
            categoryQuestions: [],
          },
          match: { createdAt: new Date() },
        },
        {
          id: 2,
          questionId: 2,
          userId: 1,
          matchId: 2,
          userAnswer: 'answer',
          answerStatus: 'correct',
          isBookmarked: false,
          aiFeedback: 'feedback',
          question: {
            content: 'Q2',
            correctAnswer: 'A2',
            difficulty: 3,
            categoryQuestions: [],
          },
          match: { createdAt: new Date() },
        },
        {
          id: 3,
          questionId: 3,
          userId: 1,
          matchId: 3,
          userAnswer: 'answer',
          answerStatus: 'correct',
          isBookmarked: false,
          aiFeedback: 'feedback',
          question: {
            content: 'Q3',
            correctAnswer: 'A3',
            difficulty: 5,
            categoryQuestions: [],
          },
          match: { createdAt: new Date() },
        },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockItems),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getProblemBank(userId, query);

      expect(result.items[0].difficulty).toBe('easy');
      expect(result.items[1].difficulty).toBe('medium');
      expect(result.items[2].difficulty).toBe('hard');
    });
  });

  describe('getStatistics', () => {
    it('should calculate statistics correctly using DB aggregation', async () => {
      const userId = 1;

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalSolved: '6',
          correctCount: '3',
          incorrectCount: '2',
          partialCount: '1',
        }),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getStatistics(userId);

      expect(result.totalSolved).toBe(6);
      expect(result.correctCount).toBe(3);
      expect(result.incorrectCount).toBe(2);
      expect(result.partialCount).toBe(1);
      expect(result.correctRate).toBe(50.0);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('pb.userId = :userId', { userId: 1 });
    });

    it('should return 0% correct rate when no problems solved', async () => {
      const userId = 1;

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalSolved: '0',
          correctCount: '0',
          incorrectCount: '0',
          partialCount: '0',
        }),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getStatistics(userId);

      expect(result.totalSolved).toBe(0);
      expect(result.correctCount).toBe(0);
      expect(result.incorrectCount).toBe(0);
      expect(result.partialCount).toBe(0);
      expect(result.correctRate).toBe(0);
    });

    it('should round correct rate to 1 decimal place', async () => {
      const userId = 1;

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalSolved: '3',
          correctCount: '2',
          incorrectCount: '1',
          partialCount: '0',
        }),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getStatistics(userId);

      expect(result.correctRate).toBe(66.7); // 2/3 * 100 = 66.666... → 66.7
    });
  });

  describe('updateBookmark', () => {
    it('should update bookmark status', async () => {
      const userId = 1;
      const problemBankId = 1;
      const dto = { isBookmarked: true };

      const mockProblemBank = {
        id: 1,
        userId: 1,
        isBookmarked: false,
      };

      mockRepository.findOne.mockResolvedValue(mockProblemBank);
      mockRepository.save.mockResolvedValue({ ...mockProblemBank, isBookmarked: true });

      await service.updateBookmark(userId, problemBankId, dto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: problemBankId, userId },
      });
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...mockProblemBank,
        isBookmarked: true,
      });
    });

    it('should throw NotFoundException when problem bank entry not found', async () => {
      const userId = 1;
      const problemBankId = 999;
      const dto = { isBookmarked: true };

      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.updateBookmark(userId, problemBankId, dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateBookmark(userId, problemBankId, dto)).rejects.toThrow(
        'Problem bank entry not found',
      );
    });

    it('should toggle bookmark from true to false', async () => {
      const userId = 1;
      const problemBankId = 1;
      const dto = { isBookmarked: false };

      const mockProblemBank = {
        id: 1,
        userId: 1,
        isBookmarked: true,
      };

      mockRepository.findOne.mockResolvedValue(mockProblemBank);
      mockRepository.save.mockResolvedValue({ ...mockProblemBank, isBookmarked: false });

      await service.updateBookmark(userId, problemBankId, dto);

      expect(mockRepository.save).toHaveBeenCalledWith({
        ...mockProblemBank,
        isBookmarked: false,
      });
    });
  });

  describe('extractCategories', () => {
    it('should return parent and child category names', async () => {
      const userId = 1;
      const query = { page: 1, limit: 10 };

      const mockItem = {
        id: 1,
        questionId: 1,
        userId: 1,
        matchId: 1,
        userAnswer: 'answer',
        answerStatus: 'correct',
        isBookmarked: false,
        aiFeedback: 'feedback',
        question: {
          content: 'Q1',
          correctAnswer: 'A1',
          difficulty: 1,
          categoryQuestions: [
            {
              category: {
                id: 2,
                name: 'Binary Tree',
                parentId: 1,
                parent: {
                  id: 1,
                  name: 'Tree',
                  parentId: null,
                },
              },
            },
          ],
        },
        match: { createdAt: new Date() },
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockItem]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getProblemBank(userId, query);

      expect(result.items[0].categories).toEqual(['Tree', 'Binary Tree']);
    });

    it('should return only category name when no parent exists', async () => {
      const userId = 1;
      const query = { page: 1, limit: 10 };

      const mockItem = {
        id: 1,
        questionId: 1,
        userId: 1,
        matchId: 1,
        userAnswer: 'answer',
        answerStatus: 'correct',
        isBookmarked: false,
        aiFeedback: 'feedback',
        question: {
          content: 'Q1',
          correctAnswer: 'A1',
          difficulty: 1,
          categoryQuestions: [
            {
              category: {
                id: 1,
                name: 'Algorithm',
                parentId: null,
                parent: null,
              },
            },
          ],
        },
        match: { createdAt: new Date() },
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockItem]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getProblemBank(userId, query);

      expect(result.items[0].categories).toEqual(['Algorithm']);
    });

    it('should return 미분류 when no category exists', async () => {
      const userId = 1;
      const query = { page: 1, limit: 10 };

      const mockItem = {
        id: 1,
        questionId: 1,
        userId: 1,
        matchId: 1,
        userAnswer: 'answer',
        answerStatus: 'correct',
        isBookmarked: false,
        aiFeedback: 'feedback',
        question: {
          content: 'Q1',
          correctAnswer: 'A1',
          difficulty: 1,
          categoryQuestions: [],
        },
        match: { createdAt: new Date() },
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockItem]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getProblemBank(userId, query);

      expect(result.items[0].categories).toEqual(['미분류']);
    });
  });
});