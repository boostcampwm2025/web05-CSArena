import { Test, TestingModule } from '@nestjs/testing';
import { RoundProgressionService } from '../src/game/round-progression.service';
import { GameSessionManager } from '../src/game/game-session-manager';
import { QuizService } from '../src/quiz/quiz.service';
import { RoundTimer } from '../src/game/round-timer';
import { MatchPersistenceService } from '../src/game/match-persistence.service';
import { Question as QuestionEntity } from '../src/quiz/entity';
import { SCORE_MAP, SPEED_BONUS } from '../src/quiz/quiz.constants';
import { MetricsService } from '../src/metrics';

describe('RoundProgressionService - AI Score Weighted Grading Logic', () => {
  let roundProgressionService: RoundProgressionService;
  let sessionManager: GameSessionManager;

  const mockQuizService = {
    getQuestionsForGame: jest.fn(),
    gradeQuestion: jest.fn(),
    extractCategory: jest.fn().mockReturnValue(['네트워크', 'TCP/IP']),
    calculateGameScore: jest.fn((aiScore: number, difficulty: number | null, isCorrect: boolean) => {
      if (!isCorrect) return 0;
      const difficultyLevel =
        !difficulty ? 'medium' : difficulty <= 2 ? 'easy' : difficulty === 3 ? 'medium' : 'hard';
      const maxScore = SCORE_MAP[difficultyLevel];
      return Math.round((aiScore / 10) * maxScore);
    }),
  };

  const mockRoundTimer = {
    startReadyCountdown: jest.fn(),
    startQuestionTimer: jest.fn(),
    startReviewTimer: jest.fn(),
    startTickInterval: jest.fn(),
    clearQuestionTimer: jest.fn(),
    clearTickInterval: jest.fn(),
    clearAllTimers: jest.fn(),
  };

  const mockMatchPersistence = {
    saveMatchToDatabase: jest.fn(),
  };

  const mockMetricsService = {
    incrementActiveGames: jest.fn(),
    decrementActiveGames: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoundProgressionService,
        GameSessionManager,
        {
          provide: QuizService,
          useValue: mockQuizService,
        },
        {
          provide: RoundTimer,
          useValue: mockRoundTimer,
        },
        {
          provide: MatchPersistenceService,
          useValue: mockMatchPersistence,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    roundProgressionService = module.get<RoundProgressionService>(RoundProgressionService);
    sessionManager = module.get<GameSessionManager>(GameSessionManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processGrading - AI Score with Difficulty Weighting', () => {
    const roomId = 'test-room';
    const player1Id = 'player1';
    const player2Id = 'player2';

    beforeEach(() => {
      sessionManager.createGameSession(
        roomId,
        player1Id,
        'socket1',
        { nickname: 'Player1', profileImage: null, tier: 'gold', tierPoint: 1500, exp_point: 1500 },
        player2Id,
        'socket2',
        { nickname: 'Player2', profileImage: null, tier: 'silver', tierPoint: 1200, exp_point: 1200 },
      );
      sessionManager.startNextRound(roomId);
    });

    it('Easy 난이도 (만점 10점) - AI 점수 10점이면 10점 획득', async () => {
      const mockQuestion: QuestionEntity = {
        id: 1,
        questionType: 'short',
        difficulty: 1,
        content: 'What is TCP?',
        correctAnswer: 'Transmission Control Protocol',
      } as QuestionEntity;

      sessionManager.setQuestion(roomId, mockQuestion);
      sessionManager.submitAnswer(roomId, player1Id, 'Transmission Control Protocol');
      sessionManager.submitAnswer(roomId, player2Id, 'Transport Control Protocol');

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

      // phaseGrading을 직접 호출 (private 메서드 테스트를 위해 any로 캐스팅)
      await (roundProgressionService as any).processGrading(roomId);

      const result = sessionManager.getRoundResult(roomId);

      // Easy 난이도 만점 = 10점
      // player1: (10/10) * 10 = 10점 + 스피드보너스 5점 = 15점
      // player2: (7/10) * 10 = 7점
      expect(result.grades[0].score).toBe(15);
      expect(result.grades[1].score).toBe(7);
    });

    it('Medium 난이도 (만점 20점) - AI 점수 비율 적용', async () => {
      const mockQuestion: QuestionEntity = {
        id: 2,
        questionType: 'essay',
        difficulty: 3,
        content: 'Explain how TCP works',
        correctAnswer: 'TCP is a connection-oriented protocol...',
      } as QuestionEntity;

      sessionManager.setQuestion(roomId, mockQuestion);
      sessionManager.submitAnswer(roomId, player1Id, 'Detailed TCP explanation');
      sessionManager.submitAnswer(roomId, player2Id, 'Basic TCP explanation');

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

      await (roundProgressionService as any).processGrading(roomId);

      const result = sessionManager.getRoundResult(roomId);

      // Medium 난이도 만점 = 20점
      // player1: (8/10) * 20 = 16점 + 스피드보너스 5점 = 21점
      // player2: (5/10) * 20 = 10점
      expect(result.grades[0].score).toBe(21);
      expect(result.grades[1].score).toBe(10);
    });

    it('Hard 난이도 (만점 30점) - AI 점수 비율 적용', async () => {
      const mockQuestion: QuestionEntity = {
        id: 3,
        questionType: 'essay',
        difficulty: 5,
        content: 'Explain TCP congestion control algorithms',
        correctAnswer: 'TCP congestion control uses slow start, congestion avoidance...',
      } as QuestionEntity;

      sessionManager.setQuestion(roomId, mockQuestion);
      sessionManager.submitAnswer(roomId, player1Id, 'Complete answer with all algorithms');
      sessionManager.submitAnswer(roomId, player2Id, 'Partial answer');

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

      await (roundProgressionService as any).processGrading(roomId);

      const result = sessionManager.getRoundResult(roomId);

      // Hard 난이도 만점 = 30점
      // player1: (9/10) * 30 = 27점 + 스피드보너스 5점 = 32점
      // player2: (4/10) * 30 = 12점
      expect(result.grades[0].score).toBe(32);
      expect(result.grades[1].score).toBe(12);
    });

    it('객관식 - 정답이면 10점(AI), 오답이면 0점', async () => {
      const mockQuestion: QuestionEntity = {
        id: 4,
        questionType: 'multiple',
        difficulty: 3,
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
      } as QuestionEntity;

      sessionManager.setQuestion(roomId, mockQuestion);
      sessionManager.submitAnswer(roomId, player1Id, 'A');
      sessionManager.submitAnswer(roomId, player2Id, 'B');

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

      await (roundProgressionService as any).processGrading(roomId);

      const result = sessionManager.getRoundResult(roomId);

      // Medium 난이도 만점 = 20점
      // player1: (10/10) * 20 = 20점 + 스피드보너스 5점 = 25점
      // player2: 0점
      expect(result.grades[0].score).toBe(25);
      expect(result.grades[1].score).toBe(0);
    });

    it('스피드 보너스는 정답자 중 가장 빠른 사람이 받음', async () => {
      const mockQuestion: QuestionEntity = {
        id: 5,
        questionType: 'short',
        difficulty: 2,
        content: 'What is DNS?',
        correctAnswer: 'Domain Name System',
      } as QuestionEntity;

      sessionManager.setQuestion(roomId, mockQuestion);

      sessionManager.submitAnswer(roomId, player1Id, 'Domain Name System');
      await new Promise((resolve) => setTimeout(resolve, 10));
      sessionManager.submitAnswer(roomId, player2Id, 'Domain Name System');

      mockQuizService.gradeQuestion.mockResolvedValue([
        {
          playerId: player1Id,
          answer: 'Domain Name System',
          isCorrect: true,
          score: 7,
          feedback: 'Good',
        },
        {
          playerId: player2Id,
          answer: 'Domain Name System',
          isCorrect: true,
          score: 10,
          feedback: 'Perfect!',
        },
      ]);

      await (roundProgressionService as any).processGrading(roomId);

      const result = sessionManager.getRoundResult(roomId);

      // Easy 난이도 만점 = 10점
      // player1: (7/10) * 10 = 7점 + 스피드보너스 5점 = 12점
      // player2: (10/10) * 10 = 10점
      expect(result.grades[0].score).toBe(12);
      expect(result.grades[1].score).toBe(10);
    });

    it('둘 다 오답이면 0점', async () => {
      const mockQuestion: QuestionEntity = {
        id: 6,
        questionType: 'short',
        difficulty: 3,
        content: 'What is UDP?',
        correctAnswer: 'User Datagram Protocol',
      } as QuestionEntity;

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

      await (roundProgressionService as any).processGrading(roomId);

      const result = sessionManager.getRoundResult(roomId);

      expect(result.grades[0].score).toBe(0);
      expect(result.grades[1].score).toBe(0);
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
