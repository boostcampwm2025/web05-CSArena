import { Test, TestingModule } from '@nestjs/testing';
import { SinglePlayController } from '../src/single-play/single-play.controller';
import { SinglePlayService } from '../src/single-play/single-play.service';
import { GetQuestionDto, SubmitAnswerDto } from '../src/single-play/dto';

describe('SinglePlayController', () => {
  let controller: SinglePlayController;

  const mockSinglePlayService = {
    getCategories: jest.fn(),
    getQuestion: jest.fn(),
    submitAnswer: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SinglePlayController],
      providers: [
        {
          provide: SinglePlayService,
          useValue: mockSinglePlayService,
        },
      ],
    }).compile();

    controller = module.get<SinglePlayController>(SinglePlayController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCategories', () => {
    it('카테고리 목록을 정상적으로 반환해야 함', async () => {
      const mockCategories = [
        { id: 1, name: '프론트엔드' },
        { id: 2, name: '백엔드' },
        { id: 3, name: 'DevOps' },
      ];

      mockSinglePlayService.getCategories.mockResolvedValue(mockCategories);

      const result = await controller.getCategories();

      expect(result).toEqual({ categories: mockCategories });
      expect(mockSinglePlayService.getCategories).toHaveBeenCalledTimes(1);
    });

    it('빈 카테고리 배열도 정상적으로 반환해야 함', async () => {
      mockSinglePlayService.getCategories.mockResolvedValue([]);

      const result = await controller.getCategories();

      expect(result).toEqual({ categories: [] });
    });

    it('Service 계층의 에러를 그대로 전파해야 함', async () => {
      const error = new Error('Database error');
      mockSinglePlayService.getCategories.mockRejectedValue(error);

      await expect(controller.getCategories()).rejects.toThrow(error);
    });
  });

  describe('getQuestion', () => {
    it('단일 카테고리 ID로 문제 1개를 정상적으로 반환해야 함', async () => {
      const query: GetQuestionDto = { categoryId: [1] };
      const mockQuestion = {
        id: 1,
        questionType: 'multiple',
        content: 'What is React?',
        difficulty: 2,
      };

      mockSinglePlayService.getQuestion.mockResolvedValue(mockQuestion);

      const result = await controller.getQuestion(query);

      expect(result).toEqual({ question: mockQuestion });
      expect(mockSinglePlayService.getQuestion).toHaveBeenCalledWith([1]);
    });

    it('여러 카테고리 ID를 배열로 전달받아야 함', async () => {
      const query: GetQuestionDto = { categoryId: [1, 2, 3] };
      const mockQuestion = {
        id: 1,
        questionType: 'multiple',
        content: 'Question 1',
        difficulty: 2,
      };

      mockSinglePlayService.getQuestion.mockResolvedValue(mockQuestion);

      const result = await controller.getQuestion(query);

      expect(result).toEqual({ question: mockQuestion });
      expect(mockSinglePlayService.getQuestion).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('Service 계층의 에러를 그대로 전파해야 함', async () => {
      const query: GetQuestionDto = { categoryId: [999] };
      const error = new Error('Category not found');

      mockSinglePlayService.getQuestion.mockRejectedValue(error);

      await expect(controller.getQuestion(query)).rejects.toThrow(error);
    });
  });

  describe('submitAnswer', () => {
    const mockUser = {
      id: 'user-123',
      visibleId: '123',
      nickname: 'test',
      oauthProvider: 'github' as const,
    };

    it('정답 제출을 정상적으로 처리해야 함', async () => {
      const submitDto: SubmitAnswerDto = {
        questionId: 1,
        answer: 'React',
      };

      const mockResult = {
        score: 10,
        question: {
          id: 1,
          content: 'What is React?',
          correctAnswer: 'React',
        },
        userAnswer: 'React',
        correctAnswer: 'React',
        aiFeedback: 'Perfect!',
      };

      mockSinglePlayService.submitAnswer.mockResolvedValue(mockResult);

      const result = await controller.submitAnswer(mockUser, submitDto);

      expect(result).toEqual(mockResult);
      expect(mockSinglePlayService.submitAnswer).toHaveBeenCalledWith('user-123', 1, 'React');
    });

    it('오답 제출도 정상적으로 처리해야 함', async () => {
      const submitDto: SubmitAnswerDto = {
        questionId: 2,
        answer: 'Wrong answer',
      };

      const mockResult = {
        score: 0,
        question: {
          id: 2,
          content: 'What is Node?',
          correctAnswer: 'Node.js',
        },
        userAnswer: 'Wrong answer',
        correctAnswer: 'Node.js',
        aiFeedback: 'Incorrect',
      };

      mockSinglePlayService.submitAnswer.mockResolvedValue(mockResult);

      const result = await controller.submitAnswer(mockUser, submitDto);

      expect(result).toEqual(mockResult);
      expect(mockSinglePlayService.submitAnswer).toHaveBeenCalledWith(
        'user-123',
        2,
        'Wrong answer',
      );
    });

    it('Service 계층의 에러를 그대로 전파해야 함', async () => {
      const submitDto: SubmitAnswerDto = {
        questionId: 999,
        answer: 'Answer',
      };

      const error = new Error('Question not found');
      mockSinglePlayService.submitAnswer.mockRejectedValue(error);

      await expect(controller.submitAnswer(mockUser, submitDto)).rejects.toThrow(error);
    });
  });
});
