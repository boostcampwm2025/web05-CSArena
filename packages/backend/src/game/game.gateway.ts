import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { GameSessionManager } from './game-session-manager';
import { RoundProgressionService } from './round-progression.service';
import { RoundTimer } from './round-timer';
import { MatchPersistenceService } from './match-persistence.service';
import { SubmitAnswerRequest, SubmitAnswerResponse } from './interfaces/game.interfaces';
import { GameCommand, GameCommandBus, GameCommandResponse } from './game-command-bus';
import { MetricsService } from '../metrics';

@WebSocketGateway({ namespace: '/ws', cors: true })
export class GameGateway implements OnGatewayDisconnect, OnGatewayInit, OnModuleInit {
  private readonly logger = new Logger(GameGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly sessionManager: GameSessionManager,
    private readonly roundProgression: RoundProgressionService,
    private readonly roundTimer: RoundTimer,
    private readonly matchPersistence: MatchPersistenceService,
    private readonly commandBus: GameCommandBus,
    private readonly metricsService: MetricsService,
  ) {}

  afterInit(server: Server): void {
    // RoundProgressionService에 server 설정
    this.roundProgression.setServer(server);
  }

  onModuleInit(): void {
    // 커맨드 버스에 로컬 핸들러 등록
    this.commandBus.registerHandler((command) => this.handleRemoteCommand(command));
  }

  /**
   * 원격 인스턴스에서 전달된 게임 커맨드 처리
   */
  private async handleRemoteCommand(command: GameCommand): Promise<GameCommandResponse> {
    const { type, correlationId, roomId, userId, payload } = command;

    if (type === 'submit_answer') {
      const result = await this.processSubmitAnswer(roomId, userId, payload?.answer || '');

      return {
        correlationId,
        ok: result.ok,
        error: result.error,
        data: { opponentSubmitted: result.opponentSubmitted },
      };
    }

    if (type === 'disconnect') {
      await this.processDisconnect(roomId, userId);

      return { correlationId, ok: true };
    }

    if (type === 'phase_timeout') {
      const phase = payload?.phase;

      if (phase !== 'ready' && phase !== 'question' && phase !== 'review') {
        return { correlationId, ok: false, error: `Invalid phase: ${String(phase)}` };
      }

      if (!this.sessionManager.getGameSession(roomId)) {
        return { correlationId, ok: false, error: 'No local session' };
      }

      await this.roundProgression.handleTimerExpired(roomId, phase);

      return { correlationId, ok: true };
    }

    return { correlationId, ok: false, error: `Unknown command type: ${String(type)}` };
  }

