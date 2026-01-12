import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuizService } from '../../src/quiz/quiz.service';
import { Question as QuestionEntity } from '../../src/quiz/entity';
import { ClovaClientService } from '../../src/quiz/clova/clova-client.service';

describe('QuizService', () => {
  let service: QuizService;

  const mockQuestionRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockClovaClient = {
    callClova: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizService,
        {
          provide: getRepositoryToken(QuestionEntity),
          useValue: mockQuestionRepository,
        },
        {
          provide: ClovaClientService,
          useValue: mockClovaClient,
        },
      ],
    }).compile();

    service = module.get<QuizService>(QuizService);
  });

  describe('generateQuestion', () => {
    it('should return 5 questions from DB with balanced difficulty and type', async () => {
      // Mock DB data with new structure
      const easyMultiple = {
        id: 1,
        questionType: 'multiple' as const,
        content: { question: 'HTTP와 HTTPS의 차이는?', options: { A: '보안 여부', B: '속도', C: '포트', D: '프로토콜' } },
        correctAnswer: 'A',
        difficulty: 1,
        isActive: true,
      };

      const easyShort = {
        id: 2,
        questionType: 'short' as const,
        content: '서브쿼리란?',
        correctAnswer: '쿼리 안의 쿼리',
        difficulty: 2,
        isActive: true,
      };

      const mediumMultiple = {
        id: 3,
        questionType: 'multiple' as const,
        content: { question: 'TCP와 UDP의 차이는?', options: { A: '연결형 vs 비연결형', B: '동일함', C: '차이 없음', D: '모름' } },
        correctAnswer: 'A',
        difficulty: 3,
        isActive: true,
      };

      const mediumShort = {
        id: 4,
        questionType: 'short' as const,
        content: 'JOIN이란?',
        correctAnswer: '테이블 결합',
        difficulty: 3,
        isActive: true,
      };

      const hardEssay = {
        id: 5,
        questionType: 'essay' as const,
        content: 'B+tree를 설명하세요',
        correctAnswer: 'B+tree는 균형 잡힌 트리 구조입니다.',
        difficulty: 4,
        isActive: true,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn()
          .mockResolvedValueOnce([easyMultiple])
          .mockResolvedValueOnce([easyShort])
          .mockResolvedValueOnce([mediumMultiple])
          .mockResolvedValueOnce([mediumShort])
          .mockResolvedValueOnce([hardEssay]),
      };

      mockQuestionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.generateQuestion();

      expect(result).toHaveLength(5);
      expect(result[0].type).toBe('multiple_choice');
      expect(result[0].question).toBe('HTTP와 HTTPS의 차이는?');
      expect(result[0].difficulty).toBe('easy');
      expect(result[4].type).toBe('essay');
      expect(result[4].difficulty).toBe('hard');
    });

    it('should convert difficulty correctly', async () => {
      const easyMultiple = {
        id: 1,
        difficulty: 1,
        questionType: 'multiple' as const,
        content: { question: 'Q1', options: { A: 'A', B: 'B', C: 'C', D: 'D' } },
        correctAnswer: 'A',
        isActive: true,
      };

      const easyShort = {
        id: 2,
        difficulty: 2,
        questionType: 'short' as const,
        content: 'Q2',
        correctAnswer: 'Answer2',
        isActive: true,
      };

      const mediumMultiple = {
        id: 3,
        difficulty: 3,
        questionType: 'multiple' as const,
        content: { question: 'Q3', options: { A: 'A', B: 'B', C: 'C', D: 'D' } },
        correctAnswer: 'B',
        isActive: true,
      };

      const mediumShort = {
        id: 4,
        difficulty: 3,
        questionType: 'short' as const,
        content: 'Q4',
        correctAnswer: 'Answer4',
        isActive: true,
      };

      const hardEssay = {
        id: 5,
        difficulty: 5,
        questionType: 'essay' as const,
        content: 'Q5',
        correctAnswer: 'Essay answer',
        isActive: true,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn()
          .mockResolvedValueOnce([easyMultiple])
          .mockResolvedValueOnce([easyShort])
          .mockResolvedValueOnce([mediumMultiple])
          .mockResolvedValueOnce([mediumShort])
          .mockResolvedValueOnce([hardEssay]),
      };

      mockQuestionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.generateQuestion();

      expect(result[0].difficulty).toBe('easy');
      expect(result[1].difficulty).toBe('easy');
      expect(result[2].difficulty).toBe('medium');
      expect(result[3].difficulty).toBe('medium');
      expect(result[4].difficulty).toBe('hard');
    });

    it('should handle short answer questions', async () => {
      const easyMultiple = {
        id: 1,
        questionType: 'multiple' as const,
        content: { question: 'Q1', options: { A: 'A', B: 'B', C: 'C', D: 'D' } },
        correctAnswer: 'A',
        difficulty: 1,
        isActive: true,
      };

      const easyShort = {
        id: 2,
        questionType: 'short' as const,
        content: '서브쿼리란?',
        correctAnswer: '쿼리 안의 쿼리',
        difficulty: 2,
        isActive: true,
      };

      const mediumMultiple = {
        id: 3,
        questionType: 'multiple' as const,
        content: { question: 'Q3', options: { A: 'A', B: 'B', C: 'C', D: 'D' } },
        correctAnswer: 'B',
        difficulty: 3,
        isActive: true,
      };

      const mediumShort = {
        id: 4,
        questionType: 'short' as const,
        content: 'JOIN이란?',
        correctAnswer: '테이블 결합',
        difficulty: 3,
        isActive: true,
      };

      const hardEssay = {
        id: 5,
        questionType: 'essay' as const,
        content: 'Essay question',
        correctAnswer: 'Essay answer',
        difficulty: 5,
        isActive: true,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn()
          .mockResolvedValueOnce([easyMultiple])
          .mockResolvedValueOnce([easyShort])
          .mockResolvedValueOnce([mediumMultiple])
          .mockResolvedValueOnce([mediumShort])
          .mockResolvedValueOnce([hardEssay]),
      };

      mockQuestionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.generateQuestion();

      expect(result[1].type).toBe('short_answer');
      if (result[1].type === 'short_answer') {
        expect(result[1].answer).toBe('쿼리 안의 쿼리');
        expect(result[1].keywords).toBeUndefined();
      }
    });

    it('should handle essay questions', async () => {
      const easyMultiple = {
        id: 1,
        questionType: 'multiple' as const,
        content: { question: 'Q1', options: { A: 'A', B: 'B', C: 'C', D: 'D' } },
        correctAnswer: 'A',
        difficulty: 1,
        isActive: true,
      };

      const easyShort = {
        id: 2,
        questionType: 'short' as const,
        content: 'Q2',
        correctAnswer: 'Answer',
        difficulty: 2,
        isActive: true,
      };

      const mediumMultiple = {
        id: 3,
        questionType: 'multiple' as const,
        content: { question: 'Q3', options: { A: 'A', B: 'B', C: 'C', D: 'D' } },
        correctAnswer: 'B',
        difficulty: 3,
        isActive: true,
      };

      const mediumShort = {
        id: 4,
        questionType: 'short' as const,
        content: 'Q4',
        correctAnswer: 'Answer',
        difficulty: 3,
        isActive: true,
      };

      const hardEssay = {
        id: 5,
        questionType: 'essay' as const,
        content: 'B+tree를 설명하세요',
        correctAnswer: 'B+tree는 균형 잡힌 트리 구조입니다.',
        difficulty: 5,
        isActive: true,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn()
          .mockResolvedValueOnce([easyMultiple])
          .mockResolvedValueOnce([easyShort])
          .mockResolvedValueOnce([mediumMultiple])
          .mockResolvedValueOnce([mediumShort])
          .mockResolvedValueOnce([hardEssay]),
      };

      mockQuestionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.generateQuestion();

      expect(result[4].type).toBe('essay');
      if (result[4].type === 'essay') {
        expect(result[4].sampleAnswer).toBe('B+tree는 균형 잡힌 트리 구조입니다.');
        expect(result[4].keywords).toBeUndefined();
      }
    });

    it('should handle null difficulty as medium', async () => {
      const easyMultiple = {
        id: 1,
        questionType: 'multiple' as const,
        content: { question: 'Q1', options: { A: 'A', B: 'B', C: 'C', D: 'D' } },
        correctAnswer: 'A',
        difficulty: null,
        isActive: true,
      };

      const easyShort = {
        id: 2,
        questionType: 'short' as const,
        content: 'Q2',
        correctAnswer: 'Answer',
        difficulty: 2,
        isActive: true,
      };

      const mediumMultiple = {
        id: 3,
        questionType: 'multiple' as const,
        content: { question: 'Q3', options: { A: 'A', B: 'B', C: 'C', D: 'D' } },
        correctAnswer: 'B',
        difficulty: 3,
        isActive: true,
      };

      const mediumShort = {
        id: 4,
        questionType: 'short' as const,
        content: 'Q4',
        correctAnswer: 'Answer',
        difficulty: 3,
        isActive: true,
      };

      const hardEssay = {
        id: 5,
        questionType: 'essay' as const,
        content: 'Q5',
        correctAnswer: 'Essay answer',
        difficulty: 5,
        isActive: true,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn()
          .mockResolvedValueOnce([easyMultiple])
          .mockResolvedValueOnce([easyShort])
          .mockResolvedValueOnce([mediumMultiple])
          .mockResolvedValueOnce([mediumShort])
          .mockResolvedValueOnce([hardEssay]),
      };

      mockQuestionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.generateQuestion();

      expect(result[0].difficulty).toBe('medium');
    });

    it('should throw error when less than 5 questions available', async () => {
      const fallbackQuestion = {
        id: 1,
        questionType: 'multiple' as const,
        content: { question: 'Q1', options: { A: 'A', B: 'B', C: 'C', D: 'D' } },
        correctAnswer: 'A',
        difficulty: 1,
        isActive: true,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn()
          .mockResolvedValueOnce([]) // easy multiple - empty
          .mockResolvedValueOnce([]) // easy short - empty
          .mockResolvedValueOnce([]) // medium multiple - empty
          .mockResolvedValueOnce([]) // medium short - empty
          .mockResolvedValueOnce([]) // hard essay - empty
          .mockResolvedValueOnce([fallbackQuestion]), // fallback query - only 1 question
      };

      mockQuestionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await expect(service.generateQuestion()).rejects.toThrow(
        '질문 생성에 실패했습니다',
      );
    });

    it('should throw error when JSON parsing fails for multiple choice', async () => {
      const invalidMultiple = {
        id: 1,
        questionType: 'multiple' as const,
        content: 'Invalid content - should be object', // Invalid: string instead of object
        correctAnswer: 'A',
        difficulty: 1,
        isActive: true,
      };

      const easyShort = {
        id: 2,
        questionType: 'short' as const,
        content: 'Q2',
        correctAnswer: 'Answer',
        difficulty: 2,
        isActive: true,
      };

      const mediumMultiple = {
        id: 3,
        questionType: 'multiple' as const,
        content: { question: 'Q3', options: { A: 'A', B: 'B', C: 'C', D: 'D' } },
        correctAnswer: 'B',
        difficulty: 3,
        isActive: true,
      };

      const mediumShort = {
        id: 4,
        questionType: 'short' as const,
        content: 'Q4',
        correctAnswer: 'Answer',
        difficulty: 3,
        isActive: true,
      };

      const hardEssay = {
        id: 5,
        questionType: 'essay' as const,
        content: 'Q5',
        correctAnswer: 'Essay answer',
        difficulty: 5,
        isActive: true,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn()
          .mockResolvedValueOnce([invalidMultiple])
          .mockResolvedValueOnce([easyShort])
          .mockResolvedValueOnce([mediumMultiple])
          .mockResolvedValueOnce([mediumShort])
          .mockResolvedValueOnce([hardEssay]),
      };

      mockQuestionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await expect(service.generateQuestion()).rejects.toThrow(
        '질문 생성 중 오류가 발생했습니다',
      );
    });

    it('should throw error when correctAnswer is missing for short answer', async () => {
      const easyMultiple = {
        id: 1,
        questionType: 'multiple' as const,
        content: { question: 'Q1', options: { A: 'A', B: 'B', C: 'C', D: 'D' } },
        correctAnswer: 'A',
        difficulty: 1,
        isActive: true,
      };

      const invalidShort = {
        id: 2,
        questionType: 'short' as const,
        content: 'Q2',
        correctAnswer: '', // Invalid: empty correctAnswer
        difficulty: 2,
        isActive: true,
      };

      const mediumMultiple = {
        id: 3,
        questionType: 'multiple' as const,
        content: { question: 'Q3', options: { A: 'A', B: 'B', C: 'C', D: 'D' } },
        correctAnswer: 'B',
        difficulty: 3,
        isActive: true,
      };

      const mediumShort = {
        id: 4,
        questionType: 'short' as const,
        content: 'Q4',
        correctAnswer: 'Answer',
        difficulty: 3,
        isActive: true,
      };

      const hardEssay = {
        id: 5,
        questionType: 'essay' as const,
        content: 'Q5',
        correctAnswer: 'Essay answer',
        difficulty: 5,
        isActive: true,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn()
          .mockResolvedValueOnce([easyMultiple])
          .mockResolvedValueOnce([invalidShort])
          .mockResolvedValueOnce([mediumMultiple])
          .mockResolvedValueOnce([mediumShort])
          .mockResolvedValueOnce([hardEssay]),
      };

      mockQuestionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await expect(service.generateQuestion()).rejects.toThrow(
        '질문 생성 중 오류가 발생했습니다',
      );
    });
  });
});
