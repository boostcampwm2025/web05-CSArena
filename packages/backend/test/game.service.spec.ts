import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { GameService } from '../src/game/game.service';
import { GameSessionManager } from '../src/game/game-session-manager';
import { QuizService } from '../src/quiz/quiz.service';
import { Match, Round, RoundAnswer } from '../src/match/entity';
import { Question as QuestionEntity } from '../src/quiz/entity';
import { SCORE_MAP, SPEED_BONUS } from '../src/quiz/quiz.constants';

describe('GameService - AI Score Weighted Grading Logic', () => {
  let gameService: GameService;
  let sessionManager: GameSessionManager;
  let quizService: QuizService;

  const mockMatchRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockRoundRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockAnswerRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  const mockQuizService = {
    getQuestionsForGame: jest.fn(),
    gradeQuestion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        GameSessionManager,
        {
          provide: getRepositoryToken(Match),
          useValue: mockMatchRepo,
        },
        {
          provide: getRepositoryToken(Round),
          useValue: mockRoundRepo,
        },
        {
          provide: getRepositoryToken(RoundAnswer),
          useValue: mockAnswerRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: QuizService,
          useValue: mockQuizService,
        },
      ],
    }).compile();

    gameService = module.get<GameService>(GameService);
    sessionManager = module.get<GameSessionManager>(GameSessionManager);
    quizService = module.get<QuizService>(QuizService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processGrading - AI Score with Difficulty Weighting', () => {
    const roomId = 'test-room';
    const player1Id = 'player1';
    const player2Id = 'player2';

    beforeEach(() => {
      // Create game session
      sessionManager.createGameSession(
        roomId,
        player1Id,
        'socket1',
        { nickname: 'Player1', tier: 'gold', exp_point: 1500 },
        player2Id,
        'socket2',
        { nickname: 'Player2', tier: 'silver', exp_point: 1200 },
      );
      sessionManager.startNextRound(roomId);
    });

    it('Easy 난이도 (만점 10점) - AI 점수 10점이면 10점 획득', async () => {
      const mockQuestion: QuestionEntity = {
        id: 1,
        questionType: 'short',
        difficulty: 1, // Easy
        content: 'What is TCP?',
        correctAnswer: 'Transmission Control Protocol',
      } as any;

      sessionManager.setQuestion(roomId, mockQuestion);
      sessionManager.submitAnswer(roomId, player1Id, 'Transmission Control Protocol');
      sessionManager.submitAnswer(roomId, player2Id, 'Transport Control Protocol');

      // AI가 player1에게 만점(10점), player2에게 부분점수(7점) 부여
      mockQuizService.gradeQuestion.mockResolvedValue([
        {
          playerId: player1Id,
          answer: 'Transmission Control Protocol',
          isCorrect: true,
          score: 10,
          feedback: 'Perfect!',
        },
        {
          playerId: player2Id,
          answer: 'Transport Control Protocol',
          isCorrect: true,
          score: 7,
          feedback: 'Close but slightly incorrect',
        },
      ]);

      const result = await gameService.processGrading(roomId);

      // Easy 난이도 만점 = 10점
      // player1: (10/10) * 10 = 10점 + 스피드보너스 5점 = 15점
      // player2: (7/10) * 10 = 7점
      expect(result.grades[0].score).toBe(15); // 10 + SPEED_BONUS(5)
      expect(result.grades[1].score).toBe(7);
    });

    it('Medium 난이도 (만점 20점) - AI 점수 비율 적용', async () => {
      const mockQuestion: QuestionEntity = {
        id: 2,
        questionType: 'essay',
        difficulty: 3, // Medium
        content: 'Explain how TCP works',
        correctAnswer: 'TCP is a connection-oriented protocol...',
      } as any;

      sessionManager.setQuestion(roomId, mockQuestion);
      sessionManager.submitAnswer(roomId, player1Id, 'Detailed TCP explanation');
      sessionManager.submitAnswer(roomId, player2Id, 'Basic TCP explanation');

      // AI가 player1에게 8점, player2에게 5점 부여
      mockQuizService.gradeQuestion.mockResolvedValue([
        {
          playerId: player1Id,
          answer: 'Detailed TCP explanation',
          isCorrect: true,
          score: 8,
          feedback: 'Good explanation',
        },
        {
          playerId: player2Id,
          answer: 'Basic TCP explanation',
          isCorrect: true,
          score: 5,
          feedback: 'Needs more detail',
        },
      ]);

      const result = await gameService.processGrading(roomId);

      // Medium 난이도 만점 = 20점
      // player1: (8/10) * 20 = 16점
      // player2: (5/10) * 20 = 10점
      expect(result.grades[0].score).toBe(16);
      expect(result.grades[1].score).toBe(10);
    });

    it('Hard 난이도 (만점 30점) - AI 점수 비율 적용', async () => {
      const mockQuestion: QuestionEntity = {
        id: 3,
        questionType: 'essay',
        difficulty: 5, // Hard
        content: 'Explain TCP congestion control algorithms',
        correctAnswer: 'TCP congestion control uses slow start, congestion avoidance...',
      } as any;

      sessionManager.setQuestion(roomId, mockQuestion);
      sessionManager.submitAnswer(roomId, player1Id, 'Complete answer with all algorithms');
      sessionManager.submitAnswer(roomId, player2Id, 'Partial answer');

      // AI가 player1에게 9점, player2에게 4점 부여
      mockQuizService.gradeQuestion.mockResolvedValue([
        {
          playerId: player1Id,
          answer: 'Complete answer with all algorithms',
          isCorrect: true,
          score: 9,
          feedback: 'Excellent',
        },
        {
          playerId: player2Id,
          answer: 'Partial answer',
          isCorrect: true,
          score: 4,
          feedback: 'Incomplete',
        },
      ]);

      const result = await gameService.processGrading(roomId);

      // Hard 난이도 만점 = 30점
      // player1: (9/10) * 30 = 27점
      // player2: (4/10) * 30 = 12점
      expect(result.grades[0].score).toBe(27);
      expect(result.grades[1].score).toBe(12);
    });

    it('객관식 - 정답이면 10점(AI), 오답이면 0점', async () => {
      const mockQuestion: QuestionEntity = {
        id: 4,
        questionType: 'multiple',
        difficulty: 3, // Medium
        content: JSON.stringify({
          question: 'What is HTTP?',
          options: {
            A: 'HyperText Transfer Protocol',
            B: 'HyperText Transmission Protocol',
            C: 'HighText Transfer Protocol',
            D: 'HyperText Transport Protocol',
          },
        }),
        correctAnswer: 'A',
      } as any;

      sessionManager.setQuestion(roomId, mockQuestion);
      sessionManager.submitAnswer(roomId, player1Id, 'A');
      sessionManager.submitAnswer(roomId, player2Id, 'B');

      // 객관식은 정답=10점, 오답=0점
      mockQuizService.gradeQuestion.mockResolvedValue([
        {
          playerId: player1Id,
          answer: 'A',
          isCorrect: true,
          score: 10,
          feedback: 'Correct!',
        },
        {
          playerId: player2Id,
          answer: 'B',
          isCorrect: false,
          score: 0,
          feedback: 'Wrong. The answer was A.',
        },
      ]);

      const result = await gameService.processGrading(roomId);

      // Medium 난이도 만점 = 20점
      // player1: (10/10) * 20 = 20점 + 스피드보너스 5점 = 25점
      // player2: 0점
      expect(result.grades[0].score).toBe(25); // 20 + SPEED_BONUS(5)
      expect(result.grades[1].score).toBe(0);
    });

    it('스피드 보너스는 AI 만점자(10점)만 받음', async () => {
      const mockQuestion: QuestionEntity = {
        id: 5,
        questionType: 'short',
        difficulty: 2, // Easy
        content: 'What is DNS?',
        correctAnswer: 'Domain Name System',
      } as any;

      sessionManager.setQuestion(roomId, mockQuestion);

      // player1이 먼저 제출하고 AI 만점(10점)
      sessionManager.submitAnswer(roomId, player1Id, 'Domain Name System');
      await new Promise((resolve) => setTimeout(resolve, 10)); // 시간 차이
      sessionManager.submitAnswer(roomId, player2Id, 'Domain Name System');

      // player1이 먼저 제출하고 만점(10점), player2는 나중 제출하고 부분점수(9점)
      mockQuizService.gradeQuestion.mockResolvedValue([
        {
          playerId: player1Id,
          answer: 'Domain Name System',
          isCorrect: true,
          score: 10, // 만점
          feedback: 'Perfect!',
        },
        {
          playerId: player2Id,
          answer: 'Domain Name System',
          isCorrect: true,
          score: 9, // 만점 아님
          feedback: 'Almost perfect',
        },
      ]);

      const result = await gameService.processGrading(roomId);

      // Easy 난이도 만점 = 10점
      // player1: (10/10) * 10 = 10점 + 스피드보너스 5점 = 15점 (만점자 중 가장 빠름)
      // player2: (9/10) * 10 = 9점 (만점이 아니라서 보너스 없음)
      expect(result.grades[0].score).toBe(15);
      expect(result.grades[1].score).toBe(9);
    });

    it('둘 다 오답이면 0점', async () => {
      const mockQuestion: QuestionEntity = {
        id: 6,
        questionType: 'short',
        difficulty: 3, // Medium
        content: 'What is UDP?',
        correctAnswer: 'User Datagram Protocol',
      } as any;

      sessionManager.setQuestion(roomId, mockQuestion);
      sessionManager.submitAnswer(roomId, player1Id, 'Universal Data Protocol');
      sessionManager.submitAnswer(roomId, player2Id, 'Unknown Data Protocol');

      mockQuizService.gradeQuestion.mockResolvedValue([
        {
          playerId: player1Id,
          answer: 'Universal Data Protocol',
          isCorrect: false,
          score: 0,
          feedback: 'Incorrect',
        },
        {
          playerId: player2Id,
          answer: 'Unknown Data Protocol',
          isCorrect: false,
          score: 0,
          feedback: 'Incorrect',
        },
      ]);

      const result = await gameService.processGrading(roomId);

      expect(result.grades[0].score).toBe(0);
      expect(result.grades[1].score).toBe(0);
    });

    it('난이도가 null이면 Medium으로 처리', async () => {
      const mockQuestion: QuestionEntity = {
        id: 7,
        questionType: 'short',
        difficulty: null, // null
        content: 'What is IP?',
        correctAnswer: 'Internet Protocol',
      } as any;

      sessionManager.setQuestion(roomId, mockQuestion);
      sessionManager.submitAnswer(roomId, player1Id, 'Internet Protocol');
      sessionManager.submitAnswer(roomId, player2Id, 'Internet Protocol');

      mockQuizService.gradeQuestion.mockResolvedValue([
        {
          playerId: player1Id,
          answer: 'Internet Protocol',
          isCorrect: true,
          score: 10,
          feedback: 'Perfect!',
        },
        {
          playerId: player2Id,
          answer: 'Internet Protocol',
          isCorrect: true,
          score: 6,
          feedback: 'Good',
        },
      ]);

      const result = await gameService.processGrading(roomId);

      // Medium으로 처리 (만점 20점)
      // player1: (10/10) * 20 = 20점 + 스피드보너스 5점 = 25점
      // player2: (6/10) * 20 = 12점
      expect(result.grades[0].score).toBe(25);
      expect(result.grades[1].score).toBe(12);
    });

    it('점수는 반올림 처리됨', async () => {
      const mockQuestion: QuestionEntity = {
        id: 8,
        questionType: 'essay',
        difficulty: 3, // Medium (만점 20점)
        content: 'Explain HTTP methods',
        correctAnswer: 'GET, POST, PUT, DELETE...',
      } as any;

      sessionManager.setQuestion(roomId, mockQuestion);
      sessionManager.submitAnswer(roomId, player1Id, 'GET, POST, PUT');
      sessionManager.submitAnswer(roomId, player2Id, 'GET, POST');

      // AI가 3.3점과 6.6점에 해당하는 상황
      mockQuizService.gradeQuestion.mockResolvedValue([
        {
          playerId: player1Id,
          answer: 'GET, POST, PUT',
          isCorrect: true,
          score: 3, // (3/10) * 20 = 6점
          feedback: 'Partial',
        },
        {
          playerId: player2Id,
          answer: 'GET, POST',
          isCorrect: true,
          score: 7, // (7/10) * 20 = 14점
          feedback: 'Good',
        },
      ]);

      const result = await gameService.processGrading(roomId);

      expect(result.grades[0].score).toBe(6); // Math.round((3/10) * 20) = 6
      expect(result.grades[1].score).toBe(14); // Math.round((7/10) * 20) = 14
    });
  });

  describe('Score Mapping Constants Verification', () => {
    it('SCORE_MAP 상수가 올바른 값을 가져야 함', () => {
      expect(SCORE_MAP.easy).toBe(10);
      expect(SCORE_MAP.medium).toBe(20);
      expect(SCORE_MAP.hard).toBe(30);
    });

    it('SPEED_BONUS 상수가 올바른 값을 가져야 함', () => {
      expect(SPEED_BONUS).toBe(5);
    });
  });
});
