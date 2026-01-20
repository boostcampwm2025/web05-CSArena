import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { RoundTimer } from './round-timer';
import { GameService } from './game.service';
import { QuizService } from '../quiz/quiz.service';
import { GameSessionManager } from './game-session-manager';
import { Difficulty, ROUND_DURATIONS } from './round-timer.constants';
import { transformQuestionForClient } from './transformers/question.transformer';

@Injectable()
export class RoundProgressionService {
  private readonly logger = new Logger(RoundProgressionService.name);
  private server: Server;

  constructor(
    private readonly roundTimer: RoundTimer,
    private readonly gameService: GameService,
    private readonly aiService: QuizService,
    private readonly sessionManager: GameSessionManager,
  ) {}

  /**
   * WebSocket Server 설정 (GameGateway에서 호출)
   */
  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * 라운드 시퀀스 시작
   */
  startRoundSequence(roomId: string): void {
    this.phaseReady(roomId);
  }

  /**
   * Phase 1: Ready (준비 카운트다운)
   */
  private phaseReady(roomId: string): void {
    try {
      this.sessionManager.setPhase(roomId, 'ready');
      const session = this.sessionManager.getGameSession(roomId);

      if (!session) {
        throw new Error(`Session not found: ${roomId}`);
      }

      // round:ready 이벤트 발송
      this.server.to(roomId).emit('round:ready', {
        durationSec: ROUND_DURATIONS.READY,
        roundIndex: session.currentRound,
        totalRounds: session.totalRounds,
      });

      // 준비 카운트다운 시작
      this.roundTimer.startReadyCountdown(roomId, ROUND_DURATIONS.READY, () => {
        void this.phaseQuestion(roomId);
      });

      // 틱 인터벌 시작
      this.roundTimer.startTickInterval(roomId, ROUND_DURATIONS.READY, (remainedSec) => {
        this.server.to(roomId).emit('round:tick', { remainedSec });
      });
    } catch (error) {
      this.logger.error(`Error in phaseReady for room ${roomId}:`, error);
      this.roundTimer.clearAllTimers(roomId);
    }
  }

  /**
   * Phase 2: Question (문제 출제 및 답안 제출 대기)
   */
  private async phaseQuestion(roomId: string): Promise<void> {
    try {
      this.sessionManager.setPhase(roomId, 'question');

      // 문제 생성 및 설정
      const roundData = await this.gameService.startRound(roomId);
      const question = roundData.question;

      if (!question) {
        throw new Error(`Question not found for room ${roomId}`);
      }

      // 난이도 매핑 (DB의 숫자 난이도 -> 문자열)
      const difficultyNum = question.difficulty || 3;
      let difficulty: Difficulty;

      if (difficultyNum <= 2) {
        difficulty = 'easy';
      } else if (difficultyNum === 3) {
        difficulty = 'medium';
      } else {
        difficulty = 'hard';
      }

      const questionDuration = ROUND_DURATIONS.QUESTION[difficulty];

      // Question 변환 (transformer 사용)
      const categories = this.aiService.extractCategory(question);
      const transformedQuestion = transformQuestionForClient(question, categories);

      // round:start 이벤트 발송
      this.server.to(roomId).emit('round:start', {
        durationSec: questionDuration,
        question: transformedQuestion,
      });

      // 타이머 시작
      this.roundTimer.startQuestionTimer(roomId, questionDuration, () => {
        this.handleQuestionTimeout(roomId);
      });

      // 틱 인터벌 시작
      this.roundTimer.startTickInterval(roomId, questionDuration, (remainedSec) => {
        this.server.to(roomId).emit('round:tick', { remainedSec });
      });
    } catch (error) {
      this.logger.error(`Error in phaseQuestion for room ${roomId}:`, error);
      this.roundTimer.clearAllTimers(roomId);
    }
  }

  /**
   * Phase 3: Grading (채점)
   */
  async phaseGrading(roomId: string): Promise<void> {
    try {
      this.sessionManager.setPhase(roomId, 'grading');

      // 틱 인터벌 정지
      this.roundTimer.clearTickInterval(roomId);

      // 채점 수행
      await this.gameService.processGrading(roomId);

      // 결과 확인 단계로 이동
      this.phaseReview(roomId);
    } catch (error) {
      this.logger.error(`Error in phaseGrading for room ${roomId}:`, error);
      this.roundTimer.clearAllTimers(roomId);
    }
  }

