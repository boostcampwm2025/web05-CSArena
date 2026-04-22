import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ROUND_TIMER_QUEUE } from '../queues/queue.constants';
import { GameSessionManager } from '../game-session-manager';
import { RoundProgressionService } from '../round-progression.service';
import { GameCommandBus } from '../game-command-bus';

export interface RoundTimerJobData {
  roomId: string;
  phase: 'ready' | 'question' | 'review';
}

@Processor(ROUND_TIMER_QUEUE)
export class RoundTimerWorker extends WorkerHost {
  private readonly logger = new Logger(RoundTimerWorker.name);

  constructor(
    private readonly sessionManager: GameSessionManager,
    private readonly roundProgression: RoundProgressionService,
    private readonly commandBus: GameCommandBus,
  ) {
    super();
  }

  async process(job: Job<RoundTimerJobData>): Promise<void> {
    const { roomId, phase } = job.data;

    // 이 인스턴스에 세션이 있으면 직접 처리
    const session = this.sessionManager.getGameSession(roomId);

    if (session) {
      this.logger.log(`[Timer] ${phase} timeout: room=${roomId} (local)`);
      await this.roundProgression.handleTimerExpired(roomId, phase);

      return;
    }

    // 세션 보유 인스턴스로 포워딩
    this.logger.log(`[Timer] ${phase} timeout: room=${roomId} (forwarding)`);
    const response = await this.commandBus.forward({
      type: 'phase_timeout',
      roomId,
      userId: '',
      payload: { phase },
    });

    if (!response.ok) {
      // 세션이 이미 종료된 경우 (정상 종료 후 stale job) — 오류가 아님
      this.logger.warn(`[Timer] forward failed for ${phase}/${roomId}: ${response.error}`);
    }
  }
}
