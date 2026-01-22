import { Test, TestingModule } from '@nestjs/testing';
import { SinglePlayController } from '../src/single-play/single-play.controller';
import { SinglePlayService } from '../src/single-play/single-play.service';
import { GetQuestionsDto, SubmitAnswerDto } from '../src/single-play/dto';

describe('SinglePlayController', () => {
  let controller: SinglePlayController;

    const mockSinglePlayService = {
        getCategories: jest.fn(),
        getQuestions: jest.fn(),
        submitAnswer: jest.fn(),
        endGame: jest.fn(),
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

  describe('getQuestions', () => {
    const mockUser = { id: 'user-123', visibleId: '123', nickname: 'test', oauthProvider: 'github' as const };

    it('단일 카테고리 ID로 문제를 정상적으로 반환해야 함', async () => {
      const query: GetQuestionsDto = { categoryId: [1] };
      const mockQuestions = [
        { id: 1, questionType: 'multiple', content: 'What is React?', difficulty: 2 },
        { id: 2, questionType: 'short', content: 'Explain Node.js', difficulty: 3 },
      ];

      mockSinglePlayService.getQuestions.mockResolvedValue(mockQuestions);

      const result = await controller.getQuestions(mockUser, query);

      expect(result).toEqual({ questions: mockQuestions });
      expect(mockSinglePlayService.getQuestions).toHaveBeenCalledWith('user-123', [1]);
    });

    it('여러 카테고리 ID를 배열로 전달받아야 함', async () => {
      const query: GetQuestionsDto = { categoryId: [1, 2, 3] };
      const mockQuestions = [
        { id: 1, questionType: 'multiple', content: 'Question 1', difficulty: 2 },
      ];

      mockSinglePlayService.getQuestions.mockResolvedValue(mockQuestions);

      const result = await controller.getQuestions(mockUser, query);

      expect(result).toEqual({ questions: mockQuestions });
      expect(mockSinglePlayService.getQuestions).toHaveBeenCalledWith('user-123', [1, 2, 3]);
    });

    it('빈 문제 배열도 정상적으로 반환해야 함', async () => {
      const query: GetQuestionsDto = { categoryId: [1] };

      mockSinglePlayService.getQuestions.mockResolvedValue([]);

      const result = await controller.getQuestions(mockUser, query);

      expect(result).toEqual({ questions: [] });
    });

    it('Service 계층의 에러를 그대로 전파해야 함', async () => {
      const query: GetQuestionsDto = { categoryId: [999] };
      const error = new Error('Category not found');

      mockSinglePlayService.getQuestions.mockRejectedValue(error);

      await expect(controller.getQuestions(mockUser, query)).rejects.toThrow(error);
    });
  });

  describe('submitAnswer', () => {
    const mockUser = { id: 'user-123', visibleId: '123', nickname: 'test', oauthProvider: 'github' as const };

    it('정답 제출을 정상적으로 처리해야 함', async () => {
      const submitDto: SubmitAnswerDto = {
        questionId: 1,
        answer: 'React',
      };

      const mockResult = {
        grade: {
          answer: 'React',
          isCorrect: true,
          score: 10,
          feedback: 'Perfect!',
        },
        totalScore: 10,
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
        grade: {
          answer: 'Wrong answer',
          isCorrect: false,
          score: 0,
          feedback: 'Incorrect',
        },
        totalScore: 0,
      };

      mockSinglePlayService.submitAnswer.mockResolvedValue(mockResult);

      const result = await controller.submitAnswer(mockUser, submitDto);

      expect(result).toEqual(mockResult);
      expect(mockSinglePlayService.submitAnswer).toHaveBeenCalledWith('user-123', 2, 'Wrong answer');
    });

    it('부분 점수도 정상적으로 반환해야 함', async () => {
      const submitDto: SubmitAnswerDto = {
        questionId: 3,
        answer: 'Partial answer',
      };

      const mockResult = {
        grade: {
          answer: 'Partial answer',
          isCorrect: true,
          score: 7,
          feedback: 'Good, but needs more detail',
        },
        totalScore: 14, // Medium difficulty
      };

      mockSinglePlayService.submitAnswer.mockResolvedValue(mockResult);

      const result = await controller.submitAnswer(mockUser, submitDto);

      expect(result).toEqual(mockResult);
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

    it('빈 문자열 답변도 처리해야 함', async () => {
      const submitDto: SubmitAnswerDto = {
        questionId: 1,
        answer: '',
      };

      const mockResult = {
        grade: {
          answer: '',
          isCorrect: false,
          score: 0,
          feedback: 'No answer provided',
        },
        totalScore: 0,
      };

      mockSinglePlayService.submitAnswer.mockResolvedValue(mockResult);

      const result = await controller.submitAnswer(mockUser, submitDto);

      expect(result).toEqual(mockResult);
      expect(mockSinglePlayService.submitAnswer).toHaveBeenCalledWith('user-123', 1, '');
    });

    it('긴 서술형 답변도 정상 처리해야 함', async () => {
      const longAnswer = 'A'.repeat(1000);
      const submitDto: SubmitAnswerDto = {
        questionId: 5,
        answer: longAnswer,
      };

      const mockResult = {
        grade: {
          answer: longAnswer,
          isCorrect: true,
          score: 9,
          feedback: 'Excellent detailed answer',
        },
        totalScore: 27, // Hard difficulty
      };

      mockSinglePlayService.submitAnswer.mockResolvedValue(mockResult);

      const result = await controller.submitAnswer(mockUser, submitDto);

      expect(result).toEqual(mockResult);
      expect(mockSinglePlayService.submitAnswer).toHaveBeenCalledWith('user-123', 5, longAnswer);
    });
  });

  describe('endGame', () => {
    const mockUser = { id: 'user-123', visibleId: '123', nickname: 'test', oauthProvider: 'github' as const };

    it('게임을 정상적으로 종료하고 통계를 반환해야 함', () => {
      const mockResult = {
        message: '게임이 종료되었습니다.',
        finalStats: {
          totalQuestions: 10,
          answeredQuestions: 7,
          correctAnswers: 5,
          totalScore: 85,
        },
      };

      mockSinglePlayService.endGame.mockReturnValue(mockResult);

      const result = controller.endGame(mockUser);

      expect(result).toEqual(mockResult);
      expect(mockSinglePlayService.endGame).toHaveBeenCalledWith('user-123');
    });

    it('답안을 하나도 제출하지 않고 종료해도 정상 처리해야 함', () => {
      const mockResult = {
        message: '게임이 종료되었습니다.',
        finalStats: {
          totalQuestions: 10,
          answeredQuestions: 0,
          correctAnswers: 0,
          totalScore: 0,
        },
      };

      mockSinglePlayService.endGame.mockReturnValue(mockResult);

      const result = controller.endGame(mockUser);

      expect(result).toEqual(mockResult);
    });

    it('Service 계층의 에러를 그대로 전파해야 함', () => {
      const error = new Error('Game session not found');
      mockSinglePlayService.endGame.mockImplementation(() => {
        throw error;
      });

      expect(() => controller.endGame(mockUser)).toThrow(error);
    });
  });
});
