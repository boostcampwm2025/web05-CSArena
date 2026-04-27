import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { type EventLoopUtilization, performance } from 'perf_hooks';
import { MetricsService } from './metrics.service';

const SAMPLE_INTERVAL_MS = 1000;

/**
 * 이벤트 루프 활용도 1초 주기 샘플링.
 * `performance.eventLoopUtilization()`의 두 호출 간 idle/active 시간 차이로
 * 직전 1초 구간의 활용도(0.0~1.0)를 계산해 Prometheus Gauge에 기록한다.
 *
 * 부하 한계 측정의 핵심 진단 메트릭 — 0.85 초과가 지속되면 이벤트 루프 포화.
 */
@Injectable()
export class EventLoopMonitorService implements OnModuleInit, OnModuleDestroy {
  private interval: NodeJS.Timeout | null = null;
  private lastSample: EventLoopUtilization | null = null;

  constructor(private readonly metricsService: MetricsService) {}

  onModuleInit(): void {
    this.lastSample = performance.eventLoopUtilization();
    this.interval = setInterval(() => this.sample(), SAMPLE_INTERVAL_MS);
    this.interval.unref?.();
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private sample(): void {
    const current = performance.eventLoopUtilization();
    const delta = this.lastSample
      ? performance.eventLoopUtilization(current, this.lastSample)
      : current;
    this.lastSample = current;
    this.metricsService.setEventLoopUtilization(delta.utilization);
  }
}
