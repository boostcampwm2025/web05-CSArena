import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { MatchPersistenceService } from '../src/game/match-persistence.service';
import { GameSessionManager } from '../src/game/game-session-manager';
import { QuizService } from '../src/quiz/quiz.service';
import { Match, Round, RoundAnswer } from '../src/match/entity';
import { UserProblemBank } from '../src/problem-bank/entity';
import { GameSession } from '../src/game/interfaces/game.interfaces';

describe('MatchPersistenceService', () => {
  let service: MatchPersistenceService;
  let sessionManager: GameSessionManager;
  let quizService: QuizService;
  let dataSource: DataSource;
  let entityManager: EntityManager;

  const mockQueryBuilder = {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  };

  const mockEntityManager = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockDataSource = {
    transaction: jest.fn(async (cb) => await cb(mockEntityManager)),
  };

  const mockSessionManager = {
    getGameSession: jest.fn(),
  };

  const mockQuizService = {
    determineAnswerStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchPersistenceService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: GameSessionManager,
          useValue: mockSessionManager,
        },
        {
          provide: QuizService,
          useValue: mockQuizService,
        },
      ],
    }).compile();

    service = module.get<MatchPersistenceService>(MatchPersistenceService);
    sessionManager = module.get<GameSessionManager>(GameSessionManager);
    quizService = module.get<QuizService>(QuizService);
    dataSource = module.get<DataSource>(DataSource);
    entityManager = mockEntityManager as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('saveMatchToDatabase', () => {
    const roomId = 'test-room';
    const player1Id = '1';
    const player2Id = '2';
    
    const mockSession: GameSession = {
      roomId,
      player1Id,
      player1SocketId: 's1',
      player1Info: {} as any,
      player1Score: 10,
      player2Id,
      player2SocketId: 's2',
      player2Info: {} as any,
      player2Score: 5,
      currentRound: 1,
      totalRounds: 1,
      rounds: new Map(),
      currentPhase: 'finished',
      currentPhaseStartTime: Date.now(),
    };

    const finalResult = {
      winnerId: player1Id,
      scores: {
        [player1Id]: 10,
        [player2Id]: 5,
      },
      isDraw: false,
    };

    beforeEach(() => {
      // transaction mock 재설정 (afterEach의 clearAllMocks로 인해 리셋됨)
      mockDataSource.transaction.mockImplementation(async (cb) => await cb(mockEntityManager));

      mockSession.rounds.set(1, {
        roundNumber: 1,
        status: 'completed',
        question: { id: 100, questionType: 'short' } as any,
        questionId: 100,
        submissions: {
          [player1Id]: { playerId: player1Id, answer: 'ans1', submittedAt: 1000 },
          [player2Id]: { playerId: player2Id, answer: 'ans2', submittedAt: 2000 },
        },
        result: {
          roundNumber: 1,
          grades: [
            { playerId: player1Id, answer: 'ans1', isCorrect: true, score: 10, feedback: 'good' },
            { playerId: player2Id, answer: 'ans2', isCorrect: false, score: 0, feedback: 'bad' },
          ],
        },
      });

      mockSessionManager.getGameSession.mockReturnValue(mockSession);
    });

    it('매치 데이터를 성공적으로 저장해야 함', async () => {
      // Mock Insert Match
      mockQueryBuilder.execute
        .mockResolvedValueOnce({ generatedMaps: [{ id: 999 }] }) // Match ID
        .mockResolvedValueOnce({ generatedMaps: [{ id: 50, roundNumber: 1 }] }) // Round IDs
        .mockResolvedValueOnce({}) // Round Answers
        .mockResolvedValueOnce({}); // User Problem Banks

      await service.saveMatchToDatabase(roomId, finalResult);

      expect(mockDataSource.transaction).toHaveBeenCalled();
      
      // Verify Match Insert
      expect(mockEntityManager.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.into).toHaveBeenCalledWith(Match);
      expect(mockQueryBuilder.values).toHaveBeenCalledWith({
        player1Id: 1,
        player2Id: 2,
        winnerId: 1,
        matchType: 'multi',
      });

      // Verify Round Insert
      expect(mockQueryBuilder.into).toHaveBeenCalledWith(Round);
      expect(mockQueryBuilder.values).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ matchId: 999, questionId: 100, roundNumber: 1 })
      ]));

      // Verify RoundAnswer Insert
      expect(mockQueryBuilder.into).toHaveBeenCalledWith(RoundAnswer);
      
      // Verify UserProblemBank Insert
      expect(mockQueryBuilder.into).toHaveBeenCalledWith(UserProblemBank);
    });

    it('트랜잭션 중 에러 발생 시 재시도 후 로깅하고 정상 종료해야 함', async () => {
      jest.useFakeTimers();
      mockDataSource.transaction.mockRejectedValue(new Error('DB Error'));

      const promise = service.saveMatchToDatabase(roomId, finalResult);

      // 모든 재시도 타이머 실행
      await jest.runAllTimersAsync();

      await expect(promise).resolves.toBeUndefined();
      jest.useRealTimers();
    });

    it('Invalid userId로 NonRetryableError 발생 시 재시도 없이 즉시 종료해야 함', async () => {
      // Invalid userId를 가진 세션 설정
      const invalidSession = {
        ...mockSession,
        player1Id: 'invalid-id',
      };
      mockSessionManager.getGameSession.mockReturnValue(invalidSession);

      await service.saveMatchToDatabase(roomId, finalResult);

      // transaction은 1번만 호출되어야 함 (재시도 없음)
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('Match INSERT ID 반환 실패 시 NonRetryableError로 재시도 없이 종료해야 함', async () => {
      // Match INSERT에서 ID가 반환되지 않음
      mockQueryBuilder.execute.mockResolvedValue({ generatedMaps: [] });

      await service.saveMatchToDatabase(roomId, finalResult);

      // transaction은 1번만 호출되어야 함 (재시도 없음)
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('Round INSERT ID 반환 실패 시 NonRetryableError로 재시도 없이 종료해야 함', async () => {
      // Match INSERT 성공, Round INSERT에서 ID가 반환되지 않음
      mockQueryBuilder.execute
        .mockResolvedValueOnce({ generatedMaps: [{ id: 999 }] }) // Match ID (첫 번째 호출)
        .mockResolvedValue({ generatedMaps: [] }); // Round IDs 없음 (이후 모든 호출)

      await service.saveMatchToDatabase(roomId, finalResult);

      // transaction은 1번만 호출되어야 함 (재시도 없음)
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('스피드 보너스를 포함한 점수가 RoundAnswer와 UserProblemBank에 저장되어야 함', async () => {
      // 스피드 보너스가 포함된 점수 설정
      const player1ScoreWithBonus = 15; // 기본 10 + 스피드 보너스 5
      const player2ScoreWithBonus = 3; // 기본 0 + 스피드 보너스 3

      const bonusSession = {
        ...mockSession,
        rounds: new Map(),
      };

      bonusSession.rounds.set(1, {
        roundNumber: 1,
        status: 'completed',
        question: { id: 100, questionType: 'short' } as any,
        questionId: 100,
        submissions: {
          [player1Id]: { playerId: player1Id, answer: 'ans1', submittedAt: 1000 },
          [player2Id]: { playerId: player2Id, answer: 'ans2', submittedAt: 2000 },
        },
        result: {
          roundNumber: 1,
          grades: [
            { playerId: player1Id, answer: 'ans1', isCorrect: true, score: player1ScoreWithBonus, feedback: 'good' },
            { playerId: player2Id, answer: 'ans2', isCorrect: false, score: player2ScoreWithBonus, feedback: 'bad' },
          ],
        },
      });

      mockSessionManager.getGameSession.mockReturnValue(bonusSession);

      mockQueryBuilder.execute
        .mockResolvedValueOnce({ generatedMaps: [{ id: 999 }] }) // Match ID
        .mockResolvedValueOnce({ generatedMaps: [{ id: 50, roundNumber: 1 }] }) // Round IDs
        .mockResolvedValueOnce({}) // Round Answers
        .mockResolvedValueOnce({}); // User Problem Banks

      mockQuizService.determineAnswerStatus
        .mockReturnValueOnce('correct')
        .mockReturnValueOnce('incorrect')
        .mockReturnValueOnce('correct')
        .mockReturnValueOnce('incorrect');

      await service.saveMatchToDatabase(roomId, finalResult);

      // RoundAnswer INSERT 시 스피드 보너스를 포함한 점수 확인
      const roundAnswerCalls = mockQueryBuilder.values.mock.calls.filter((call) =>
        Array.isArray(call[0]) && call[0].some((item: any) => item.roundId !== undefined)
      );

      expect(roundAnswerCalls.length).toBeGreaterThan(0);
      const roundAnswerValues = roundAnswerCalls[0][0];

      expect(roundAnswerValues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userId: 1,
            roundId: 50,
            score: player1ScoreWithBonus,
            answerStatus: 'correct',
          }),
          expect.objectContaining({
            userId: 2,
            roundId: 50,
            score: player2ScoreWithBonus,
            answerStatus: 'incorrect',
          }),
        ])
      );

      // UserProblemBank INSERT 시 스피드 보너스를 포함한 점수는 저장되지 않음 (answerStatus만 저장)
      const problemBankCalls = mockQueryBuilder.values.mock.calls.filter((call) =>
        Array.isArray(call[0]) && call[0].some((item: any) => item.userId !== undefined && item.matchId !== undefined)
      );

      expect(problemBankCalls.length).toBeGreaterThan(0);
      const problemBankValues = problemBankCalls[0][0];

      expect(problemBankValues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userId: 1,
            questionId: 100,
            matchId: 999,
            answerStatus: 'correct',
          }),
          expect.objectContaining({
            userId: 2,
            questionId: 100,
            matchId: 999,
            answerStatus: 'incorrect',
          }),
        ])
      );
    });
  });
});
