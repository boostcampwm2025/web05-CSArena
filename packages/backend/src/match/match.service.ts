import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { IMatchQueue, Match } from './interfaces/match-queue.interface';
import { InMemoryMatchQueue } from './queues/in-memory-queue';
import { MatchSessionManager } from './match-session-manager';
import { QuizAiService } from '../quiz/quiz-ai.service';
import { UserInfo } from './interfaces/user.interface';
import { RoundData } from './interfaces/match.interfaces';

@Injectable()
export class MatchService {
  private matchQueue: IMatchQueue;
  private userToSessionId = new Map<string, string>();

  constructor(
    private readonly sessionManager: MatchSessionManager,
    private readonly aiService: QuizAiService,
  ) {
    this.matchQueue = new InMemoryMatchQueue();
  }

  addToQueue(userId: string, _userInfo: UserInfo): Match | null {
    const sessionId = `session-${userId}-${Date.now()}`;
    this.userToSessionId.set(userId, sessionId);

    return this.matchQueue.add(userId);
  }

  removeFromQueue(userId: string): void {
    this.matchQueue.remove(userId);
    this.userToSessionId.delete(userId);
  }

  getQueueSize(): number {
    return this.matchQueue.getQueueSize();
  }

  getSessionId(userId: string): string | undefined {
    return this.userToSessionId.get(userId);
  }

  startGame(
    roomId: string,
    player1Id: string,
    player1SocketId: string,
    player1Info: UserInfo,
    player2Id: string,
    player2SocketId: string,
    player2Info: UserInfo,
    _server: Server,
  ): void {
    this.sessionManager.createGameSession(
      roomId,
      player1Id,
      player1SocketId,
      player1Info,
      player2Id,
      player2SocketId,
      player2Info,
    );
  }

  handlePlayerDisconnect(_roomId: string, _userId: string): void {
    // TODO: 연결 해제 처리 구현 예정
  }

  // ============================================
  // Game Logic (from GameService)
  // ============================================

  /**
   * 라운드 시작
   */
  async startRound(roomId: string): Promise<RoundData> {
    const roundData = this.sessionManager.startNextRound(roomId);

    const questions = await this.aiService.generateQuestion();

    const targetQuestion = questions[(roundData.roundNumber - 1) % questions.length];

    this.sessionManager.setQuestion(roomId, targetQuestion);

    return this.sessionManager.getRoundData(roomId, roundData.roundNumber);
  }

  /**
   * 정답 제출
   */
  async submitAnswer(roomId: string, playerId: string, answer: string) {
    this.sessionManager.submitAnswer(roomId, playerId, answer);

    if (this.sessionManager.isAllSubmitted(roomId)) {
      return await this.processGrading(roomId);
    }

    return { status: 'waiting_for_others' };
  }

  /**
   * 채점
   */
  private async processGrading(roomId: string) {
    const gradingInput = this.sessionManager.getGradingInput(roomId);

    const roundResult = await this.aiService.gradeRound(
      gradingInput.question,
      gradingInput.submissions,
    );

    const session = this.sessionManager.getGameSession(roomId);

    if (session) {
      roundResult.roundNumber = session.currentRound;
    }

    this.sessionManager.setRoundResult(roomId, roundResult);

    return roundResult;
  }
}
