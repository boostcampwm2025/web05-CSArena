import { GameSessionManager } from '../src/game/game-session-manager';
import { UserInfo } from '../src/user/interfaces';
import { Question as QuestionEntity } from '../src/quiz/entity';

describe('GameSessionManager - Game Session Management', () => {
  let sessionManager: GameSessionManager;

  const mockUserInfo1: UserInfo = {
    nickname: 'Player1',
    profileImage: null,
    tier: 'gold',
    tierPoint: 1500,
    exp_point: 1500,
  };

  const mockUserInfo2: UserInfo = {
    nickname: 'Player2',
    profileImage: null,
    tier: 'silver',
    tierPoint: 1200,
    exp_point: 1200,
  };

  const mockQuestion: QuestionEntity = {
    id: 1,
    questionType: 'multiple',
    difficulty: 3, // medium
    content: 'What is 2+2?',
    options: JSON.stringify({
      A: '3',
      B: '4',
      C: '5',
      D: '6',
    }),
    correctAnswer: 'B',
  } as any;

  beforeEach(() => {
    const mockMetricsService = {
      incrementActiveGames: jest.fn(),
      decrementActiveGames: jest.fn(),
    } as any;
    sessionManager = new GameSessionManager(mockMetricsService);
  });

  describe('createGameSession', () => {
    it('게임 세션을 생성해야 함', () => {
      const session = sessionManager.createGameSession(
        'room-1',
        'user1',
        'socket1',
        mockUserInfo1,
        'user2',
        'socket2',
        mockUserInfo2,
      );

      expect(session).toBeDefined();
      expect(session.roomId).toBe('room-1');
      expect(session.player1Id).toBe('user1');
      expect(session.player2Id).toBe('user2');
      expect(session.player1Info).toEqual(mockUserInfo1);
      expect(session.player2Info).toEqual(mockUserInfo2);
      expect(session.currentRound).toBe(0);
      expect(session.totalRounds).toBe(5);
      expect(session.rounds.size).toBe(0);
    });

    it('중복된 roomId로 세션 생성 시 에러를 발생시켜야 함', () => {
      sessionManager.createGameSession(
        'room-1',
        'user1',
        'socket1',
        mockUserInfo1,
        'user2',
        'socket2',
        mockUserInfo2,
      );

      expect(() => {
        sessionManager.createGameSession(
          'room-1',
          'user3',
          'socket3',
          mockUserInfo1,
          'user4',
          'socket4',
          mockUserInfo2,
        );
      }).toThrow('이미 존재하는 게임 세션입니다: room-1');
    });

    it('커스텀 totalRounds를 설정할 수 있어야 함', () => {
      const session = sessionManager.createGameSession(
        'room-1',
        'user1',
        'socket1',
        mockUserInfo1,
        'user2',
        'socket2',
        mockUserInfo2,
        10,
      );

      expect(session.totalRounds).toBe(10);
    });
  });

  describe('getGameSession', () => {
    it('존재하는 세션을 조회해야 함', () => {
      sessionManager.createGameSession(
        'room-1',
        'user1',
        'socket1',
        mockUserInfo1,
        'user2',
        'socket2',
        mockUserInfo2,
      );

      const session = sessionManager.getGameSession('room-1');

      expect(session).not.toBeNull();
      expect(session?.roomId).toBe('room-1');
    });

    it('존재하지 않는 세션 조회 시 null을 반환해야 함', () => {
      const session = sessionManager.getGameSession('non-existent');

      expect(session).toBeNull();
    });
  });

  describe('deleteGameSession', () => {
    it('세션을 삭제해야 함', () => {
      sessionManager.createGameSession(
        'room-1',
        'user1',
        'socket1',
        mockUserInfo1,
        'user2',
        'socket2',
        mockUserInfo2,
      );

      const result = sessionManager.deleteGameSession('room-1');

      expect(result).toBe(true);
      expect(sessionManager.getGameSession('room-1')).toBeNull();
    });

    it('존재하지 않는 세션 삭제 시 false를 반환해야 함', () => {
      const result = sessionManager.deleteGameSession('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('startNextRound', () => {
    beforeEach(() => {
      sessionManager.createGameSession(
        'room-1',
        'user1',
        'socket1',
        mockUserInfo1,
        'user2',
        'socket2',
        mockUserInfo2,
        3,
      );
    });

    it('다음 라운드를 시작해야 함', () => {
      const roundData = sessionManager.startNextRound('room-1');

      expect(roundData.roundNumber).toBe(1);
      expect(roundData.status).toBe('waiting');
      expect(roundData.question).toBeNull();
      expect(roundData.submissions['user1']).toBeNull();
      expect(roundData.submissions['user2']).toBeNull();
      expect(roundData.result).toBeNull();

      const session = sessionManager.getGameSession('room-1');
      expect(session?.currentRound).toBe(1);
    });

    it('연속으로 라운드를 시작할 수 있어야 함', () => {
      sessionManager.startNextRound('room-1');
      const round2 = sessionManager.startNextRound('room-1');
      const round3 = sessionManager.startNextRound('room-1');

      expect(round2.roundNumber).toBe(2);
      expect(round3.roundNumber).toBe(3);

      const session = sessionManager.getGameSession('room-1');
      expect(session?.currentRound).toBe(3);
    });

    it('총 라운드 수를 초과하면 에러를 발생시켜야 함', () => {
      sessionManager.startNextRound('room-1'); // Round 1
      sessionManager.startNextRound('room-1'); // Round 2
      sessionManager.startNextRound('room-1'); // Round 3

      expect(() => {
        sessionManager.startNextRound('room-1'); // Round 4 (초과)
      }).toThrow('모든 라운드가 완료되었습니다: room-1');
    });

    it('존재하지 않는 세션에서 라운드 시작 시 에러를 발생시켜야 함', () => {
      expect(() => {
        sessionManager.startNextRound('non-existent');
      }).toThrow('게임 세션을 찾을 수 없습니다: non-existent');
    });
  });

  describe('setQuestion and getQuestion', () => {
    beforeEach(() => {
      sessionManager.createGameSession(
        'room-1',
        'user1',
        'socket1',
        mockUserInfo1,
        'user2',
        'socket2',
        mockUserInfo2,
      );
      sessionManager.startNextRound('room-1');
    });

    it('라운드에 문제를 설정해야 함', () => {
      sessionManager.setQuestion('room-1', mockQuestion);

      const question = sessionManager.getQuestion('room-1');

      expect(question).toEqual(mockQuestion);

      const session = sessionManager.getGameSession('room-1');
      const round = session?.rounds.get(1);
      expect(round?.status).toBe('in_progress');
    });

    it('이미 문제가 설정된 라운드에 다시 설정 시 에러를 발생시켜야 함', () => {
      sessionManager.setQuestion('room-1', mockQuestion);

      expect(() => {
        sessionManager.setQuestion('room-1', mockQuestion);
      }).toThrow('이미 문제가 설정된 라운드입니다: 1');
    });
  });

  describe('submitAnswer', () => {
    beforeEach(() => {
      sessionManager.createGameSession(
        'room-1',
        'user1',
        'socket1',
        mockUserInfo1,
        'user2',
        'socket2',
        mockUserInfo2,
      );
      sessionManager.startNextRound('room-1');
      sessionManager.setQuestion('room-1', mockQuestion);
    });

    it('플레이어가 답안을 제출할 수 있어야 함', () => {
      const submission = sessionManager.submitAnswer('room-1', 'user1', 'B');

      expect(submission.playerId).toBe('user1');
      expect(submission.answer).toBe('B');
    });

    it('두 플레이어 모두 답안을 제출할 수 있어야 함', () => {
      const sub1 = sessionManager.submitAnswer('room-1', 'user1', 'B');
      const sub2 = sessionManager.submitAnswer('room-1', 'user2', 'C');

      expect(sub1.playerId).toBe('user1');
      expect(sub2.playerId).toBe('user2');
    });

    it('중복 제출 시 에러를 발생시켜야 함', () => {
      sessionManager.submitAnswer('room-1', 'user1', 'B');

      expect(() => {
        sessionManager.submitAnswer('room-1', 'user1', 'C');
      }).toThrow('이미 답안을 제출했습니다: user1');
    });

    it('세션에 포함되지 않은 플레이어의 제출 시 에러를 발생시켜야 함', () => {
      expect(() => {
        sessionManager.submitAnswer('room-1', 'user3', 'B');
      }).toThrow('세션에 포함되지 않은 플레이어입니다: user3');
    });

    it('라운드가 진행 중이 아닐 때 제출 시 에러를 발생시켜야 함', () => {
      sessionManager.createGameSession(
        'room-2',
        'user1',
        'socket1',
        mockUserInfo1,
        'user2',
        'socket2',
        mockUserInfo2,
      );
      sessionManager.startNextRound('room-2');
      // 문제를 설정하지 않음 (status = 'waiting')

      expect(() => {
        sessionManager.submitAnswer('room-2', 'user1', 'B');
      }).toThrow('라운드가 진행 중이 아닙니다: 1');
    });
  });

  describe('isAllSubmitted', () => {
    beforeEach(() => {
      sessionManager.createGameSession(
        'room-1',
        'user1',
        'socket1',
        mockUserInfo1,
        'user2',
        'socket2',
        mockUserInfo2,
      );
      sessionManager.startNextRound('room-1');
      sessionManager.setQuestion('room-1', mockQuestion);
    });

    it('아무도 제출하지 않았을 때 false를 반환해야 함', () => {
      expect(sessionManager.isAllSubmitted('room-1')).toBe(false);
    });

    it('한 명만 제출했을 때 false를 반환해야 함', () => {
      sessionManager.submitAnswer('room-1', 'user1', 'B');

      expect(sessionManager.isAllSubmitted('room-1')).toBe(false);
    });

    it('두 명 모두 제출했을 때 true를 반환해야 함', () => {
      sessionManager.submitAnswer('room-1', 'user1', 'B');
      sessionManager.submitAnswer('room-1', 'user2', 'C');

      expect(sessionManager.isAllSubmitted('room-1')).toBe(true);
    });
  });

  describe('getGradingInput', () => {
    beforeEach(() => {
      sessionManager.createGameSession(
        'room-1',
        'user1',
        'socket1',
        mockUserInfo1,
        'user2',
        'socket2',
        mockUserInfo2,
      );
      sessionManager.startNextRound('room-1');
      sessionManager.setQuestion('room-1', mockQuestion);
    });

    it('모든 플레이어가 제출한 후 채점 입력을 가져와야 함', () => {
      sessionManager.submitAnswer('room-1', 'user1', 'B');
      sessionManager.submitAnswer('room-1', 'user2', 'C');

      const gradingInput = sessionManager.getGradingInput('room-1');

      expect(gradingInput.question).toEqual(mockQuestion);
      expect(gradingInput.submissions).toHaveLength(2);
      expect(gradingInput.submissions[0].playerId).toBe('user1');
      expect(gradingInput.submissions[0].answer).toBe('B');
      expect(gradingInput.submissions[1].playerId).toBe('user2');
      expect(gradingInput.submissions[1].answer).toBe('C');
    });

    it('모든 플레이어가 제출하지 않았을 때 에러를 발생시켜야 함', () => {
      sessionManager.submitAnswer('room-1', 'user1', 'B');

      expect(() => {
        sessionManager.getGradingInput('room-1');
      }).toThrow('모든 플레이어가 제출하지 않았습니다: room-1');
    });

    it('문제가 설정되지 않았을 때 에러를 발생시켜야 함', () => {
      sessionManager.createGameSession(
        'room-2',
        'user1',
        'socket1',
        mockUserInfo1,
        'user2',
        'socket2',
        mockUserInfo2,
      );
      sessionManager.startNextRound('room-2');
      // 문제를 설정하지 않음

      expect(() => {
        sessionManager.getGradingInput('room-2');
      }).toThrow('모든 플레이어가 제출하지 않았습니다: room-2');
    });
  });

  describe('setRoundResult and getRoundResult', () => {
    beforeEach(() => {
      sessionManager.createGameSession(
        'room-1',
        'user1',
        'socket1',
        mockUserInfo1,
        'user2',
        'socket2',
        mockUserInfo2,
      );
      sessionManager.startNextRound('room-1');
      sessionManager.setQuestion('room-1', mockQuestion);
      sessionManager.submitAnswer('room-1', 'user1', 'B');
      sessionManager.submitAnswer('room-1', 'user2', 'C');
    });

    it('라운드 결과를 설정해야 함', () => {
      const roundResult = {
        roundNumber: 1,
        grades: [
          {
            playerId: 'user1',
            answer: 'B',
            isCorrect: true,
            score: 100,
            feedback: 'Correct!',
          },
          {
            playerId: 'user2',
            answer: 'C',
            isCorrect: false,
            score: 0,
            feedback: 'Wrong answer',
          },
        ],
      };

      sessionManager.setRoundResult('room-1', roundResult);

      const result = sessionManager.getRoundResult('room-1');

      expect(result).toEqual(roundResult);

      const session = sessionManager.getGameSession('room-1');
      const round = session?.rounds.get(1);
      expect(round?.status).toBe('completed');
    });

    it('결과가 설정되지 않았을 때 null을 반환해야 함', () => {
      const result = sessionManager.getRoundResult('room-1');

      expect(result).toBeNull();
    });

    it('특정 라운드 번호로 결과를 조회할 수 있어야 함', () => {
      const roundResult = {
        roundNumber: 1,
        grades: [],
      };

      sessionManager.setRoundResult('room-1', roundResult);
      sessionManager.startNextRound('room-1');

      const result = sessionManager.getRoundResult('room-1', 1);

      expect(result?.roundNumber).toBe(1);
    });
  });

  describe('getRoundData', () => {
    beforeEach(() => {
      sessionManager.createGameSession(
        'room-1',
        'user1',
        'socket1',
        mockUserInfo1,
        'user2',
        'socket2',
        mockUserInfo2,
      );
      sessionManager.startNextRound('room-1');
    });

    it('특정 라운드의 데이터를 가져와야 함', () => {
      const roundData = sessionManager.getRoundData('room-1', 1);

      expect(roundData).not.toBeNull();
      expect(roundData?.roundNumber).toBe(1);
    });

    it('존재하지 않는 라운드 조회 시 null을 반환해야 함', () => {
      const roundData = sessionManager.getRoundData('room-1', 99);

      expect(roundData).toBeNull();
    });

    it('존재하지 않는 세션 조회 시 null을 반환해야 함', () => {
      const roundData = sessionManager.getRoundData('non-existent', 1);

      expect(roundData).toBeNull();
    });
  });

  describe('isGameFinished', () => {
    beforeEach(() => {
      sessionManager.createGameSession(
        'room-1',
        'user1',
        'socket1',
        mockUserInfo1,
        'user2',
        'socket2',
        mockUserInfo2,
        3,
      );
    });

    it('게임이 아직 진행 중일 때 false를 반환해야 함', () => {
      sessionManager.startNextRound('room-1');

      expect(sessionManager.isGameFinished('room-1')).toBe(false);
    });

    it('모든 라운드가 완료되었을 때 true를 반환해야 함', () => {
      sessionManager.startNextRound('room-1'); // Round 1
      sessionManager.startNextRound('room-1'); // Round 2
      sessionManager.startNextRound('room-1'); // Round 3

      expect(sessionManager.isGameFinished('room-1')).toBe(true);
    });

    it('라운드를 시작하지 않았을 때 false를 반환해야 함', () => {
      expect(sessionManager.isGameFinished('room-1')).toBe(false);
    });

    it('존재하지 않는 세션 조회 시 에러를 발생시켜야 함', () => {
      expect(() => {
        sessionManager.isGameFinished('non-existent');
      }).toThrow('게임 세션을 찾을 수 없습니다: non-existent');
    });
  });

  describe('getRoomBySocketId', () => {
    beforeEach(() => {
      sessionManager.createGameSession(
        'room-1',
        'user1',
        'socket1',
        mockUserInfo1,
        'user2',
        'socket2',
        mockUserInfo2,
      );
    });

    it('socketId로 roomId를 조회할 수 있어야 함', () => {
      const roomId = sessionManager.getRoomBySocketId('socket1');

      expect(roomId).toBe('room-1');
    });

    it('player2의 socketId로도 roomId를 조회할 수 있어야 함', () => {
      const roomId = sessionManager.getRoomBySocketId('socket2');

      expect(roomId).toBe('room-1');
    });

    it('등록되지 않은 socketId 조회 시 null을 반환해야 함', () => {
      const roomId = sessionManager.getRoomBySocketId('non-existent');

      expect(roomId).toBeNull();
    });

    it('게임 세션이 없는 socketId 조회 시 null을 반환해야 함', () => {
      const roomId = sessionManager.getRoomBySocketId('socket3');

      expect(roomId).toBeNull();
    });
  });

  describe('getUserIdBySocketId', () => {
    beforeEach(() => {
      sessionManager.createGameSession(
        'room-1',
        'user1',
        'socket1',
        mockUserInfo1,
        'user2',
        'socket2',
        mockUserInfo2,
      );
    });

    it('socketId로 userId를 조회할 수 있어야 함', () => {
      const userId = sessionManager.getUserIdBySocketId('socket1');

      expect(userId).toBe('user1');
    });

    it('player2의 socketId로도 userId를 조회할 수 있어야 함', () => {
      const userId = sessionManager.getUserIdBySocketId('socket2');

      expect(userId).toBe('user2');
    });

    it('등록되지 않은 socketId 조회 시 null을 반환해야 함', () => {
      const userId = sessionManager.getUserIdBySocketId('non-existent');

      expect(userId).toBeNull();
    });
  });

  describe('disconnectFromGame', () => {
    beforeEach(() => {
      sessionManager.createGameSession(
        'room-1',
        'user1',
        'socket1',
        mockUserInfo1,
        'user2',
        'socket2',
        mockUserInfo2,
      );
    });

    it('socketId로 연결 해제 정보를 반환해야 함', () => {
      const disconnectInfo = sessionManager.disconnectFromGame('socket1');

      expect(disconnectInfo.userId).toBe('user1');
      expect(disconnectInfo.roomId).toBe('room-1');
    });

    it('등록되지 않은 socketId의 경우 undefined를 반환해야 함', () => {
      const disconnectInfo = sessionManager.disconnectFromGame('non-existent');

      expect(disconnectInfo.userId).toBeUndefined();
      expect(disconnectInfo.roomId).toBeUndefined();
    });
  });
});