  /**
   * Phase 4: Review (결과 확인)
   */
  private phaseReview(roomId: string): void {
    try {
      this.sessionManager.setPhase(roomId, 'review');
      const session = this.sessionManager.getGameSession(roomId);
      const roundResult = this.sessionManager.getRoundResult(roomId);
      const question = this.sessionManager.getQuestion(roomId);

      if (!roundResult) {
        throw new Error(`Round result not found for room ${roomId}`);
      }

      if (!question) {
        throw new Error(`Question not found for room ${roomId}`);
      }

      // 문제 타입에 따라 정답 추출
      let bestAnswer: string;

      if (question.questionType === 'multiple') {
        bestAnswer = question.correctAnswer;
      } else if (question.questionType === 'short') {
        bestAnswer = question.correctAnswer;
      } else {
        bestAnswer = question.correctAnswer;
      }

      // 각 플레이어에게 개별적으로 round:end 이벤트 발송
      const player1Grade = roundResult.grades.find((g) => g.playerId === session.player1Id);
      const player2Grade = roundResult.grades.find((g) => g.playerId === session.player2Id);

      // Player 1에게 발송
      this.server.to(session.player1SocketId).emit('round:end', {
        durationSec: ROUND_DURATIONS.REVIEW,
        results: {
          my: {
            submitted: player1Grade.answer,
            delta: player1Grade.score,
            total: session.player1Score,
            correct: player1Grade.isCorrect,
          },
          opponent: {
            submitted: player2Grade.answer,
            delta: player2Grade.score,
            total: session.player2Score,
            correct: player2Grade.isCorrect,
          },
        },
        solution: {
          bestAnswer,
          explanation: player1Grade.feedback,
        },
      });

      // Player 2에게 발송
      this.server.to(session.player2SocketId).emit('round:end', {
        durationSec: ROUND_DURATIONS.REVIEW,
        results: {
          my: {
            submitted: player2Grade.answer,
            delta: player2Grade.score,
            total: session.player2Score,
            correct: player2Grade.isCorrect,
          },
          opponent: {
            submitted: player1Grade.answer,
            delta: player1Grade.score,
            total: session.player1Score,
            correct: player1Grade.isCorrect,
          },
        },
        solution: {
          bestAnswer,
          explanation: player2Grade.feedback,
        },
      });

      // 리뷰 타이머 시작
      this.roundTimer.startReviewTimer(roomId, ROUND_DURATIONS.REVIEW, () => {
        void this.transitionToNextRound(roomId);
      });

      // 틱 인터벌 시작
      this.roundTimer.startTickInterval(roomId, ROUND_DURATIONS.REVIEW, (remainedSec) => {
        this.server.to(roomId).emit('round:tick', { remainedSec });
      });
    } catch (error) {
      this.logger.error(`Error in phaseReview for room ${roomId}:`, error);
      this.roundTimer.clearAllTimers(roomId);
    }
  }

  /**
   * 다음 라운드로 전환 또는 게임 종료
   */
  private async transitionToNextRound(roomId: string): Promise<void> {
    try {
      const session = this.sessionManager.getGameSession(roomId);

      if (session.currentRound >= session.totalRounds) {
        // 게임 종료
        await this.finishGame(roomId);
      } else {
        // 다음 라운드 시작
        this.startRoundSequence(roomId);
      }
    } catch (error) {
      this.logger.error(`Error in transitionToNextRound for room ${roomId}:`, error);
      this.roundTimer.clearAllTimers(roomId);
    }
  }

  /**
   * 게임 종료 처리
   */
  private async finishGame(roomId: string): Promise<void> {
    try {
      this.sessionManager.setPhase(roomId, 'finished');
      const finalResult = this.gameService.calculateFinalResult(roomId);
      const session = this.sessionManager.getGameSession(roomId);

      // 각 플레이어에게 match:end 이벤트 발송
      this.server.to(session.player1SocketId).emit('match:end', {
        isWin: finalResult.winnerId === session.player1Id,
        finalScores: {
          my: session.player1Score,
          opponent: session.player2Score,
        },
      });

      this.server.to(session.player2SocketId).emit('match:end', {
        isWin: finalResult.winnerId === session.player2Id,
        finalScores: {
          my: session.player2Score,
          opponent: session.player1Score,
        },
      });

      // DB 저장 및 세션 정리
      await this.gameService.saveMatchToDatabase(roomId);
      this.sessionManager.deleteGameSession(roomId);
      this.roundTimer.clearAllTimers(roomId);
    } catch (error) {
      this.logger.error(`Error in finishGame for room ${roomId}:`, error);
      this.roundTimer.clearAllTimers(roomId);
    }
  }

  /**
   * 타임아웃 처리 (답안 미제출)
   */
  private handleQuestionTimeout(roomId: string): void {
    try {
      const session = this.sessionManager.getGameSession(roomId);

      // 제출하지 않은 플레이어는 빈 답안 자동 제출
      if (!this.sessionManager.hasPlayerSubmitted(roomId, session.player1Id)) {
        this.sessionManager.submitAnswer(roomId, session.player1Id, '');
      }

      if (!this.sessionManager.hasPlayerSubmitted(roomId, session.player2Id)) {
        this.sessionManager.submitAnswer(roomId, session.player2Id, '');
      }

      // 그레이딩으로 진행
      void this.phaseGrading(roomId);
    } catch (error) {
      this.logger.error(`Error in handleQuestionTimeout for room ${roomId}:`, error);
      this.roundTimer.clearAllTimers(roomId);
    }
  }
}
