import { Test, TestingModule } from '@nestjs/testing';
import { ProblemBankController } from '../../src/problem-bank/problem-bank.controller';
import { ProblemBankService } from '../../src/problem-bank/problem-bank.service';
import {
  GetProblemBankQueryDto,
  DifficultyFilter,
  ResultFilter,
} from '../../src/problem-bank/dto/get-problem-bank-query.dto';
import { UpdateBookmarkDto } from '../../src/problem-bank/dto/update-bookmark.dto';

describe('ProblemBankController', () => {
  let controller: ProblemBankController;
  let service: ProblemBankService;

  const mockProblemBankService = {
    getProblemBank: jest.fn(),
    getStatistics: jest.fn(),
    updateBookmark: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProblemBankController],
      providers: [
        {
          provide: ProblemBankService,
          useValue: mockProblemBankService,
        },
      ],
    }).compile();

    controller = module.get<ProblemBankController>(ProblemBankController);
    service = module.get<ProblemBankService>(ProblemBankService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProblemBank', () => {
    it('should return problem bank data for authenticated user', async () => {
      const query: GetProblemBankQueryDto = { page: 1, limit: 10 };
      const req = { user: { id: '1' } } as any;

      const mockResponse = {
        items: [
          {
            id: 1,
            questionId: 101,
            questionContent: 'Test Question',
            categories: ['Array'],
            difficulty: 'easy' as const,
            answerStatus: 'correct' as const,
            isBookmarked: true,
            userAnswer: 'Test Answer',
            correctAnswer: 'Correct Answer',
            aiFeedback: 'Good job',
            solvedAt: '2024-01-15T10:00:00.000Z',
          },
        ],
        totalPages: 2,
        currentPage: 1,
      };

      mockProblemBankService.getProblemBank.mockResolvedValue(mockResponse);

      const result = await controller.getProblemBank(query, req);

      expect(result).toEqual(mockResponse);
      expect(mockProblemBankService.getProblemBank).toHaveBeenCalledWith(1, query);
    });

    it('should call service with correct user id', async () => {
      const query: GetProblemBankQueryDto = { page: 2, limit: 20 };
      const req = { user: { id: '5' } } as any;

      const mockResponse = {
        items: [],
        totalPages: 0,
        currentPage: 2,
      };

      mockProblemBankService.getProblemBank.mockResolvedValue(mockResponse);

      await controller.getProblemBank(query, req);

      expect(mockProblemBankService.getProblemBank).toHaveBeenCalledWith(5, query);
    });

    it('should pass query filters to service', async () => {
      const query: GetProblemBankQueryDto = {
        page: 1,
        limit: 10,
        categoryIds: [1, 2],
        difficulty: DifficultyFilter.EASY,
        result: ResultFilter.CORRECT,
        isBookmarked: true,
        search: 'binary',
      };
      const req = { user: { id: '1' } } as any;

      mockProblemBankService.getProblemBank.mockResolvedValue({
        items: [],
        totalPages: 0,
        currentPage: 1,
      });

      await controller.getProblemBank(query, req);

      expect(mockProblemBankService.getProblemBank).toHaveBeenCalledWith(1, query);
      expect(mockProblemBankService.getProblemBank).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          categoryIds: [1, 2],
          difficulty: DifficultyFilter.EASY,
          result: ResultFilter.CORRECT,
          isBookmarked: true,
          search: 'binary',
        }),
      );
    });
  });

  describe('getStatistics', () => {
    it('should return statistics for authenticated user', async () => {
      const req = { user: { id: '1' } } as any;

      const mockStatistics = {
        totalSolved: 15,
        correctCount: 8,
        incorrectCount: 6,
        partialCount: 1,
        correctRate: 53.3,
      };

      mockProblemBankService.getStatistics.mockResolvedValue(mockStatistics);

      const result = await controller.getStatistics(req);

      expect(result).toEqual(mockStatistics);
      expect(mockProblemBankService.getStatistics).toHaveBeenCalledWith(1);
    });

    it('should call service with correct user id', async () => {
      const req = { user: { id: '10' } } as any;

      const mockStatistics = {
        totalSolved: 0,
        correctCount: 0,
        incorrectCount: 0,
        partialCount: 0,
        correctRate: 0,
      };

      mockProblemBankService.getStatistics.mockResolvedValue(mockStatistics);

      await controller.getStatistics(req);

      expect(mockProblemBankService.getStatistics).toHaveBeenCalledWith(10);
    });
  });

  describe('updateBookmark', () => {
    it('should update bookmark for authenticated user', async () => {
      const problemBankId = 1;
      const dto: UpdateBookmarkDto = { isBookmarked: true };
      const req = { user: { id: '1' } } as any;

      mockProblemBankService.updateBookmark.mockResolvedValue(undefined);

      await controller.updateBookmark(problemBankId, dto, req);

      expect(mockProblemBankService.updateBookmark).toHaveBeenCalledWith(1, problemBankId, dto);
    });

    it('should toggle bookmark from true to false', async () => {
      const problemBankId = 5;
      const dto: UpdateBookmarkDto = { isBookmarked: false };
      const req = { user: { id: '3' } } as any;

      mockProblemBankService.updateBookmark.mockResolvedValue(undefined);

      await controller.updateBookmark(problemBankId, dto, req);

      expect(mockProblemBankService.updateBookmark).toHaveBeenCalledWith(3, problemBankId, dto);
    });

    it('should call service with correct parameters', async () => {
      const problemBankId = 10;
      const dto: UpdateBookmarkDto = { isBookmarked: true };
      const req = { user: { id: '7' } } as any;

      mockProblemBankService.updateBookmark.mockResolvedValue(undefined);

      await controller.updateBookmark(problemBankId, dto, req);

      expect(mockProblemBankService.updateBookmark).toHaveBeenCalledWith(7, 10, dto);
      expect(mockProblemBankService.updateBookmark).toHaveBeenCalledTimes(1);
    });
  });
});
