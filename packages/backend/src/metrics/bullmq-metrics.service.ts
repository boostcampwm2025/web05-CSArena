import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MetricsService } from './metrics.service';
import { MATCH_PERSISTENCE_QUEUE, ROUND_TIMER_QUEUE } from '../game/queues/queue.constants';

const POLL_INTERVAL_MS = 15_000;

@Injectable()
export class BullmqMetricsService implements OnModuleInit, OnModuleDestroy {
  private interval: NodeJS.Timeout | null = null;

  constructor(
    private readonly metricsService: MetricsService,
    @InjectQueue(ROUND_TIMER_QUEUE) private readonly roundTimerQueue: Queue,
    @InjectQueue(MATCH_PERSISTENCE_QUEUE) private readonly matchPersistenceQueue: Queue,
  ) {}

  onModuleInit(): void {
    this.interval = setInterval(() => void this.collect(), POLL_INTERVAL_MS);
    this.interval.unref?.();
    void this.collect();
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async collect(): Promise<void> {
    await Promise.all([
      this.collectQueue(this.roundTimerQueue, ROUND_TIMER_QUEUE),
      this.collectQueue(this.matchPersistenceQueue, MATCH_PERSISTENCE_QUEUE),
    ]);
  }

  private async collectQueue(queue: Queue, name: string): Promise<void> {
    try {
      const counts = await queue.getJobCounts('waiting', 'active', 'failed');
      this.metricsService.setBullmqJobCounts(
        name,
        counts.waiting ?? 0,
        counts.active ?? 0,
        counts.failed ?? 0,
      );
    } catch {
      // Redis 일시 장애 시 메트릭 수집 실패는 무시 — 다음 interval에 재시도
    }
  }
}
