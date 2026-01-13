import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuizService } from '../../src/quiz/quiz.service';
import { Question as QuestionEntity, Category } from '../../src/quiz/entity';
import { ClovaClientService } from '../../src/quiz/clova/clova-client.service';

describe('QuizService', () => {
  let service: QuizService;

  const mockQuestionRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockCategoryRepository = {
    find: jest.fn(),
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
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepository,
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

  describe('generateSinglePlayQuestions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return 10 questions from selected parent categories', async () => {
      // Mock child categories for parent category 1 (DB)
      const dbChildren = [
        { id: 11 },
        { id: 12 },
        { id: 13 },
      ];

      // Mock child categories for parent category 2 (Network)
      const networkChildren = [
        { id: 21 },
        { id: 22 },
      ];

      // Mock questions from DB category
      const dbQuestions = [
        {
          id: 1,
          questionType: 'short' as const,
          content: 'SQL이란?',
          correctAnswer: 'Structured Query Language',
          difficulty: 2,
          isActive: true,
        },
        {
          id: 2,
          questionType: 'multiple' as const,
          content: { question: 'NoSQL의 특징은?', options: { A: '유연한 스키마', B: '고정 스키마', C: '느린 속도', D: '복잡함' } },
          correctAnswer: 'A',
          difficulty: 3,
          isActive: true,
        },
        {
          id: 3,
          questionType: 'essay' as const,
          content: '트랜잭션을 설명하세요',
          correctAnswer: '트랜잭션은 데이터베이스의 상태를 변화시키는 하나의 논리적 작업 단위입니다.',
          difficulty: 4,
          isActive: true,
        },
        {
          id: 4,
          questionType: 'short' as const,
          content: 'Index란?',
          correctAnswer: '데이터 검색 속도를 향상시키는 자료구조',
          difficulty: 3,
          isActive: true,
        },
        {
          id: 5,
          questionType: 'multiple' as const,
          content: { question: 'ACID 속성에 포함되지 않는 것은?', options: { A: 'Atomicity', B: 'Consistency', C: 'Isolation', D: 'Flexibility' } },
          correctAnswer: 'D',
          difficulty: 3,
          isActive: true,
        },
      ];

      // Mock questions from Network category
      const networkQuestions = [
        {
          id: 6,
          questionType: 'short' as const,
          content: 'HTTP란?',
          correctAnswer: 'HyperText Transfer Protocol',
          difficulty: 1,
          isActive: true,
        },
        {
          id: 7,
          questionType: 'multiple' as const,
          content: { question: 'TCP와 UDP의 차이는?', options: { A: '연결형 vs 비연결형', B: '동일함', C: '차이 없음', D: '모름' } },
          correctAnswer: 'A',
          difficulty: 2,
          isActive: true,
        },
        {
          id: 8,
          questionType: 'essay' as const,
          content: 'OSI 7계층을 설명하세요',
          correctAnswer: 'OSI 7계층은 네트워크 프로토콜을 7개 계층으로 나눈 표준 모델입니다.',
          difficulty: 4,
          isActive: true,
        },
        {
          id: 9,
          questionType: 'short' as const,
          content: 'IP란?',
          correctAnswer: 'Internet Protocol',
          difficulty: 1,
          isActive: true,
        },
        {
          id: 10,
          questionType: 'multiple' as const,
          content: { question: 'HTTPS의 기본 포트는?', options: { A: '80', B: '443', C: '8080', D: '3000' } },
          correctAnswer: 'B',
          difficulty: 2,
          isActive: true,
        },
      ];

      // Mock categoryRepository.find - 3번 호출됨 (첫 번째 루프 2회, 두 번째 루프 2회, 총 4회이지만 각 대분류당 1회씩 실제로는 총 4회)
      mockCategoryRepository.find
        .mockResolvedValueOnce(dbChildren) // 첫 번째 for문에서 parent 1 조회
        .mockResolvedValueOnce(networkChildren) // 첫 번째 for문에서 parent 2 조회
        .mockResolvedValueOnce(dbChildren) // 두 번째 for문에서 parent 1 조회
        .mockResolvedValueOnce(networkChildren); // 두 번째 for문에서 parent 2 조회

      // Mock queryBuilder for questions
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn()
          .mockResolvedValueOnce(dbQuestions) // DB 카테고리에서 5문제
          .mockResolvedValueOnce(networkQuestions), // Network 카테고리에서 5문제
      };

      mockQuestionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.generateSinglePlayQuestions([1, 2], 10);

      expect(result).toHaveLength(10);
      expect(mockCategoryRepository.find).toHaveBeenCalledTimes(4); // 첫 번째 루프 2회 + 두 번째 루프 2회
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'cq.categoryId IN (:...childIds)',
        expect.objectContaining({ childIds: expect.any(Array) })
      );
    });

    it('should distribute questions evenly across parent categories', async () => {
      // 3개 카테고리에 10문제 분배: 4, 3, 3
      const category1Children = [{ id: 11 }];
      const category2Children = [{ id: 21 }];
      const category3Children = [{ id: 31 }];

      const questions1 = [
        {
          id: 1,
          questionType: 'short' as const,
          content: 'Q1',
          correctAnswer: 'A1',
          difficulty: 2,
          isActive: true,
        },
        {
          id: 2,
          questionType: 'short' as const,
          content: 'Q2',
          correctAnswer: 'A2',
          difficulty: 2,
          isActive: true,
        },
        {
          id: 3,
          questionType: 'short' as const,
          content: 'Q3',
          correctAnswer: 'A3',
          difficulty: 2,
          isActive: true,
        },
        {
          id: 4,
          questionType: 'short' as const,
          content: 'Q4',
          correctAnswer: 'A4',
          difficulty: 2,
          isActive: true,
        },
      ];

      const questions2 = [
        {
          id: 5,
          questionType: 'short' as const,
          content: 'Q5',
          correctAnswer: 'A5',
          difficulty: 2,
          isActive: true,
        },
        {
          id: 6,
          questionType: 'short' as const,
          content: 'Q6',
          correctAnswer: 'A6',
          difficulty: 2,
          isActive: true,
        },
        {
          id: 7,
          questionType: 'short' as const,
          content: 'Q7',
          correctAnswer: 'A7',
          difficulty: 2,
          isActive: true,
        },
      ];

      const questions3 = [
        {
          id: 8,
          questionType: 'short' as const,
          content: 'Q8',
          correctAnswer: 'A8',
          difficulty: 2,
          isActive: true,
        },
        {
          id: 9,
          questionType: 'short' as const,
          content: 'Q9',
          correctAnswer: 'A9',
          difficulty: 2,
          isActive: true,
        },
        {
          id: 10,
          questionType: 'short' as const,
          content: 'Q10',
          correctAnswer: 'A10',
          difficulty: 2,
          isActive: true,
        },
      ];

      mockCategoryRepository.find
        .mockResolvedValueOnce(category1Children)
        .mockResolvedValueOnce(category2Children)
        .mockResolvedValueOnce(category3Children)
        .mockResolvedValueOnce(category1Children)
        .mockResolvedValueOnce(category2Children)
        .mockResolvedValueOnce(category3Children);

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn()
          .mockResolvedValueOnce(questions1) // 첫 번째 카테고리: 4문제
          .mockResolvedValueOnce(questions2) // 두 번째 카테고리: 3문제
          .mockResolvedValueOnce(questions3), // 세 번째 카테고리: 3문제
      };

      mockQuestionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.generateSinglePlayQuestions([1, 2, 3], 10);

      expect(result).toHaveLength(10);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(4); // 첫 번째: 3 + 1(나머지)
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(3); // 두 번째: 3
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(3); // 세 번째: 3
    });

    it('should throw error when no parent categories provided', async () => {
      await expect(service.generateSinglePlayQuestions([], 10)).rejects.toThrow(
        '카테고리를 선택해주세요.'
      );
    });

    it('should throw error when no child categories found', async () => {
      mockCategoryRepository.find.mockResolvedValue([]); // 하위 카테고리 없음

      await expect(service.generateSinglePlayQuestions([1], 10)).rejects.toThrow(
        '선택한 카테고리에 하위 카테고리가 없습니다.'
      );
    });

    it('should throw error when no questions found', async () => {
      const childCategories = [{ id: 11 }, { id: 12 }];

      mockCategoryRepository.find
        .mockResolvedValueOnce(childCategories)
        .mockResolvedValueOnce(childCategories);

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]), // 문제 없음
      };

      mockQuestionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await expect(service.generateSinglePlayQuestions([1], 10)).rejects.toThrow(
        '선택한 카테고리에 문제가 없습니다.'
      );
    });

    it('should query questions with correct filters', async () => {
      const childCategories = [{ id: 11 }, { id: 12 }];

      const mockQuestions = [
        {
          id: 1,
          questionType: 'short' as const,
          content: 'Test question',
          correctAnswer: 'Test answer',
          difficulty: 2,
          isActive: true,
        },
      ];

      mockCategoryRepository.find
        .mockResolvedValueOnce(childCategories)
        .mockResolvedValueOnce(childCategories);

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockQuestions),
      };

      mockQuestionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.generateSinglePlayQuestions([1], 10);

      // 올바른 조인 확인
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith('q.categoryQuestions', 'cq');

      // 활성화된 문제만 조회
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('q.isActive = :isActive', { isActive: true });

      // 하위 카테고리 ID로 필터링
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'cq.categoryId IN (:...childIds)',
        { childIds: [11, 12] }
      );

      // 정렬 순서 확인
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('q.usageCount', 'ASC');
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('q.qualityScore', 'DESC');
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('RANDOM()');
    });
  });
});
