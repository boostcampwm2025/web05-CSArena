import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { UserInfo } from '../user/interfaces';
import { Question as QuestionEntity } from '../quiz/entity';
import { MetricsService } from '../metrics';
import {
  GameSession,
  GradingInput,
  RoundData,
  RoundPhase,
  RoundResult,
  Submission,
} from './interfaces/game.interfaces';

// Idle sweeper 설정
// - 주기: 5분마다 검사
// - stale 기준: 마지막 활동으로부터 30분 경과 (게임 1판 최대 ~5분 고려 시 여유)
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const SESSION_STALE_MS = 30 * 60 * 1000;

@Injectable()
export class GameSessionManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GameSessionManager.name);
  private gameSessions = new Map<string, GameSession>();
  private sweepInterval: NodeJS.Timeout | null = null;

  constructor(private readonly metricsService: MetricsService) {}

  onModuleInit(): void {
    this.sweepInterval = setInterval(() => {
      this.sweepStaleSessions();
    }, SWEEP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
      this.sweepInterval = null;
    }
  }

  /**
   * socketId로 userId 조회 (게임 세션에서)
   */
  getUserIdBySocketId(socketId: string): string | null {
    for (const session of this.gameSessions.values()) {
      if (session.player1SocketId === socketId) {
        return session.player1Id;
      }

      if (session.player2SocketId === socketId) {
        return session.player2Id;
      }
    }

    return null;
  }

  /**
   * socketId로 roomId 조회 (게임 세션에서)
   */
  getRoomBySocketId(socketId: string): string | null {
    for (const [roomId, session] of this.gameSessions.entries()) {
      if (session.player1SocketId === socketId || session.player2SocketId === socketId) {
        return roomId;
      }
    }

    return null;
  }

  /**
   * socketId로부터 (userId, roomId)만 조회.
   * 실제 세션 정리는 호출자가 deleteGameSession을 별도로 호출해야 한다.
   * 이전 이름(disconnectFromGame)은 cleanup을 수행한다고 오해하기 쉬워 교정.
   */
  getDisconnectInfo(socketId: string): { userId?: string; roomId?: string } {
    const roomId = this.getRoomBySocketId(socketId);
    const userId = this.getUserIdBySocketId(socketId);

    return {
      userId: userId || undefined,
      roomId: roomId || undefined,
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
      throw new Error(`이미 존재하는 게임 세션입니다: ${roomId}`);
    }

    const now = Date.now();
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
      currentPhase: 'ready',
      currentPhaseStartTime: now,
      createdAt: now,
      lastActivityAt: now,
    };

    this.gameSessions.set(roomId, session);
    this.metricsService.incrementActiveGames();

    return session;
  }

  /**
   * 세션 활동 시각 갱신. phase 전환·답안 제출 등 상태 변경 시점에 호출.
   * idle sweeper가 이 값을 기준으로 stale 세션을 판정한다.
   */
  private touchSession(session: GameSession): void {
    session.lastActivityAt = Date.now();
  }

  /**
   * Idle sweeper — SESSION_STALE_MS 이상 활동 없는 세션 일괄 정리.
   * catch 블록 누락·비정상 종료 경로에서 남은 좀비 세션의 2차 방어선.
   * 회수된 세션 수는 game_session_leak_recovered_total 메트릭에 기록.
   */
  sweepStaleSessions(): number {
    const now = Date.now();
    const staleRoomIds: string[] = [];

    for (const [roomId, session] of this.gameSessions.entries()) {
      if (now - session.lastActivityAt >= SESSION_STALE_MS) {
        staleRoomIds.push(roomId);
      }
    }

    for (const roomId of staleRoomIds) {
      const session = this.gameSessions.get(roomId);

      if (!session) {
        continue;
      }

      const ageMs = now - session.createdAt;
      const idleMs = now - session.lastActivityAt;

      this.logger.warn(
        `Stale session reclaimed: roomId=${roomId} age=${Math.round(ageMs / 1000)}s idle=${Math.round(
          idleMs / 1000,
        )}s phase=${session.currentPhase}`,
      );
      Sentry.captureMessage('Stale game session reclaimed', {
        level: 'warning',
        tags: { roomId, phase: session.currentPhase },
        extra: { ageMs, idleMs },
      });

      this.gameSessions.delete(roomId);
      this.metricsService.decrementActiveGames();
      this.metricsService.recordGameSessionLeakRecovered('idle');
    }

    return staleRoomIds.length;
  }

  getGameSession(roomId: string): GameSession | null {
    return this.gameSessions.get(roomId) || null;
  }

  deleteGameSession(roomId: string): boolean {
    const deleted = this.gameSessions.delete(roomId);

    if (deleted) {
      this.metricsService.decrementActiveGames();
    }

    return deleted;
  }

  startNextRound(roomId: string): RoundData {
    const session = this.getGameSessionOrThrow(roomId);
    const nextRoundNumber = session.currentRound + 1;

    if (nextRoundNumber > session.totalRounds) {
      throw new Error(`모든 라운드가 완료되었습니다: ${roomId}`);
    }

    const roundData: RoundData = {
      roundNumber: nextRoundNumber,
      status: 'waiting',
      question: null,
      questionId: null,
      submissions: {
        [session.player1Id]: null,
        [session.player2Id]: null,
      },
      result: null,
    };

    session.rounds.set(nextRoundNumber, roundData);
    session.currentRound = nextRoundNumber;
    this.touchSession(session);

    return roundData;
  }

  setQuestion(roomId: string, question: QuestionEntity): void {
    const session = this.getGameSessionOrThrow(roomId);
    const round = this.getCurrentRoundOrThrow(session);

    if (round.question !== null) {
      throw new Error(`이미 문제가 설정된 라운드입니다: ${round.roundNumber}`);
    }

    round.question = question;
    round.questionId = question.id ?? null;
    round.status = 'in_progress';
  }

  getQuestion(roomId: string): QuestionEntity | null {
    const session = this.getGameSessionOrThrow(roomId);
    const round = this.getCurrentRoundOrThrow(session);

    return round.question;
  }

  submitAnswer(roomId: string, playerId: string, answer: string): Submission {
    const session = this.getGameSessionOrThrow(roomId);
    const round = this.getCurrentRoundOrThrow(session);

    if (playerId !== session.player1Id && playerId !== session.player2Id) {
      throw new Error(`세션에 포함되지 않은 플레이어입니다: ${playerId}`);
    }

    if (round.status !== 'in_progress') {
      throw new Error(`라운드가 진행 중이 아닙니다: ${round.roundNumber}`);
    }

    if (round.submissions[playerId] !== null) {
      throw new Error(`이미 답안을 제출했습니다: ${playerId}`);
    }

    const submission: Submission = {
      playerId,
      answer,
      submittedAt: Date.now(),
    };

    round.submissions[playerId] = submission;
    this.touchSession(session);

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
      throw new Error(`모든 플레이어가 제출하지 않았습니다: ${roomId}`);
    }

    if (round.question === null) {
      throw new Error(`문제가 설정되지 않았습니다: ${roomId}`);
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
    this.touchSession(session);
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
      throw new Error(`게임 세션을 찾을 수 없습니다: ${roomId}`);
    }

    return session;
  }

  private getCurrentRoundOrThrow(session: GameSession): RoundData {
    const round = session.rounds.get(session.currentRound);

    if (!round) {
      throw new Error(`라운드를 찾을 수 없습니다: ${session.currentRound}`);
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
      throw new Error(`세션에 포함되지 않은 플레이어입니다: ${playerId}`);
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

  // ============================================
  // Phase 관리 함수
  // ============================================

  setPhase(roomId: string, phase: RoundPhase): void {
    const session = this.getGameSessionOrThrow(roomId);
    session.currentPhase = phase;
    session.currentPhaseStartTime = Date.now();
    this.touchSession(session);
  }

  getPhase(roomId: string): RoundPhase {
    const session = this.getGameSessionOrThrow(roomId);

    return session.currentPhase;
  }

  hasPlayerSubmitted(roomId: string, playerId: string): boolean {
    const session = this.getGameSessionOrThrow(roomId);
    const round = this.getCurrentRoundOrThrow(session);

    return round.submissions[playerId] !== null;
  }
}
