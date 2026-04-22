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
          retryStrategy: (times) => {
            if (times > 10) {
              return null;
            }

            return Math.min(times * 200, 2000);
          },
          maxRetriesPerRequest: 3,
        });

        client.on('connect', () => {
          logger.log(`Connected to ${host}:${port}`);
        });

        client.on('error', (err) => {
          logger.error(`Connection error: ${err.message}`);
        });

        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
