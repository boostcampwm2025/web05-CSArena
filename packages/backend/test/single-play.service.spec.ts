import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, IsNull, DataSource } from 'typeorm';
import { NotFoundException, InternalServerErrorException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { SinglePlayService } from '../src/single-play/single-play.service';
import { QuizService } from '../src/quiz/quiz.service';
import { Category, Question as QuestionEntity } from '../src/quiz/entity';
import { SCORE_MAP } from '../src/quiz/quiz.constants';

describe('SinglePlayService', () => {
  let service: SinglePlayService;
  let categoryRepository: Repository<Category>;
  let questionRepository: Repository<QuestionEntity>;
  let quizService: QuizService;

  const mockCategoryRepository = {
    find: jest.fn(),
  };

  const mockQuestionRepository = {
    findOne: jest.fn(),
  };

  const mockQuizService = {
    generateSinglePlayQuestions: jest.fn(),
    gradeQuestion: jest.fn(),
    determineAnswerStatus: jest.fn().mockReturnValue('correct'),
    incrementUsageCount: jest.fn().mockResolvedValue(undefined),
  };

  const mockDataSource = {
    manager: {
      save: jest.fn().mockResolvedValue({ id: 1 }),
      findOne: jest.fn().mockResolvedValue({ id: 123 }),
    },
    transaction: jest.fn(async (callback) => {
      const mockManager = {
        save: jest.fn().mockResolvedValue({ id: 1 }),
      };
      return callback(mockManager);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SinglePlayService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepository,
        },
        {
          provide: getRepositoryToken(QuestionEntity),
          useValue: mockQuestionRepository,
        },
        {
          provide: QuizService,
          useValue: mockQuizService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<SinglePlayService>(SinglePlayService);
    categoryRepository = module.get<Repository<Category>>(getRepositoryToken(Category));
    questionRepository = module.get<Repository<QuestionEntity>>(getRepositoryToken(QuestionEntity));
    quizService = module.get<QuizService>(QuizService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startSession', () => {
    it('싱글플레이 세션을 시작하고 matchId를 반환해야 함', async () => {
      const userId = '1';
      const mockMatch = { id: 123, player1Id: 1, player2Id: null, matchType: 'single' };

      mockDataSource.manager.save.mockResolvedValue(mockMatch);

      const result = await service.startSession(userId);

      expect(result).toBe(123);
      expect(mockDataSource.manager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          player1Id: 1,
          player2Id: null,
          winnerId: null,
          matchType: 'single',
        }),
      );
    });

    it('데이터베이스 에러 발생 시 InternalServerErrorException을 던져야 함', async () => {
      const userId = '1';

      mockDataSource.manager.save.mockRejectedValue(new Error('DB connection failed'));

      await expect(service.startSession(userId)).rejects.toThrow(InternalServerErrorException);
      await expect(service.startSession(userId)).rejects.toThrow(
        '세션 시작 중 오류가 발생했습니다.',
      );
    });
  });

  describe('getCategories', () => {
    it('대분류 카테고리 목록을 정상적으로 반환해야 함', async () => {
      const mockCategories = [
        { id: 1, name: '프론트엔드', parentId: null },
        { id: 2, name: '백엔드', parentId: null },
        { id: 3, name: 'DevOps', parentId: null },
      ];

      mockCategoryRepository.find.mockResolvedValue(mockCategories);

      const result = await service.getCategories();

      expect(result).toEqual([
        { id: 1, name: '프론트엔드' },
        { id: 2, name: '백엔드' },
        { id: 3, name: 'DevOps' },
      ]);
      expect(mockCategoryRepository.find).toHaveBeenCalledWith({
        where: { parentId: IsNull() },
        select: ['id', 'name'],
        order: { id: 'ASC' },
      });
    });

    it('카테고리가 없으면 빈 배열을 반환해야 함', async () => {
      mockCategoryRepository.find.mockResolvedValue([]);

      const result = await service.getCategories();

      expect(result).toEqual([]);
    });

    it('데이터베이스 에러 발생 시 InternalServerErrorException을 던져야 함', async () => {
      mockCategoryRepository.find.mockRejectedValue(new Error('DB connection failed'));

      await expect(service.getCategories()).rejects.toThrow(InternalServerErrorException);
      await expect(service.getCategories()).rejects.toThrow(
        '카테고리 조회 중 오류가 발생했습니다.',
      );
    });
  });

  describe('getQuestion', () => {
    it('유효한 카테고리 ID로 문제 1개를 정상적으로 반환해야 함', async () => {
      const categoryIds = [1, 2];
      const mockExistingCategories = [{ id: 1 }, { id: 2 }];
      const mockQuestion = {
        id: 1,
        questionType: 'multiple',
        content: 'What is React?',
        difficulty: 2,
      };

      mockCategoryRepository.find.mockResolvedValue(mockExistingCategories);
      mockQuizService.generateSinglePlayQuestions.mockResolvedValue([mockQuestion]);

      const result = await service.getQuestion(categoryIds);

      expect(result).toEqual(mockQuestion);
      expect(mockCategoryRepository.find).toHaveBeenCalledWith({
        where: categoryIds.map((id) => ({ id })),
        select: ['id'],
      });
      expect(mockQuizService.generateSinglePlayQuestions).toHaveBeenCalledWith(categoryIds, 1);
    });

    it('존재하지 않는 카테고리 ID면 NotFoundException을 던져야 함', async () => {
      const categoryIds = [999];

      mockCategoryRepository.find.mockResolvedValue([]);

      await expect(service.getQuestion(categoryIds)).rejects.toThrow(NotFoundException);
      await expect(service.getQuestion(categoryIds)).rejects.toThrow(
        '존재하지 않는 카테고리가 있습니다: 999',
      );
    });
  });

  describe('submitAnswer', () => {
    it('답안 제출, 채점, DB 저장을 정상적으로 처리해야 함', async () => {
      const userId = '1';
      const questionId = 1;
      const answer = 'React';
      const mockQuestion = {
        id: 1,
        questionType: 'short',
        content: 'What is React?',
        difficulty: 1,
        correctAnswer: 'React',
      } as QuestionEntity;

      const mockGradeResult = [
        {
          playerId: 'single-player',
          answer: 'React',
          isCorrect: true,
          score: 10,
          feedback: 'Perfect!',
        },
      ];

      mockQuestionRepository.findOne.mockResolvedValue(mockQuestion);
      mockQuizService.gradeQuestion.mockResolvedValue(mockGradeResult);
      mockQuizService.determineAnswerStatus.mockReturnValue('correct');

      const matchId = 123;
      const mockManager = { save: jest.fn(), query: jest.fn(), findOne: jest.fn() };

      mockDataSource.transaction.mockImplementation(async (cb: any) => cb(mockManager));

      mockManager.findOne.mockResolvedValue({ id: matchId, player1Id: 1, matchType: 'single' });
      mockManager.save.mockResolvedValue({});
      mockManager.query.mockResolvedValue([[{ exp_point: 10 }], 1]);

      const result = await service.submitAnswer(userId, matchId, questionId, answer);

      expect(mockDataSource.transaction).toHaveBeenCalled();

      expect(result.grade).toEqual({
        submittedAnswer: 'React',
        isCorrect: true,
        aiFeedback: 'Perfect!',
      });

      expect(typeof result.level).toBe('number');
      expect(typeof result.needExpPoint).toBe('number');
      expect(typeof result.remainedExpPoint).toBe('number');

      expect(mockManager.findOne).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ where: { id: matchId } }),
      );
    });

    it('존재하지 않는 문제 ID면 NotFoundException을 던져야 함', async () => {
      const userId = '1';
      const matchId = 123;
      const questionId = 999;
      const answer = 'Answer';

      mockQuestionRepository.findOne.mockResolvedValue(null);

      await expect(service.submitAnswer(userId, matchId, questionId, answer)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.submitAnswer(userId, matchId, questionId, answer)).rejects.toThrow(
        '존재하지 않는 문제입니다.',
      );
    });

    it('존재하지 않는 matchId면 NotFoundException을 던져야 함', async () => {
      const userId = '1';
      const matchId = 999;
      const questionId = 1;
      const answer = 'Answer';
      const mockQuestion = {
        id: 1,
        questionType: 'short',
        content: 'What is React?',
        difficulty: 1,
        correctAnswer: 'React',
      } as QuestionEntity;

      const mockGradeResult = [
        {
          playerId: 'single-player',
          answer: 'Answer',
          isCorrect: true,
          score: 10,
          feedback: 'Good!',
        },
      ];

      const mockManager = { findOne: jest.fn() };
      mockDataSource.transaction.mockImplementation(async (cb: any) => cb(mockManager));

      mockQuestionRepository.findOne.mockResolvedValue(mockQuestion);
      mockQuizService.gradeQuestion.mockResolvedValue(mockGradeResult);
      mockManager.findOne.mockResolvedValue(null);

      await expect(service.submitAnswer(userId, matchId, questionId, answer)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.submitAnswer(userId, matchId, questionId, answer)).rejects.toThrow(
        '존재하지 않는 세션입니다.',
      );
    });

    it('다른 사용자의 matchId면 ForbiddenException을 던져야 함', async () => {
      const userId = '1';
      const matchId = 123;
      const questionId = 1;
      const answer = 'Answer';
      const mockQuestion = {
        id: 1,
        questionType: 'short',
        content: 'What is React?',
        difficulty: 1,
        correctAnswer: 'React',
      } as QuestionEntity;

      const mockGradeResult = [
        {
          playerId: 'single-player',
          answer: 'Answer',
          isCorrect: true,
          score: 10,
          feedback: 'Good!',
        },
      ];

      const mockManager = { findOne: jest.fn() };
      mockDataSource.transaction.mockImplementation(async (cb: any) => cb(mockManager));

      mockQuestionRepository.findOne.mockResolvedValue(mockQuestion);
      mockQuizService.gradeQuestion.mockResolvedValue(mockGradeResult);
      // 다른 사용자(player1Id: 2)의 세션
      mockManager.findOne.mockResolvedValue({ id: matchId, player1Id: 2, matchType: 'single' });

      await expect(service.submitAnswer(userId, matchId, questionId, answer)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.submitAnswer(userId, matchId, questionId, answer)).rejects.toThrow(
        '본인의 세션이 아닙니다.',
      );
    });

    it('싱글플레이가 아닌 matchType이면 BadRequestException을 던져야 함', async () => {
      const userId = '1';
      const matchId = 123;
      const questionId = 1;
      const answer = 'Answer';
      const mockQuestion = {
        id: 1,
        questionType: 'short',
        content: 'What is React?',
        difficulty: 1,
        correctAnswer: 'React',
      } as QuestionEntity;

      const mockGradeResult = [
        {
          playerId: 'single-player',
          answer: 'Answer',
          isCorrect: true,
          score: 10,
          feedback: 'Good!',
        },
      ];

      const mockManager = { findOne: jest.fn() };
      mockDataSource.transaction.mockImplementation(async (cb: any) => cb(mockManager));

      mockQuestionRepository.findOne.mockResolvedValue(mockQuestion);
      mockQuizService.gradeQuestion.mockResolvedValue(mockGradeResult);
      // matchType이 'multi'인 세션
      mockManager.findOne.mockResolvedValue({ id: matchId, player1Id: 1, matchType: 'multi' });

      await expect(service.submitAnswer(userId, matchId, questionId, answer)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.submitAnswer(userId, matchId, questionId, answer)).rejects.toThrow(
        '싱글플레이 세션이 아닙니다.',
      );
    });
  });

  describe('Score Constants Verification', () => {
    it('SCORE_MAP 상수가 올바른 값을 가져야 함', () => {
      expect(SCORE_MAP).toEqual({
        easy: 10,
        medium: 20,
        hard: 30,
      });
    });
  });
});
