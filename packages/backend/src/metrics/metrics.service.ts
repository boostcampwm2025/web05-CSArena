import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Gauge, Histogram } from 'prom-client';

@Injectable()
export class MetricsService {
  constructor(
    // HTTP 메트릭
    @InjectMetric('http_requests_total')
    public readonly httpRequestsTotal: Counter<string>,

    @InjectMetric('http_request_duration_seconds')
    public readonly httpRequestDuration: Histogram<string>,

    @InjectMetric('http_requests_errors_total')
    public readonly httpRequestsErrors: Counter<string>,

    // 비즈니스 메트릭
    @InjectMetric('user_logins_total')
    public readonly userLoginsTotal: Counter<string>,

    @InjectMetric('websocket_connections_active')
    public readonly websocketConnectionsActive: Gauge<string>,

    @InjectMetric('matchmaking_queue_size')
    public readonly matchmakingQueueSize: Gauge<string>,

    @InjectMetric('games_active_total')
    public readonly gamesActiveTotal: Gauge<string>,

    @InjectMetric('game_command_forwards_total')
    public readonly gameCommandForwardsTotal: Counter<string>,

    @InjectMetric('game_command_forward_latency_seconds')
    public readonly gameCommandForwardLatency: Histogram<string>,

    @InjectMetric('game_session_leak_recovered_total')
    public readonly gameSessionLeakRecovered: Counter<string>,

    @InjectMetric('process_event_loop_utilization')
    public readonly eventLoopUtilization: Gauge<string>,

    @InjectMetric('matchmaking_wait_duration_seconds')
    public readonly matchmakingWaitDuration: Histogram<string>,

    @InjectMetric('grading_duration_seconds')
    public readonly gradingDuration: Histogram<string>,

    @InjectMetric('bullmq_jobs_waiting')
    public readonly bullmqJobsWaiting: Gauge<string>,

    @InjectMetric('bullmq_jobs_active')
    public readonly bullmqJobsActive: Gauge<string>,

    @InjectMetric('bullmq_jobs_failed')
    public readonly bullmqJobsFailed: Gauge<string>,
  ) {}

  // HTTP 메트릭 기록
  recordHttpRequest(method: string, path: string, statusCode: number, duration: number): void {
    const normalizedPath = this.normalizePath(path);

    this.httpRequestsTotal.inc({ method, path: normalizedPath, status_code: statusCode });
    this.httpRequestDuration.observe({ method, path: normalizedPath }, duration);

    if (statusCode >= 400) {
      this.httpRequestsErrors.inc({ method, path: normalizedPath, status_code: statusCode });
    }
  }

  // 로그인 기록
  recordLogin(provider: string): void {
    this.userLoginsTotal.inc({ provider });
  }

  // 웹소켓 연결 증가
  incrementWebsocketConnections(): void {
    this.websocketConnectionsActive.inc();
  }

  // 웹소켓 연결 감소
  decrementWebsocketConnections(): void {
    this.websocketConnectionsActive.dec();
  }

  // 매칭 대기열 크기 설정
  setMatchmakingQueueSize(size: number): void {
    this.matchmakingQueueSize.set(size);
  }

  // 진행 중인 게임 수 증가
  incrementActiveGames(): void {
    this.gamesActiveTotal.inc();
  }

  // 진행 중인 게임 수 감소
  decrementActiveGames(): void {
    this.gamesActiveTotal.dec();
  }

  // 게임 커맨드 포워딩 횟수 증가
  incrementGameCommandForwards(): void {
    this.gameCommandForwardsTotal.inc();
  }

  // 게임 커맨드 포워딩 지연 시간 기록
  recordGameCommandForwardLatency(durationSeconds: number): void {
    this.gameCommandForwardLatency.observe(durationSeconds);
  }

  // 회수된 누수 세션 기록.
  //   reason='idle'        — 주기적 idle sweeper가 정리
  //   reason='catch_error' — RoundProgressionService catch 헬퍼가 에러 경로에서 정리
  recordGameSessionLeakRecovered(reason: 'idle' | 'catch_error'): void {
    this.gameSessionLeakRecovered.inc({ reason });
  }

  // 이벤트 루프 활용도 갱신 (0.0~1.0)
  setEventLoopUtilization(value: number): void {
    this.eventLoopUtilization.set(value);
  }

  // 매칭 대기 시간 기록 (큐 진입 시각 → 현재)
  recordMatchmakingWaitDuration(queuedAtMs: number): void {
    const durationSeconds = (Date.now() - queuedAtMs) / 1000;
    this.matchmakingWaitDuration.observe(durationSeconds);
  }

  // Clova 채점 소요 시간 기록
  recordGradingDuration(
    durationSeconds: number,
    questionType: string,
    status: 'success' | 'error',
  ): void {
    this.gradingDuration.observe({ question_type: questionType, status }, durationSeconds);
  }

  // BullMQ 큐 상태 갱신
  setBullmqJobCounts(queue: string, waiting: number, active: number, failed: number): void {
    this.bullmqJobsWaiting.set({ queue }, waiting);
    this.bullmqJobsActive.set({ queue }, active);
    this.bullmqJobsFailed.set({ queue }, failed);
  }

  // 경로 정규화 (동적 파라미터 제거)
  private normalizePath(path: string): string {
    return path
      .replace(/\/\d+/g, '/:id') // 숫자 ID를 :id로 변환
      .replace(/\/[a-f0-9-]{36}/gi, '/:uuid'); // UUID를 :uuid로 변환
  }
}
