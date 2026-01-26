import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, IsNull, DataSource } from 'typeorm';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
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
  };

  const mockDataSource = {
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
    questionRepository = module.get<Repository<QuestionEntity>>(
      getRepositoryToken(QuestionEntity),
    );
    quizService = module.get<QuizService>(QuizService);
  });

  afterEach(() => {
    jest.clearAllMocks();
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

      const result = await service.submitAnswer(userId, questionId, answer);

      expect(result).toEqual({
        score: 10,
        question: {
          id: 1,
          content: 'What is React?',
          correctAnswer: 'React',
        },
        userAnswer: 'React',
        correctAnswer: 'React',
        aiFeedback: 'Perfect!',
      });
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('존재하지 않는 문제 ID면 NotFoundException을 던져야 함', async () => {
      const userId = 'user1';
      const questionId = 999;
      const answer = 'Answer';

      mockQuestionRepository.findOne.mockResolvedValue(null);

      await expect(service.submitAnswer(userId, questionId, answer)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.submitAnswer(userId, questionId, answer)).rejects.toThrow(
        '존재하지 않는 문제입니다.',
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
