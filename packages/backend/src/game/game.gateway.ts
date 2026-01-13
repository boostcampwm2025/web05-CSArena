import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { GameSessionManager } from './game-session-manager';
import { RoundProgressionService } from './round-progression.service';
import { RoundTimer } from './round-timer';
import { SubmitAnswerRequest, SubmitAnswerResponse } from './interfaces/game.interfaces';

@WebSocketGateway({ namespace: '/ws', cors: true })
export class GameGateway implements OnGatewayDisconnect, OnGatewayInit {
  private readonly logger = new Logger(GameGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly gameService: GameService,
    private readonly sessionManager: GameSessionManager,
    private readonly roundProgression: RoundProgressionService,
    private readonly roundTimer: RoundTimer,
  ) {}

  afterInit(server: Server): void {
    // RoundProgressionService에 server 설정
    this.roundProgression.setServer(server);
  }

  @SubscribeMessage('submit:answer')
  async handleSubmitAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubmitAnswerRequest,
  ): Promise<SubmitAnswerResponse> {
    const userId = this.sessionManager.getUserIdBySocketId(client.id);

    if (!userId) {
      return { ok: false, error: 'User not found' };
    }

    const roomId = this.sessionManager.getRoomBySocketId(client.id);

    if (!roomId) {
      return { ok: false, error: 'Room not found' };
    }

    try {
      const gameSession = this.sessionManager.getGameSession(roomId);

      if (!gameSession) {
        return { ok: false, error: 'Game session not found' };
      }

      // 현재 phase가 question인지 확인
      if (gameSession.currentPhase !== 'question') {
        return { ok: false, error: 'Cannot submit answer outside question phase' };
      }

      // 이미 제출했는지 확인
      if (this.sessionManager.hasPlayerSubmitted(roomId, userId)) {
        return { ok: false, error: 'Answer already submitted' };
      }

      // 답안 제출
      this.sessionManager.submitAnswer(roomId, userId, data.answer);

      // 상대에게 제출 알림
      const opponentSocketId =
        userId === gameSession.player1Id
          ? gameSession.player2SocketId
          : gameSession.player1SocketId;

      this.server.to(opponentSocketId).emit('opponent:submitted', {});

      // 양쪽 모두 제출했으면 그레이딩 시작
      if (this.sessionManager.isAllSubmitted(roomId)) {
        this.roundTimer.clearQuestionTimer(roomId);
        this.roundTimer.clearTickInterval(roomId);
        await this.roundProgression.phaseGrading(roomId);
      }

      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const disconnectInfo = this.sessionManager.disconnectFromGame(client.id);

    // 게임 중 연결 끊김 처리
    if (disconnectInfo.roomId && disconnectInfo.userId) {
      this.roundTimer.clearAllTimers(disconnectInfo.roomId);

      const gameSession = this.sessionManager.getGameSession(disconnectInfo.roomId);

      if (!gameSession) {
        return;
      }

      // 상대방 결정
      const opponentId =
        disconnectInfo.userId === gameSession.player1Id
          ? gameSession.player2Id
          : gameSession.player1Id;

      const opponentSocketId =
        disconnectInfo.userId === gameSession.player1Id
          ? gameSession.player2SocketId
          : gameSession.player1SocketId;

      // 상대방에게 승리 통보
      this.server.to(opponentSocketId).emit('opponent:disconnected', {
        winnerId: opponentId,
        reason: 'disconnect',
      });

      // 상대방에게 match:end 이벤트 전송
      this.server.to(opponentSocketId).emit('match:end', {
        isWin: true,
        finalScores: {
          my:
            disconnectInfo.userId === gameSession.player1Id
              ? gameSession.player2Score
              : gameSession.player1Score,
          opponent:
            disconnectInfo.userId === gameSession.player1Id
              ? gameSession.player1Score
              : gameSession.player2Score,
        },
      });

      // DB 저장 (연결 끊김 기록)
      try {
        await this.gameService.saveMatchToDatabase(disconnectInfo.roomId);
      } catch (error) {
        this.logger.error(
          `Failed to save match after disconnect: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      // 세션 정리
      this.sessionManager.deleteGameSession(disconnectInfo.roomId);
    }
  }
}
