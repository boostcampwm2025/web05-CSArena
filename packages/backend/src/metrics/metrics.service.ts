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

  // 경로 정규화 (동적 파라미터 제거)
  private normalizePath(path: string): string {
    return path
      .replace(/\/\d+/g, '/:id') // 숫자 ID를 :id로 변환
      .replace(/\/[a-f0-9-]{36}/gi, '/:uuid'); // UUID를 :uuid로 변환
  }
}
