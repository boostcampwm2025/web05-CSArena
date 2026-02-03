import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { RoundTimer } from './round-timer';
import { QuizService } from '../quiz/quiz.service';
import { GameSessionManager } from './game-session-manager';
import { MatchPersistenceService } from './match-persistence.service';
import { Difficulty, getValidQuestionType, ROUND_DURATIONS } from './round-timer.constants';
import { SPEED_BONUS } from '../quiz/quiz.constants';
import { transformQuestionForClient } from './transformers/question.transformer';
import { FinalResult } from './interfaces/game.interfaces';
import { RoundResult } from '../quiz/quiz.types';

@Injectable()
export class RoundProgressionService {
  private readonly logger = new Logger(RoundProgressionService.name);
  private server: Server;

  constructor(
    private readonly roundTimer: RoundTimer,
    private readonly quizService: QuizService,
    private readonly sessionManager: GameSessionManager,
    private readonly matchPersistence: MatchPersistenceService,
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
        throw new Error(`세션을 찾을 수 없습니다: ${roomId}`);
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

      // 라운드 시작 및 문제 설정
      const roundData = this.sessionManager.startNextRound(roomId);
      const questions = await this.quizService.getQuestionsForGame();
      const question = questions[(roundData.roundNumber - 1) % questions.length];

      this.sessionManager.setQuestion(roomId, question);

      // 문제 사용 횟수 증가 (비동기, 에러 무시)
      this.quizService.incrementUsageCount(question.id).catch((err: Error) => {
        this.logger.warn(
          `Failed to increment usage count for question ${question.id}: ${err.message}`,
        );
      });

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

      const questionType = getValidQuestionType(question.questionType);
      const questionDuration = ROUND_DURATIONS.QUESTION[questionType][difficulty];

      // Question 변환 (transformer 사용)
      const categories = this.quizService.extractCategory(question);
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
      await this.processGrading(roomId);

      // 결과 확인 단계로 이동
      this.phaseReview(roomId);
    } catch (error) {
      this.logger.error(`Error in phaseGrading for room ${roomId}:`, error);
      this.roundTimer.clearAllTimers(roomId);
    }
  }

  /**
   * 채점 및 결과 처리 프로세스
   */
  private async processGrading(roomId: string): Promise<RoundResult> {
    const { question, submissions } = this.sessionManager.getGradingInput(roomId);

    // QuizService에 채점 위임
    const gradeResults = await this.quizService.gradeQuestion(question, submissions);

    // 제출 시간 기반 보너스 계산 - 정답자 중 가장 빠른 사람 찾기
    const correctSubmissions = gradeResults
      .filter((grade) => grade.isCorrect)
      .map((grade) => {
        const submission = submissions.find((sub) => sub.playerId === grade.playerId);

        if (!submission) {
          this.logger.warn(`제출 정보를 찾을 수 없음 - playerId: ${grade.playerId}`);

          return null;
        }

        return {
          playerId: grade.playerId,
          submittedAt: submission.submittedAt,
        };
      })
      .filter((item) => item !== null);

    const fastestCorrectSubmission =
      correctSubmissions.length > 0
        ? correctSubmissions.reduce((fastest, current) =>
            current.submittedAt < fastest.submittedAt ? current : fastest,
          )
        : null;

    // 점수 계산 및 반영
    const finalGrades = gradeResults.map((grade) => {
      // QuizService를 통해 난이도별 점수 계산
      let score = this.quizService.calculateGameScore(
        grade.score,
        question.difficulty,
        grade.isCorrect,
      );

      // 정답자 중 가장 빨리 제출한 경우 보너스 점수 추가
      if (
        grade.isCorrect &&
        fastestCorrectSubmission &&
        grade.playerId === fastestCorrectSubmission.playerId
      ) {
        score += SPEED_BONUS;
      }

      if (score > 0) {
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
   * Phase 4: Review (결과 확인)
   */
  private phaseReview(roomId: string): void {
    try {
      this.sessionManager.setPhase(roomId, 'review');
      const session = this.sessionManager.getGameSession(roomId);
      const roundResult = this.sessionManager.getRoundResult(roomId);
      const question = this.sessionManager.getQuestion(roomId);

      if (!roundResult) {
        throw new Error(`라운드 결과를 찾을 수 없습니다: ${roomId}`);
      }

      if (!question) {
        throw new Error(`문제를 찾을 수 없습니다: ${roomId}`);
      }

      // 문제 타입에 따른 리뷰 시간 계산
      const questionType = getValidQuestionType(question.questionType);
      const reviewDuration = ROUND_DURATIONS.REVIEW[questionType];

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
        durationSec: reviewDuration,
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
        durationSec: reviewDuration,
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
      this.roundTimer.startReviewTimer(roomId, reviewDuration, () => {
        void this.transitionToNextRound(roomId);
      });

      // 틱 인터벌 시작
      this.roundTimer.startTickInterval(roomId, reviewDuration, (remainedSec) => {
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
      const finalResult = this.calculateFinalResult(roomId);
      const session = this.sessionManager.getGameSession(roomId);

      // DB 저장 및 ELO 변화량 획득
      const eloChanges = await this.matchPersistence.saveMatchToDatabase(roomId, finalResult);

      // 각 플레이어에게 match:end 이벤트 발송
      this.server.to(session.player1SocketId).emit('match:end', {
        isWin: finalResult.winnerId === session.player1Id,
        finalScores: {
          my: session.player1Score,
          opponent: session.player2Score,
        },
        tierPointChange: eloChanges?.player1Change ?? 0,
      });

      this.server.to(session.player2SocketId).emit('match:end', {
        isWin: finalResult.winnerId === session.player2Id,
        finalScores: {
          my: session.player2Score,
          opponent: session.player1Score,
        },
        tierPointChange: eloChanges?.player2Change ?? 0,
      });

      // 세션 정리
      this.sessionManager.deleteGameSession(roomId);
      this.roundTimer.clearAllTimers(roomId);
    } catch (error) {
      this.logger.error(`Error in finishGame for room ${roomId}:`, error);
      this.roundTimer.clearAllTimers(roomId);
    }
  }

  /**
   * 최종 승자 계산 로직
   */
  private calculateFinalResult(roomId: string): FinalResult {
    const session = this.sessionManager.getGameSession(roomId);

    if (!session) {
      throw new Error('세션을 찾을 수 없습니다');
    }

    const { player1Score, player2Score } = this.sessionManager.getScores(roomId);

    const scores = {
      [session.player1Id]: player1Score,
      [session.player2Id]: player2Score,
    };

    let winnerId: string | null = null;
    let isDraw = false;

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
