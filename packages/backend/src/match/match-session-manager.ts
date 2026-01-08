import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { QueueSession } from './queues/queue.session';
import { UserInfo } from './interfaces/user.interface';
import { Question } from '../quiz/quiz.types';
import {
  GameSession,
  GradingInput,
  RoundData,
  RoundResult,
  Submission,
} from './interfaces/match.interfaces';

@Injectable()
export class MatchSessionManager {
  private socketToUser = new Map<string, string>();
  private userToSocket = new Map<string, string>();
  private queueSessions = new Map<string, QueueSession>();
  private roomSessions = new Map<string, Set<string>>();
  private gameSessions = new Map<string, GameSession>();

  registerUser(socketId: string, userId: string): void {
    this.socketToUser.set(socketId, userId);
    this.userToSocket.set(userId, socketId);
  }

  createQueueSession(socketId: string, userId: string, userInfo: UserInfo): string {
    const sessionId = randomUUID();
    const session: QueueSession = {
      sessionId,
      socketId,
      userId,
      userInfo,
    };

    this.socketToUser.set(socketId, userId);
    this.userToSocket.set(userId, socketId);
    this.queueSessions.set(sessionId, session);

    return sessionId;
  }

  getQueueSession(sessionId: string): QueueSession | undefined {
    return this.queueSessions.get(sessionId);
  }

  getQueueSessionBySocketId(socketId: string): QueueSession | undefined {
    return Array.from(this.queueSessions.values()).find((s) => s.socketId === socketId);
  }

  getQueueSessionByUserId(userId: string): QueueSession | undefined {
    return Array.from(this.queueSessions.values()).find((s) => s.userId === userId);
  }

  removeQueueSession(sessionId: string): void {
    const session = this.queueSessions.get(sessionId);

    if (session) {
      this.socketToUser.delete(session.socketId);
      this.userToSocket.delete(session.userId);
      this.queueSessions.delete(sessionId);
    }
  }

  getUserId(socketId: string): string | undefined {
    return this.socketToUser.get(socketId);
  }

  addToRoom(roomId: string, userId: string): void {
    if (!this.roomSessions.has(roomId)) {
      this.roomSessions.set(roomId, new Set());
    }

    this.roomSessions.get(roomId).add(userId);
  }

  removeFromRoom(roomId: string, userId: string): void {
    const room = this.roomSessions.get(roomId);

    if (room) {
      room.delete(userId);

      if (room.size === 0) {
        this.roomSessions.delete(roomId);
      }
    }
  }

  getUserRoom(userId: string): string | undefined {
    for (const [roomId, users] of this.roomSessions.entries()) {
      if (users.has(userId)) {
        return roomId;
      }
    }

    return undefined;
  }

  getRoomBySocketId(socketId: string): string | undefined {
    const userId = this.socketToUser.get(socketId);

    if (!userId) {
      return undefined;
    }

    return this.getUserRoom(userId);
  }

  disconnect(socketId: string): { userId?: string; sessionId?: string; roomId?: string } {
    const userId = this.socketToUser.get(socketId);
    const session = this.getQueueSessionBySocketId(socketId);
    const roomId = userId ? this.getUserRoom(userId) : undefined;

    if (session) {
      this.removeQueueSession(session.sessionId);
    }

    if (userId && roomId) {
      this.removeFromRoom(roomId, userId);
    }

    this.socketToUser.delete(socketId);

    if (userId) {
      this.userToSocket.delete(userId);
    }

    return {
      userId,
      sessionId: session?.sessionId,
      roomId,
    };
  }

  // ============================================
  // 게임 세션 관리 함수
  // ============================================

  createGameSession(
    roomId: string,
    player1Id: string,
    player1SocketId: string,
    player1Info: UserInfo,
    player2Id: string,
    player2SocketId: string,
    player2Info: UserInfo,
    totalRounds: number = 5,
  ): GameSession {
    if (this.gameSessions.has(roomId)) {
      throw new Error(`Game session already exists: ${roomId}`);
    }

    const session: GameSession = {
      roomId,
      player1Id,
      player1SocketId,
      player1Info,
      player1Score: 0,
      player2Id,
      player2SocketId,
      player2Info,
      player2Score: 0,
      currentRound: 0,
      totalRounds,
      rounds: new Map(),
    };

    this.gameSessions.set(roomId, session);

    return session;
  }

  getGameSession(roomId: string): GameSession | null {
    return this.gameSessions.get(roomId) || null;
  }

  deleteGameSession(roomId: string): boolean {
    return this.gameSessions.delete(roomId);
  }

