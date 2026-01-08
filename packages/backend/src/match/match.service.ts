import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { IMatchQueue, Match } from './interfaces/match-queue.interface';
import { InMemoryMatchQueue } from './queues/in-memory-queue';
import { MatchSessionManager } from './match-session-manager';
import { QuizAiService } from '../quiz/quiz-ai.service';
import { UserInfo } from './interfaces/user.interface';
import { RoundData } from './interfaces/match.interfaces';
import {
  FinalResult,
  GradeResult,
  MultipleChoiceQuestion,
  RoundResult,
  Submission,
} from '../quiz/quiz.types';
import { SCORE_MAP } from '../quiz/quiz.constants';

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

  async submitAnswer(
    roomId: string,
    playerId: string,
    answer: string,
  ): Promise<RoundResult | { status: string }> {
    this.sessionManager.submitAnswer(roomId, playerId, answer);

    if (this.sessionManager.isAllSubmitted(roomId)) {
      return await this.processGrading(roomId);
    }

    return { status: 'waiting_for_others' };
  }

  /**
   * 채점 및 결과 처리 프로세스
   */
  private async processGrading(roomId: string): Promise<RoundResult> {
    const { question, submissions } = this.sessionManager.getGradingInput(roomId);

    let gradeResults: GradeResult[];

    if (question.type === 'multiple_choice') {
      gradeResults = this.gradeMultipleChoice(question, submissions);
    } else {
      gradeResults = await this.aiService.gradeSubjectiveQuestion(question, submissions);
    }

    // 점수 반영
    const finalGrades = gradeResults.map((grade) => {
      const score = grade.isCorrect ? SCORE_MAP[question.difficulty] : 0;

      if (grade.isCorrect) {
        this.sessionManager.addScore(roomId, grade.playerId, score);
      }

      return { ...grade, score };
    });

    // 현재 라운드 정보 확인
    const session = this.sessionManager.getGameSession(roomId);
    const isLastRound = session.currentRound === session.totalRounds;

    // 결과 객체 생성
    const roundResult: RoundResult = {
      roundNumber: session.currentRound,
      grades: finalGrades,
    };

    // 마지막 라운드라면 최종 승자 판별 로직 수행
    if (isLastRound) {
      roundResult.finalResult = this.calculateFinalResult(roomId);
    }

    // 결과 저장 및 반환
    this.sessionManager.setRoundResult(roomId, roundResult);

    return roundResult;
  }

  /**
   * 최종 승자 계산 로직
   */
  private calculateFinalResult(roomId: string): FinalResult {
    const session = this.sessionManager.getGameSession(roomId);

    if (!session) {
      throw new Error('Session not found');
    }

    const { player1Score, player2Score } = this.sessionManager.getScores(roomId);

    const scores = {
      [session.player1Id]: player1Score,
      [session.player2Id]: player2Score,
    };

    let winnerId: string | null = null;
    let isDraw = false;

    // 단순 비교 로직
    if (player1Score > player2Score) {
      winnerId = session.player1Id;
    } else if (player2Score > player1Score) {
      winnerId = session.player2Id;
    } else {
      isDraw = true;
    }

    return {
      winnerId,
      scores,
      isDraw,
    };
  }

  /**
   * 객관식 채점
   */
  private gradeMultipleChoice(
    question: MultipleChoiceQuestion,
    submissions: Submission[],
  ): GradeResult[] {
    return submissions.map((sub) => {
      const sanitizedAnswer = sub.answer.trim().toUpperCase();
      const isCorrect = sanitizedAnswer === question.answer;

      return {
        playerId: sub.playerId,
        answer: sub.answer,
        isCorrect,
        score: 0,
        feedback: isCorrect ? 'Correct!' : `Wrong. The answer was ${question.answer}.`,
      };
    });
  }
}
