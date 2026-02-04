import { Global, Module } from '@nestjs/common';
import {
  makeCounterProvider,
  makeGaugeProvider,
  makeHistogramProvider,
  PrometheusModule,
} from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  providers: [
    // HTTP 메트릭
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status_code'],
    }),
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    }),
    makeCounterProvider({
      name: 'http_requests_errors_total',
      help: 'Total number of HTTP request errors (4xx, 5xx)',
      labelNames: ['method', 'path', 'status_code'],
    }),

    // 비즈니스 메트릭
    makeCounterProvider({
      name: 'user_logins_total',
      help: 'Total number of user logins',
      labelNames: ['provider'],
    }),
    makeGaugeProvider({
      name: 'websocket_connections_active',
      help: 'Number of active WebSocket connections',
    }),
    makeGaugeProvider({
      name: 'matchmaking_queue_size',
      help: 'Number of users in matchmaking queue',
    }),
    makeGaugeProvider({
      name: 'games_active_total',
      help: 'Number of active game sessions',
    }),

    MetricsService,
    HttpMetricsInterceptor,
  ],
  exports: [MetricsService, HttpMetricsInterceptor],
})
export class MetricsModule {}
