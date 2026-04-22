import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication, Logger } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server, ServerOptions } from 'socket.io';
import { createClient } from 'redis';

/**
 * Socket.IO Redis Adapter
 *
 * 주의: @socket.io/redis-adapter는 node-redis (v4) 패키지를 사용해야 합니다.
 * ioredis를 사용하면 subscribe API 차이로 크로스 인스턴스 이벤트 전달이 안 됩니다.
 *
 * 삽질 기록:
 * - 처음에 ioredis로 시도 → adapter 채널이 Redis에 생성되지 않음
 * - PUBSUB CHANNELS로 확인 → socket.io# 채널 부재
 * - node-redis로 변경 후 정상 동작
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(
    app: INestApplication,
    private readonly redisHost: string,
    private readonly redisPort: number,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const pubClient = createClient({
      url: `redis://${this.redisHost}:${this.redisPort}`,
    });

    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log(
      `Redis IO Adapter connected to ${this.redisHost}:${this.redisPort} (node-redis)`,
    );
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;
    server.adapter(this.adapterConstructor);

    return server;
  }
}
