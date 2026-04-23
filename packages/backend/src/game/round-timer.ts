import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ROUND_TIMER_QUEUE } from './queues/queue.constants';
import { RoundTimerJobData } from './workers/round-timer.worker';

interface TickRoom {
  endAt: number;
  onTick: (remainedSec: number) => void;
  active: boolean;
}

@Injectable()
export class RoundTimer {
  private readonly logger = new Logger(RoundTimer.name);
  private tickRooms = new Map<string, TickRoom>();
  private globalTickInterval?: NodeJS.Timeout;

  constructor(@InjectQueue(ROUND_TIMER_QUEUE) private readonly queue: Queue<RoundTimerJobData>) {}

  async startReadyCountdown(roomId: string, duration: number): Promise<void> {
    await this.schedulePhaseTimeout(roomId, 'ready', duration);
  }

  async startQuestionTimer(roomId: string, duration: number): Promise<void> {
    await this.schedulePhaseTimeout(roomId, 'question', duration);
  }

  async startReviewTimer(roomId: string, duration: number): Promise<void> {
    await this.schedulePhaseTimeout(roomId, 'review', duration);
  }

  private async schedulePhaseTimeout(
    roomId: string,
    phase: 'ready' | 'question' | 'review',
    duration: number,
  ): Promise<void> {
    const jobId = `phase:${phase}:${roomId}`;
    // 이전 job 제거 후 추가 (동일 roomId 재스케줄 시 중복 방지)
    await this.queue.remove(jobId);
    await this.queue.add(
      'phase-timeout',
      { roomId, phase },
      {
        delay: duration * 1000,
        jobId,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
    this.logger.log(`[Timer] scheduled ${phase} timeout in ${duration}s for room=${roomId}`);
  }

  /**
   * 시간 동기화 틱 인터벌 (클라이언트 UI 업데이트용)
   *
   * 틱은 게임 진행에 영향을 주지 않으므로 in-process setInterval을 유지.
   * 페이즈 전환은 BullMQ가 보장하므로 노드 크래시 시 틱이 멈춰도 게임은 정상 진행됨.
   */
  startTickInterval(
    roomId: string,
    totalDuration: number,
    onTick: (remainedSec: number) => void,
  ): void {
    const endAt = Date.now() + totalDuration * 1000;
    const existingRoom = this.tickRooms.get(roomId);

    if (existingRoom) {
      existingRoom.endAt = endAt;
      existingRoom.onTick = onTick;
      existingRoom.active = true;
    } else {
      this.tickRooms.set(roomId, { endAt, onTick, active: true });
    }

    onTick(totalDuration);

    if (!this.globalTickInterval) {
      this.startGlobalTick();
    }
  }

  private startGlobalTick(): void {
    this.globalTickInterval = setInterval(() => {
      const now = Date.now();
      let hasActiveRoom = false;

      for (const room of this.tickRooms.values()) {
        if (!room.active) {
          continue;
        }

        hasActiveRoom = true;
        const remainedSec = Math.max(0, Math.ceil((room.endAt - now) / 1000));
        room.onTick(remainedSec);

        if (remainedSec <= 0) {
          room.active = false;
        }
      }

      if (!hasActiveRoom) {
        clearInterval(this.globalTickInterval);
        this.globalTickInterval = undefined;
      }
    }, 1000);
  }

  clearTickInterval(roomId: string): void {
    const room = this.tickRooms.get(roomId);

    if (room) {
      room.active = false;
    }
  }

  async clearQuestionTimer(roomId: string): Promise<void> {
    await this.queue.remove(`phase:question:${roomId}`);
  }

  async clearAllTimers(roomId: string): Promise<void> {
    await Promise.allSettled([
      this.queue.remove(`phase:ready:${roomId}`),
      this.queue.remove(`phase:question:${roomId}`),
      this.queue.remove(`phase:review:${roomId}`),
    ]);
    this.tickRooms.delete(roomId);

    if (this.tickRooms.size === 0 && this.globalTickInterval) {
      clearInterval(this.globalTickInterval);
      this.globalTickInterval = undefined;
    }
  }
}