  startNextRound(roomId: string): RoundData {
    const session = this.getGameSessionOrThrow(roomId);
    const nextRoundNumber = session.currentRound + 1;

    if (nextRoundNumber > session.totalRounds) {
      throw new Error(`All rounds completed: ${roomId}`);
    }

    const roundData: RoundData = {
      roundNumber: nextRoundNumber,
      status: 'waiting',
      question: null,
      submissions: {
        [session.player1Id]: null,
        [session.player2Id]: null,
      },
      result: null,
    };

    session.rounds.set(nextRoundNumber, roundData);
    session.currentRound = nextRoundNumber;

    return roundData;
  }

  setQuestion(roomId: string, question: Question): void {
    const session = this.getGameSessionOrThrow(roomId);
    const round = this.getCurrentRoundOrThrow(session);

    if (round.question !== null) {
      throw new Error(`Question already set for round ${round.roundNumber}`);
    }

    round.question = question;
    round.status = 'in_progress';
  }

  getQuestion(roomId: string): Question | null {
    const session = this.getGameSessionOrThrow(roomId);
    const round = this.getCurrentRoundOrThrow(session);

    return round.question;
  }

  submitAnswer(roomId: string, playerId: string, answer: string): Submission {
    const session = this.getGameSessionOrThrow(roomId);
    const round = this.getCurrentRoundOrThrow(session);

    if (playerId !== session.player1Id && playerId !== session.player2Id) {
      throw new Error(`Player not in session: ${playerId}`);
    }

    if (round.status !== 'in_progress') {
      throw new Error(`Round not in progress: ${round.roundNumber}`);
    }

    if (round.submissions[playerId] !== null) {
      throw new Error(`Already submitted: ${playerId}`);
    }

    const submission: Submission = {
      playerId,
      answer,
    };

    round.submissions[playerId] = submission;

    return submission;
  }

  isAllSubmitted(roomId: string): boolean {
    const session = this.getGameSessionOrThrow(roomId);
    const round = this.getCurrentRoundOrThrow(session);

    return (
      round.submissions[session.player1Id] !== null && round.submissions[session.player2Id] !== null
    );
  }

  getGradingInput(roomId: string): GradingInput {
    const session = this.getGameSessionOrThrow(roomId);
    const round = this.getCurrentRoundOrThrow(session);

    if (!this.isAllSubmitted(roomId)) {
      throw new Error(`Not all players submitted: ${roomId}`);
    }

    if (round.question === null) {
      throw new Error(`Question not set: ${roomId}`);
    }

    return {
      question: round.question,
      submissions: [round.submissions[session.player1Id], round.submissions[session.player2Id]],
    };
  }

  setRoundResult(roomId: string, result: RoundResult): void {
    const session = this.getGameSessionOrThrow(roomId);
    const round = this.getCurrentRoundOrThrow(session);

    round.result = result;
    round.status = 'completed';
  }

  getRoundResult(roomId: string, roundNumber?: number): RoundResult | null {
    const session = this.getGameSessionOrThrow(roomId);
    const targetRound = roundNumber || session.currentRound;
    const round = session.rounds.get(targetRound);

    return round?.result || null;
  }

  getRoundData(roomId: string, roundNumber: number): RoundData | null {
    const session = this.gameSessions.get(roomId);

    return session?.rounds.get(roundNumber) || null;
  }

  isGameFinished(roomId: string): boolean {
    const session = this.getGameSessionOrThrow(roomId);

    return session.currentRound >= session.totalRounds;
  }

  private getGameSessionOrThrow(roomId: string): GameSession {
    const session = this.gameSessions.get(roomId);

    if (!session) {
      throw new Error(`Game session not found: ${roomId}`);
    }

    return session;
  }

  private getCurrentRoundOrThrow(session: GameSession): RoundData {
    const round = session.rounds.get(session.currentRound);

    if (!round) {
      throw new Error(`Round not found: ${session.currentRound}`);
    }

    return round;
  }

  // 플레이어에게 점수 추가
  addScore(roomId: string, playerId: string, score: number): void {
    const session = this.getGameSessionOrThrow(roomId);

    if (playerId === session.player1Id) {
      session.player1Score += score;
    } else if (playerId === session.player2Id) {
      session.player2Score += score;
    } else {
      throw new Error(`Player not in session: ${playerId}`);
    }
  }

  // 게임의 현재 점수 현황 조회
  getScores(roomId: string): { player1Score: number; player2Score: number } {
    const session = this.getGameSessionOrThrow(roomId);

    return {
      player1Score: session.player1Score,
      player2Score: session.player2Score,
    };
  }
}
