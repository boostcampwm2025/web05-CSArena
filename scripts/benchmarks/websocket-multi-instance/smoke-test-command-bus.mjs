/**
 * GameCommandBus Pub/Sub 패턴 스모크 테스트
 *
 * 두 개의 시뮬레이션 인스턴스(A, B)를 만들어
 * correlationId 기반 Request/Reply 패턴이 정상 동작하는지 확인.
 *
 * 실제 코드: packages/backend/src/game/game-command-bus.ts
 *
 * 사용:
 *   cd scripts/benchmarks
 *   pnpm install --ignore-workspace
 *   pnpm smoke:command-bus
 */
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

const COMMAND_CHANNEL = 'smoke:game:commands';
const RESPONSE_CHANNEL_PREFIX = 'smoke:game:responses';

class MockCommandBus {
  constructor(instanceId) {
    this.instanceId = instanceId;
    this.pub = new Redis({ host: 'localhost', port: 6379 });
    this.sub = new Redis({ host: 'localhost', port: 6379 });
    this.pending = new Map();
    this.handler = null;
  }

  async start() {
    await this.sub.subscribe(COMMAND_CHANNEL);
    await this.sub.subscribe(`${RESPONSE_CHANNEL_PREFIX}:${this.instanceId}`);

    this.sub.on('message', async (channel, message) => {
      if (channel === COMMAND_CHANNEL) {
        const cmd = JSON.parse(message);
        if (cmd.sourceInstance === this.instanceId) return; // 자기 자신 무시
        if (!this.handler) return;

        const response = await this.handler(cmd);
        await this.pub.publish(
          `${RESPONSE_CHANNEL_PREFIX}:${cmd.sourceInstance}`,
          JSON.stringify(response),
        );
      } else if (channel.startsWith(RESPONSE_CHANNEL_PREFIX)) {
        const resp = JSON.parse(message);
        const pending = this.pending.get(resp.correlationId);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pending.delete(resp.correlationId);
          pending.resolve(resp);
        }
      }
    });
  }

  registerHandler(handler) {
    this.handler = handler;
  }

  forward(command, timeoutMs = 3000) {
    const correlationId = randomUUID();
    const full = { ...command, correlationId, sourceInstance: this.instanceId };

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.pending.delete(correlationId);
        resolve({ correlationId, ok: false, error: `timeout` });
      }, timeoutMs);

      this.pending.set(correlationId, { resolve, timeout });
      this.pub.publish(COMMAND_CHANNEL, JSON.stringify(full));
    });
  }

  async stop() {
    await this.sub.unsubscribe();
    this.sub.disconnect();
    this.pub.disconnect();
  }
}

let passed = 0;
let failed = 0;
const assert = (cond, name, detail = '') => {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name} ${detail}`); }
};

async function runTests() {
  console.log('\n=== GameCommandBus Pub/Sub Smoke Test ===\n');

  const instanceA = new MockCommandBus('instance-A');
  const instanceB = new MockCommandBus('instance-B');

  await instanceA.start();
  await instanceB.start();

  // A는 submit_answer를 실제로 처리하는 쪽
  instanceA.registerHandler(async (cmd) => {
    if (cmd.type === 'submit_answer') {
      return {
        correlationId: cmd.correlationId,
        ok: true,
        data: { opponentSubmitted: false, processedBy: 'instance-A' },
      };
    }
    return { correlationId: cmd.correlationId, ok: false, error: 'unknown' };
  });

  // B는 아무것도 처리 안 함 (세션 없음 시뮬)
  instanceB.registerHandler(async (cmd) => {
    return { correlationId: cmd.correlationId, ok: false, error: 'no session here' };
  });

  // Subscribe 반영 대기
  await new Promise((r) => setTimeout(r, 200));

  // 1) B → A로 커맨드 전달 → A가 처리 → B에 응답
  console.log('[Test 1] 크로스 인스턴스 커맨드 전달');
  const t1 = Date.now();
  const resp1 = await instanceB.forward({
    type: 'submit_answer',
    roomId: 'room-1',
    userId: 'user-1',
    payload: { answer: '42' },
  });
  const latency1 = Date.now() - t1;
  assert(resp1.ok === true, `응답 ok=true`, `(got ${JSON.stringify(resp1)})`);
  assert(resp1.data?.processedBy === 'instance-A', `instance-A가 처리함`);
  assert(latency1 < 1000, `지연 1초 미만 (실제: ${latency1}ms)`);

  // 2) correlationId가 정확히 매칭되는가 (여러 요청 병렬)
  console.log('\n[Test 2] correlationId 매칭 (병렬 5개)');
  const parallel = await Promise.all([
    instanceB.forward({ type: 'submit_answer', roomId: 'r1', userId: 'u1', payload: { answer: 'a' } }),
    instanceB.forward({ type: 'submit_answer', roomId: 'r2', userId: 'u2', payload: { answer: 'b' } }),
    instanceB.forward({ type: 'submit_answer', roomId: 'r3', userId: 'u3', payload: { answer: 'c' } }),
    instanceB.forward({ type: 'submit_answer', roomId: 'r4', userId: 'u4', payload: { answer: 'd' } }),
    instanceB.forward({ type: 'submit_answer', roomId: 'r5', userId: 'u5', payload: { answer: 'e' } }),
  ]);
  assert(parallel.every((r) => r.ok), `5개 모두 성공`);
  const uniqueIds = new Set(parallel.map((r) => r.correlationId));
  assert(uniqueIds.size === 5, `correlationId 5개 모두 고유`, `(got ${uniqueIds.size})`);

  // 3) 자기 자신에게 보낸 커맨드는 처리하지 않음
  console.log('\n[Test 3] Self-loop 방지');
  const resp3 = await instanceA.forward({
    type: 'submit_answer',
    roomId: 'r',
    userId: 'u',
    payload: { answer: 'x' },
  }, 500);
  // A가 publish하면 A, B 모두 구독 중. A는 자기 커맨드 무시. B는 'no session' 응답.
  // → A는 B의 응답(ok: false)을 받음
  assert(resp3.ok === false && resp3.error === 'no session here',
    `자기 자신은 무시, B가 no-session으로 응답`,
    `(got ${JSON.stringify(resp3)})`);

  // 4) 타임아웃 (응답 가능한 인스턴스 없는 type)
  console.log('\n[Test 4] 타임아웃 처리');
  const t4 = Date.now();
  // 핸들러 제거 → 아무도 응답 안 함
  instanceA.handler = null;
  instanceB.handler = null;
  const resp4 = await instanceB.forward({
    type: 'submit_answer',
    roomId: 'r',
    userId: 'u',
    payload: { answer: 'x' },
  }, 500);
  const timeoutDuration = Date.now() - t4;
  assert(resp4.ok === false && resp4.error === 'timeout',
    `500ms 후 타임아웃`,
    `(got ${JSON.stringify(resp4)}, duration=${timeoutDuration}ms)`);
  assert(timeoutDuration >= 500 && timeoutDuration < 700,
    `타임아웃 시간 정확 (500~700ms 사이)`,
    `(실제: ${timeoutDuration}ms)`);

  await instanceA.stop();
  await instanceB.stop();

  console.log(`\n=== 결과: ${passed} passed, ${failed} failed ===`);
  process.exit(failed === 0 ? 0 : 1);
}

runTests().catch((err) => {
  console.error('테스트 실패:', err);
  process.exit(1);
});