  @SubscribeMessage('submit:answer')
  async handleSubmitAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubmitAnswerRequest,
  ): Promise<SubmitAnswerResponse> {
    const userId = this.sessionManager.getUserIdBySocketId(client.id);

    // 로컬 세션에서 사용자를 찾지 못하면 → 커맨드 버스로 원격 인스턴스에 전달
    if (!userId) {
      return this.forwardSubmitAnswer(client.id, data);
    }

    const roomId = this.sessionManager.getRoomBySocketId(client.id);

    if (!roomId) {
      return { ok: false, error: '방을 찾을 수 없습니다.' };
    }

    return this.processSubmitAnswer(roomId, userId, data.answer);
  }

  /**
   * 로컬에서 답안 제출 처리
   */
  private async processSubmitAnswer(
    roomId: string,
    userId: string,
    answer: string,
  ): Promise<SubmitAnswerResponse> {
    try {
      const gameSession = this.sessionManager.getGameSession(roomId);

      if (!gameSession) {
        return { ok: false, error: '게임 세션을 찾을 수 없습니다.' };
      }

      // 현재 phase가 question인지 확인
      if (gameSession.currentPhase !== 'question') {
        return { ok: false, error: '문제 풀이 단계에서만 답안을 제출할 수 있습니다.' };
      }

      // 이미 제출했는지 확인
      if (this.sessionManager.hasPlayerSubmitted(roomId, userId)) {
        return { ok: false, error: '이미 답안을 제출했습니다.' };
      }

      // 상대 플레이어 ID와 소켓 ID 확인
      const opponentId =
        userId === gameSession.player1Id ? gameSession.player2Id : gameSession.player1Id;
      const opponentSocketId =
        userId === gameSession.player1Id
          ? gameSession.player2SocketId
          : gameSession.player1SocketId;

      // 답안 제출 전에 상대가 이미 제출했는지 확인
      const opponentAlreadySubmitted = this.sessionManager.hasPlayerSubmitted(roomId, opponentId);

      // 답안 제출
      this.sessionManager.submitAnswer(roomId, userId, answer);

      // 상대에게 제출 알림 (Redis Adapter가 크로스 인스턴스 전달)
      this.server.to(opponentSocketId).emit('opponent:submitted', {});

      // 양쪽 모두 제출했으면 그레이딩 시작
      if (this.sessionManager.isAllSubmitted(roomId)) {
        await this.roundTimer.clearQuestionTimer(roomId);
        this.roundTimer.clearTickInterval(roomId);
        await this.roundProgression.phaseGrading(roomId);
      }

      return { ok: true, opponentSubmitted: opponentAlreadySubmitted };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 원격 인스턴스로 submit:answer 전달
   * (이 인스턴스에 게임 세션이 없을 때)
   */
  private async forwardSubmitAnswer(
    socketId: string,
    data: SubmitAnswerRequest,
  ): Promise<SubmitAnswerResponse> {
    this.logger.log(`Forwarding submit:answer via command bus (socket: ${socketId})`);
    this.metricsService.incrementGameCommandForwards();

    const response = await this.commandBus.forward({
      type: 'submit_answer',
      roomId: '', // 원격에서 userId로 찾아야 함 — 아래에서 설명
      userId: socketId, // socketId를 전달, 원격에서 세션 조회
      payload: { answer: data.answer, socketId },
    });

    return {
      ok: response.ok,
      error: response.error,
      opponentSubmitted: response.data?.opponentSubmitted as boolean | undefined,
    };
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const disconnectInfo = this.sessionManager.getDisconnectInfo(client.id);

    // 게임 중 연결 끊김 처리
    if (disconnectInfo.roomId && disconnectInfo.userId) {
      await this.processDisconnect(disconnectInfo.roomId, disconnectInfo.userId);
    }
  }

  /**
   * 연결 끊김 처리 (로컬 + 원격 커맨드 버스 모두에서 호출)
   */
  private async processDisconnect(roomId: string, userId: string): Promise<void> {
    await this.roundTimer.clearAllTimers(roomId);

    const gameSession = this.sessionManager.getGameSession(roomId);

    if (!gameSession) {
      return;
    }

    // 상대방 결정
    const opponentId =
      userId === gameSession.player1Id ? gameSession.player2Id : gameSession.player1Id;

    const opponentSocketId =
      userId === gameSession.player1Id ? gameSession.player2SocketId : gameSession.player1SocketId;

    // 상대방에게 승리 통보 (Redis Adapter가 크로스 인스턴스 전달)
    this.server.to(opponentSocketId).emit('opponent:disconnected', {
      winnerId: opponentId,
      reason: 'disconnect',
    });

    // DB 저장 (연결 끊김 기록) - 상대방이 승자
    let eloChanges: { player1Change: number; player2Change: number } | null = null;

    try {
      const finalResult = {
        winnerId: opponentId,
        scores: {
          [gameSession.player1Id]: gameSession.player1Score,
          [gameSession.player2Id]: gameSession.player2Score,
        },
        isDraw: false,
      };
      eloChanges = await this.matchPersistence.saveMatchToDatabase(roomId, finalResult);
    } catch (error) {
      this.logger.error(
        `Failed to save match after disconnect: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    // 상대방에게 match:end 이벤트 전송
    const opponentTierPointChange =
      opponentId === gameSession.player1Id
        ? (eloChanges?.player1Change ?? 0)
        : (eloChanges?.player2Change ?? 0);

    this.server.to(opponentSocketId).emit('match:end', {
      isWin: true,
      finalScores: {
        my: userId === gameSession.player1Id ? gameSession.player2Score : gameSession.player1Score,
        opponent:
          userId === gameSession.player1Id ? gameSession.player1Score : gameSession.player2Score,
      },
      tierPointChange: opponentTierPointChange,
    });

    // 세션 정리
    this.sessionManager.deleteGameSession(roomId);
  }
}
