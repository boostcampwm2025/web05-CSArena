import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { REDIS_CLIENT } from '../common/redis.module';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

type CommandHandler = (command: GameCommand) => Promise<GameCommandResponse>;

const COMMAND_CHANNEL_PREFIX = 'game:commands';
const RESPONSE_CHANNEL_PREFIX = 'game:responses';

export interface GameCommand {
  type: 'submit_answer' | 'disconnect';
  correlationId: string;
  roomId: string;
  userId: string;
  payload?: {
    answer?: string;
    socketId?: string;
  };
}

export interface GameCommandResponse {
  correlationId: string;
  ok: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

/**
 * Redis Pub/Sub 기반 게임 커맨드 버스
 *
 * 원격 인스턴스에서 도착한 게임 이벤트(submit:answer 등)를
 * 게임 세션을 소유한 인스턴스로 전달합니다.
 *
 * 흐름:
 * 1. Instance B에서 submit:answer 도착 → 로컬 세션 없음
 * 2. GameCommandBus.forward() → Redis publish game:commands
 * 3. Instance A가 subscribe → 로컬에서 처리
 * 4. Instance A → Redis publish game:responses:{correlationId}
 * 5. Instance B가 대기 중이던 Promise resolve
 */
@Injectable()
export class GameCommandBus implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GameCommandBus.name);
  private subscriber: Redis;
  private commandHandler: CommandHandler | null = null;
  private pendingResponses = new Map<
    string,
    {
      resolve: (response: GameCommandResponse) => void;
      timeout: NodeJS.Timeout;
    }
  >();

  private readonly instanceId: string;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    this.instanceId = process.env.INSTANCE_ID || `instance-${randomUUID().slice(0, 8)}`;
  }

  async onModuleInit(): Promise<void> {
    // 별도의 subscriber 연결 (pub/sub은 전용 연결 필요)
    this.subscriber = this.redis.duplicate();

    // 게임 커맨드 구독
    await this.subscriber.subscribe(COMMAND_CHANNEL_PREFIX);

    // 이 인스턴스의 응답 채널 구독
    await this.subscriber.subscribe(`${RESPONSE_CHANNEL_PREFIX}:${this.instanceId}`);

    this.subscriber.on('message', (channel, message) => {
      if (channel === COMMAND_CHANNEL_PREFIX) {
        void this.handleIncomingCommand(message);
      } else if (channel.startsWith(RESPONSE_CHANNEL_PREFIX)) {
        this.handleIncomingResponse(message);
      }
    });

    this.logger.log(`GameCommandBus initialized (instance: ${this.instanceId})`);
  }

  async onModuleDestroy(): Promise<void> {
    // 대기 중인 응답 모두 타임아웃 처리
    for (const [id, pending] of this.pendingResponses) {
      clearTimeout(pending.timeout);
      pending.resolve({ correlationId: id, ok: false, error: 'Service shutting down' });
    }

    this.pendingResponses.clear();

    if (this.subscriber) {
      await this.subscriber.unsubscribe();
      this.subscriber.disconnect();
    }
  }

  /**
   * 로컬 커맨드 핸들러 등록 (GameGateway에서 호출)
   */
  registerHandler(handler: CommandHandler): void {
    this.commandHandler = handler;
  }

  /**
   * 원격 인스턴스로 커맨드 전달 + 응답 대기
   */
  async forward(
    command: Omit<GameCommand, 'correlationId'>,
    timeoutMs = 3000,
  ): Promise<GameCommandResponse> {
    const correlationId = randomUUID();
    const fullCommand: GameCommand & { sourceInstance: string } = {
      ...command,
      correlationId,
      sourceInstance: this.instanceId,
    };

    return new Promise<GameCommandResponse>((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(correlationId);
        resolve({
          correlationId,
          ok: false,
          error: `Command timeout after ${timeoutMs}ms`,
        });
      }, timeoutMs);

      this.pendingResponses.set(correlationId, { resolve, timeout });

      this.redis.publish(COMMAND_CHANNEL_PREFIX, JSON.stringify(fullCommand)).catch((err) => {
        this.pendingResponses.delete(correlationId);
        clearTimeout(timeout);
        resolve({
          correlationId,
          ok: false,
          error: `Failed to publish command: ${err}`,
        });
      });
    });
  }

  /**
   * 수신한 커맨드를 로컬 핸들러로 처리
   */
  private async handleIncomingCommand(message: string): Promise<void> {
    try {
      const command = JSON.parse(message) as GameCommand & { sourceInstance: string };

      // 자기 자신이 보낸 커맨드는 무시 (이미 로컬에서 처리 시도했을 것)
      if (command.sourceInstance === this.instanceId) {
        return;
      }

      if (!this.commandHandler) {
        this.logger.warn('No command handler registered');

        return;
      }

      const response = await this.commandHandler(command);

      // 응답을 발신 인스턴스의 응답 채널로 전송
      await this.redis.publish(
        `${RESPONSE_CHANNEL_PREFIX}:${command.sourceInstance}`,
        JSON.stringify(response),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Failed to handle command: ${message}`);
    }
  }

  /**
   * 대기 중인 응답을 resolve
   */
  private handleIncomingResponse(message: string): void {
    try {
      const response = JSON.parse(message) as GameCommandResponse;
      const pending = this.pendingResponses.get(response.correlationId);

      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingResponses.delete(response.correlationId);
        pending.resolve(response);
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Failed to handle response: ${errMsg}`);
    }
  }
}
