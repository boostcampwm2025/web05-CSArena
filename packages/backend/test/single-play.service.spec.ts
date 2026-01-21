import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
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
  };

  const mockLogger = {
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
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
      ],
    }).compile();

    service = module.get<SinglePlayService>(SinglePlayService);
    // Private logger mocking
    (service as any).logger = mockLogger;

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
        where: { parentId: null },
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

  describe('getQuestions', () => {
    it('유효한 카테고리 ID로 문제 목록을 정상적으로 반환해야 함', async () => {
      const categoryIds = [1, 2];
      const mockExistingCategories = [{ id: 1 }, { id: 2 }];
      const mockQuestions = [
        { id: 1, questionType: 'multiple', content: 'What is React?', difficulty: 2 },
        { id: 2, questionType: 'short', content: 'Explain Node.js', difficulty: 3 },
      ];

      mockCategoryRepository.find.mockResolvedValue(mockExistingCategories);
      mockQuizService.generateSinglePlayQuestions.mockResolvedValue(mockQuestions);

      const result = await service.getQuestions(categoryIds);

      expect(result).toEqual(mockQuestions);
      expect(mockCategoryRepository.find).toHaveBeenCalledWith({
        where: categoryIds.map((id) => ({ id })),
        select: ['id'],
      });
      expect(mockQuizService.generateSinglePlayQuestions).toHaveBeenCalledWith(categoryIds, 10);
    });

    it('존재하지 않는 카테고리 ID면 NotFoundException을 던져야 함', async () => {
      const categoryIds = [999];

      mockCategoryRepository.find.mockResolvedValue([]);

      await expect(service.getQuestions(categoryIds)).rejects.toThrow(NotFoundException);
      await expect(service.getQuestions(categoryIds)).rejects.toThrow(
        '존재하지 않는 카테고리가 있습니다: 999',
      );
    });

    it('일부 카테고리만 존재하면 NotFoundException을 던져야 함', async () => {
      const categoryIds = [1, 999];
      const mockExistingCategories = [{ id: 1 }]; // 1만 존재, 999는 없음

      mockCategoryRepository.find.mockResolvedValue(mockExistingCategories);

      await expect(service.getQuestions(categoryIds)).rejects.toThrow(NotFoundException);
      await expect(service.getQuestions(categoryIds)).rejects.toThrow(
        '존재하지 않는 카테고리가 있습니다: 999',
      );
    });

    it('여러 개의 존재하지 않는 카테고리를 명시해야 함', async () => {
      const categoryIds = [1, 999, 888];
      const mockExistingCategories = [{ id: 1 }]; // 1만 존재

      mockCategoryRepository.find.mockResolvedValue(mockExistingCategories);

      await expect(service.getQuestions(categoryIds)).rejects.toThrow(NotFoundException);
      await expect(service.getQuestions(categoryIds)).rejects.toThrow(
        '존재하지 않는 카테고리가 있습니다: 999, 888',
      );
    });

    it('문제 생성 실패 시 InternalServerErrorException을 던져야 함', async () => {
      const categoryIds = [1];
      const mockExistingCategories = [{ id: 1 }];

      mockCategoryRepository.find.mockResolvedValue(mockExistingCategories);
      mockQuizService.generateSinglePlayQuestions.mockRejectedValue(
        new Error('Question generation failed'),
      );

      await expect(service.getQuestions(categoryIds)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.getQuestions(categoryIds)).rejects.toThrow(
        '문제 조회 중 오류가 발생했습니다.',
      );
    });

    it('빈 배열의 문제도 정상적으로 반환해야 함', async () => {
      const categoryIds = [1];
      const mockExistingCategories = [{ id: 1 }];

      mockCategoryRepository.find.mockResolvedValue(mockExistingCategories);
      mockQuizService.generateSinglePlayQuestions.mockResolvedValue([]);

      const result = await service.getQuestions(categoryIds);

      expect(result).toEqual([]);
    });
  });

  describe('submitAnswer', () => {
    it('Easy 난이도 - 정답 시 올바른 점수를 반환해야 함', async () => {
      const questionId = 1;
      const answer = 'React';
      const mockQuestion = {
        id: 1,
        questionType: 'short',
        content: 'What is React?',
        difficulty: 1, // Easy
        correctAnswer: 'React',
      } as QuestionEntity;

      const mockGradeResult = [
        {
          playerId: 'single-player',
          answer: 'React',
          isCorrect: true,
          score: 10, // AI 점수 만점
          feedback: 'Perfect!',
        },
      ];

      mockQuestionRepository.findOne.mockResolvedValue(mockQuestion);
      mockQuizService.gradeQuestion.mockResolvedValue(mockGradeResult);

      const result = await service.submitAnswer(questionId, answer);

      // Easy: (10/10) * 10 = 10점
      expect(result).toEqual({
        grade: {
          answer: 'React',
          isCorrect: true,
          score: 10,
          feedback: 'Perfect!',
        },
        totalScore: 10,
      });
    });

    it('Medium 난이도 - 부분 점수를 올바르게 계산해야 함', async () => {
      const questionId = 2;
      const answer = 'TCP is a protocol';
      const mockQuestion = {
        id: 2,
        questionType: 'essay',
        content: 'Explain TCP',
        difficulty: 3, // Medium
        correctAnswer: 'TCP is a connection-oriented protocol...',
      } as QuestionEntity;

      const mockGradeResult = [
        {
          playerId: 'single-player',
          answer: 'TCP is a protocol',
          isCorrect: true,
          score: 6, // AI 부분 점수
          feedback: 'Needs more detail',
        },
      ];

      mockQuestionRepository.findOne.mockResolvedValue(mockQuestion);
      mockQuizService.gradeQuestion.mockResolvedValue(mockGradeResult);

      const result = await service.submitAnswer(questionId, answer);

      // Medium: (6/10) * 20 = 12점
      expect(result).toEqual({
        grade: {
          answer: 'TCP is a protocol',
          isCorrect: true,
          score: 6,
          feedback: 'Needs more detail',
        },
        totalScore: 12,
      });
    });

    it('Hard 난이도 - 만점 시 30점을 반환해야 함', async () => {
      const questionId = 3;
      const answer = 'Complete explanation';
      const mockQuestion = {
        id: 3,
        questionType: 'essay',
        content: 'Explain TCP congestion control',
        difficulty: 5, // Hard
        correctAnswer: 'TCP uses slow start, congestion avoidance...',
      } as QuestionEntity;

      const mockGradeResult = [
        {
          playerId: 'single-player',
          answer: 'Complete explanation',
          isCorrect: true,
          score: 10, // AI 만점
          feedback: 'Excellent!',
        },
      ];

      mockQuestionRepository.findOne.mockResolvedValue(mockQuestion);
      mockQuizService.gradeQuestion.mockResolvedValue(mockGradeResult);

      const result = await service.submitAnswer(questionId, answer);

      // Hard: (10/10) * 30 = 30점
      expect(result).toEqual({
        grade: {
          answer: 'Complete explanation',
          isCorrect: true,
          score: 10,
          feedback: 'Excellent!',
        },
        totalScore: 30,
      });
    });

    it('오답 시 0점을 반환해야 함', async () => {
      const questionId = 4;
      const answer = 'Wrong answer';
      const mockQuestion = {
        id: 4,
        questionType: 'short',
        content: 'What is DNS?',
        difficulty: 2, // Easy
        correctAnswer: 'Domain Name System',
      } as QuestionEntity;

      const mockGradeResult = [
        {
          playerId: 'single-player',
          answer: 'Wrong answer',
          isCorrect: false,
          score: 0,
          feedback: 'Incorrect',
        },
      ];

      mockQuestionRepository.findOne.mockResolvedValue(mockQuestion);
      mockQuizService.gradeQuestion.mockResolvedValue(mockGradeResult);

      const result = await service.submitAnswer(questionId, answer);

      expect(result).toEqual({
        grade: {
          answer: 'Wrong answer',
          isCorrect: false,
          score: 0,
          feedback: 'Incorrect',
        },
        totalScore: 0,
      });
    });

    it('객관식 정답 시 난이도별 만점을 반환해야 함', async () => {
      const questionId = 5;
      const answer = 'A';
      const mockQuestion = {
        id: 5,
        questionType: 'multiple',
        content: JSON.stringify({
          question: 'What is HTTP?',
          options: { A: 'HyperText Transfer Protocol', B: 'Wrong', C: 'Wrong', D: 'Wrong' },
        }),
        difficulty: 3, // Medium
        correctAnswer: 'A',
      } as QuestionEntity;

      const mockGradeResult = [
        {
          playerId: 'single-player',
          answer: 'A',
          isCorrect: true,
          score: 10, // 객관식 정답 = AI 10점
          feedback: 'Correct!',
        },
      ];

      mockQuestionRepository.findOne.mockResolvedValue(mockQuestion);
      mockQuizService.gradeQuestion.mockResolvedValue(mockGradeResult);

      const result = await service.submitAnswer(questionId, answer);

      // Medium: (10/10) * 20 = 20점
      expect(result).toEqual({
        grade: {
          answer: 'A',
          isCorrect: true,
          score: 10,
          feedback: 'Correct!',
        },
        totalScore: 20,
      });
    });

    it('존재하지 않는 문제 ID면 NotFoundException을 던져야 함', async () => {
      const questionId = 999;
      const answer = 'Some answer';

      mockQuestionRepository.findOne.mockResolvedValue(null);

      await expect(service.submitAnswer(questionId, answer)).rejects.toThrow(NotFoundException);
      await expect(service.submitAnswer(questionId, answer)).rejects.toThrow(
        '존재하지 않는 문제입니다.',
      );
    });

    it('채점 중 에러 발생 시 InternalServerErrorException을 던져야 함', async () => {
      const questionId = 1;
      const answer = 'Answer';
      const mockQuestion = {
        id: 1,
        questionType: 'short',
        content: 'Question',
        difficulty: 2,
        correctAnswer: 'Correct',
      } as QuestionEntity;

      mockQuestionRepository.findOne.mockResolvedValue(mockQuestion);
      mockQuizService.gradeQuestion.mockRejectedValue(new Error('Grading service failed'));

      await expect(service.submitAnswer(questionId, answer)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.submitAnswer(questionId, answer)).rejects.toThrow(
        '채점 중 오류가 발생했습니다.',
      );
    });

    it('난이도 null 시 Medium으로 처리해야 함', async () => {
      const questionId = 6;
      const answer = 'Answer';
      const mockQuestion = {
        id: 6,
        questionType: 'short',
        content: 'Question',
        difficulty: null, // null
        correctAnswer: 'Correct',
      } as QuestionEntity;

      const mockGradeResult = [
        {
          playerId: 'single-player',
          answer: 'Answer',
          isCorrect: true,
          score: 10,
          feedback: 'Good',
        },
      ];

      mockQuestionRepository.findOne.mockResolvedValue(mockQuestion);
      mockQuizService.gradeQuestion.mockResolvedValue(mockGradeResult);

      const result = await service.submitAnswer(questionId, answer);

      // null → Medium: (10/10) * 20 = 20점
      expect(result.totalScore).toBe(20);
    });

    it('점수 반올림이 올바르게 처리되어야 함', async () => {
      const questionId = 7;
      const answer = 'Partial answer';
      const mockQuestion = {
        id: 7,
        questionType: 'essay',
        content: 'Explain something',
        difficulty: 3, // Medium (만점 20점)
        correctAnswer: 'Full explanation',
      } as QuestionEntity;

      const mockGradeResult = [
        {
          playerId: 'single-player',
          answer: 'Partial answer',
          isCorrect: true,
          score: 3, // AI 3점
          feedback: 'Needs improvement',
        },
      ];

      mockQuestionRepository.findOne.mockResolvedValue(mockQuestion);
      mockQuizService.gradeQuestion.mockResolvedValue(mockGradeResult);

      const result = await service.submitAnswer(questionId, answer);

      // Medium: (3/10) * 20 = 6점 (반올림)
      expect(result.totalScore).toBe(6);
    });
  });

  describe('Score Constants Verification', () => {
    it('SCORE_MAP 상수가 올바른 값을 가져야 함', () => {
      expect(SCORE_MAP.easy).toBe(10);
      expect(SCORE_MAP.medium).toBe(20);
      expect(SCORE_MAP.hard).toBe(30);
    });
  });
});
