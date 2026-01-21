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
    transaction: jest.fn((cb) => cb(mockEntityManager)),
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

    it('트랜잭션 중 에러 발생 시 예외를 던져야 함', async () => {
        mockDataSource.transaction.mockRejectedValue(new Error('DB Error'));

        await expect(service.saveMatchToDatabase(roomId, finalResult))
            .rejects.toThrow('DB Error');
    });
  });
});
