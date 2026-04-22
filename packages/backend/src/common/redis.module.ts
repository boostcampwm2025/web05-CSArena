import { Global, Logger, Module } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        const logger = new Logger('RedisModule');
        const host = process.env.REDIS_HOST || 'localhost';
        const port = parseInt(process.env.REDIS_PORT || '6379', 10);

        const client = new Redis({
          host,
          port,
          // 지수 백오프만 유지 — null 반환 시 영구 재연결 포기가 되어
          // 네트워크 블립/Redis 재시작/페일오버 이후 복구 불능에 빠짐.
          // 장애 감지는 'error'/'end' 이벤트 로깅으로 처리.
          retryStrategy: (times) => Math.min(times * 200, 2000),
          maxRetriesPerRequest: 3,
        });

        client.on('connect', () => {
          logger.log(`Connected to ${host}:${port}`);
        });

        client.on('error', (err) => {
          logger.error(`Connection error: ${err.message}`);
        });

        client.on('end', () => {
          logger.warn(`Connection ended — will auto-reconnect on recovery`);
        });

        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
