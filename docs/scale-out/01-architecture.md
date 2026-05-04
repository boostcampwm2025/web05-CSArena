# 다중 인스턴스 아키텍처

## 개요

CSArena 게임 서버는 **단일 NestJS 프로세스**를 여러 ECS Fargate 태스크에 수평 확장(horizontal scale-out)하는 구조다. HTTP 요청과 WebSocket 연결이 ALB를 통해 round-robin으로 분배된다.

```
클라이언트
   │
   ▼
AWS ALB (round-robin, no sticky)
   ├──► ECS Task 1 (NestJS)
   ├──► ECS Task 2 (NestJS)
   └──► ECS Task N (NestJS)
          │
          └──► Redis (EC2, shared)
          └──► PostgreSQL (EC2, shared)
```

**핵심 제약**: Node.js는 단일 스레드 이벤트 루프를 사용한다. 따라서 수평 확장이 필수이며, 인스턴스 간 상태 공유는 Redis를 통해 해결한다.

---

## 컴포넌트별 다중 인스턴스 동작

### 1. Socket.IO — Redis Adapter로 크로스 인스턴스 브로드캐스트

**문제**: 게임 룸의 두 플레이어가 서로 다른 인스턴스에 연결되면, 한 인스턴스에서 `server.to(roomId).emit()`을 호출해도 다른 인스턴스의 클라이언트에게 전달되지 않는다.

**해결**: `@socket.io/redis-adapter`를 사용해 Redis Pub/Sub를 경유한다.

```
Instance 1 (Player A)         Instance 2 (Player B)
       │                              │
  emit('round:start')                 │
       │                              │
       ▼                              │
  Redis Pub/Sub ──────────────────────►
  (socket.io# 채널)                   │
                                      ▼
                               Player B에게 전달
```

```typescript
// src/common/redis-io-adapter.ts
export class RedisIoAdapter extends IoAdapter {
  async connectToRedis(): Promise<void> {
    const pubClient = createClient({ socket: { host, port } });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;
    server.adapter(this.adapterConstructor);  // 어댑터 장착
    return server;
  }
}
```

> **주의**: `@socket.io/redis-adapter`는 내부적으로 `node-redis` API를 사용한다. `ioredis`로 연결하면 subscribe 채널이 Redis에 생성되지 않아 크로스 인스턴스 이벤트 전달이 무음 실패한다.

**왜 sticky session이 필요 없는가**: 클라이언트가 `transports: ['websocket']`만 사용하므로 long-polling 기반 세션 쿠키가 필요 없다. 최초 WebSocket 업그레이드 이후 연결이 유지되므로 ALB에서 sticky 설정 없이 수평 확장이 가능하다.

---

### 2. GameCommandBus — Redis Pub/Sub 기반 크로스 인스턴스 RPC

**문제**: `GameSessionManager`는 인스턴스 로컬 메모리에 게임 세션을 저장한다. Player A의 세션이 Instance 1에 있을 때, Player B가 Instance 2를 통해 `submit:answer`를 보내면 Instance 2는 세션을 찾지 못한다.

**해결**: Redis Pub/Sub 기반 요청-응답 패턴(correlation ID RPC)으로 올바른 인스턴스로 커맨드를 라우팅한다.

```
Player B → Instance 2
           │
           │ 세션 없음 → forward()
           │
           ▼
    Redis PUBLISH game:commands
           │
           ▼
    Instance 1 (세션 있음)
    handleIncomingCommand()
           │
           ▼
    Redis PUBLISH game:responses:{instance2_id}
           │
           ▼
    Instance 2 Promise resolve
           │
           ▼
    Player B에게 ack 반환
```

```typescript
// 커맨드 전달 (Instance 2 측)
async forward(command, timeoutMs = 3000): Promise<GameCommandResponse> {
  const correlationId = randomUUID();
  // ...
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      this.pendingResponses.delete(correlationId);
      resolve({ correlationId, ok: false, error: `Command timeout after ${timeoutMs}ms` });
    }, timeoutMs);
    this.pendingResponses.set(correlationId, { resolve, timeout });
    this.redis.publish(COMMAND_CHANNEL_PREFIX, JSON.stringify({ ...command, correlationId, sourceInstance: this.instanceId }));
  });
}

// 커맨드 수신 (Instance 1 측) — 자기 자신이 보낸 커맨드는 무시
private async handleIncomingCommand(message: string): Promise<void> {
  const command = JSON.parse(message);
  if (command.sourceInstance === this.instanceId) return; // self-loop 방지
  const response = await this.commandHandler(command);
  await this.redis.publish(`${RESPONSE_CHANNEL_PREFIX}:${command.sourceInstance}`, JSON.stringify(response));
}
```

**측정**: `game_command_forwards_total` 카운터와 `game_command_forward_latency_seconds` 히스토그램으로 포워딩 빈도와 지연을 모니터링한다.

---

### 3. RedisMatchQueue — Lua 원자 스크립트로 분산 매칭

**문제**: 여러 인스턴스가 동시에 매칭 큐를 조회하면 두 인스턴스가 같은 플레이어를 동시에 매칭시킬 수 있다.

**해결**: Redis Lua 스크립트를 사용한다. Lua 스크립트는 Redis 서버에서 단일 스레드로 원자적으로 실행되므로, 여러 인스턴스가 동시에 호출해도 `ZRANGEBYSCORE` → `ZREM` 시퀀스에 race condition이 발생하지 않는다.

```lua
-- addAndMatchScript (핵심 부분)
local candidates = redis.call('ZRANGEBYSCORE', queueKey, minElo, maxElo, 'WITHSCORES')

-- 최적 상대 탐색 (ELO 차이 최소 + 대기 시간 기반 허용 범위)
if bestMatch then
  local bestMatchQueuedAt = redis.call('GET', PLAYER_DATA_PREFIX .. bestMatch)
  redis.call('ZREM', queueKey, bestMatch)   -- 상대를 큐에서 원자적 제거
  redis.call('DEL', PLAYER_DATA_PREFIX .. bestMatch)
  return {bestMatch, bestMatchQueuedAt or '0'}  -- queuedAt 반환 (대기 시간 메트릭용)
end
```

**ELO 범위 동적 확장**: 대기 시간이 길수록 허용 ELO 격차를 넓혀 매칭 성공률을 높인다.

| 대기 시간 | ELO 허용 범위 |
|----------|-------------|
| 0 ~ 10초 | ±100 |
| 10 ~ 30초 | ±200 |
| 30초 이상 | ±500 |

**Stale 항목 처리**: `ZSET` 멤버는 자동 만료되지 않지만 플레이어 메타데이터(key: `matchmaking:player:{userId}`)에는 300초 TTL이 걸린다. Lua 스크립트 내에서 메타데이터 존재 여부를 확인하여 stale 멤버를 자동으로 정리한다.

---

### 4. BullMQ — Redis 기반 분산 잡 처리

`RoundTimerWorker`와 `MatchPersistenceWorker`는 BullMQ를 통해 실행된다. BullMQ는 내부적으로 Redis 기반 잠금(SETNX)을 사용하므로, 여러 인스턴스에 워커가 동시에 동작해도 각 잡은 정확히 하나의 워커만 처리한다.

```
Instance 1: RoundTimerWorker ─┐
                              │ Redis BullMQ lock → 한 워커만 처리
Instance 2: RoundTimerWorker ─┘
```

---

### 5. GameSessionManager — 인스턴스 로컬 (알려진 한계)

```typescript
// 인스턴스 메모리에만 존재
private gameSessions = new Map<string, GameSession>();
```

게임 세션은 Redis가 아닌 인스턴스 메모리에 저장된다. 이것이 다중 인스턴스 환경에서 `GameCommandBus`가 필요한 근본 이유다.

**알려진 한계**: 세션을 소유한 인스턴스가 예기치 않게 종료되면 진행 중인 게임 세션이 유실된다. ECS graceful shutdown(SIGTERM → draining 300s) 동안 새 연결이 들어오지 않으므로 정상 scale-in에서는 발생하지 않는다. 단, 비정상 종료(OOM, task health check 실패)의 경우 세션이 유실될 수 있다.

**완화**: `GameSessionManager`에 5분마다 실행되는 idle sweeper가 있어 30분 이상 비활성 세션을 자동 정리한다. `game_session_leak_recovered_total` 메트릭으로 모니터링한다.

---

## 데이터 흐름 — 다중 인스턴스 게임 1판

```
T=0   Player A (→ Instance 1) match:enqueue
T=0   Player B (→ Instance 2) match:enqueue

         [Redis Lua addAndMatchScript — 원자적]
         Player B enqueue → bestMatch = Player A → ZREM(A)
         반환: {Player A, A의 queuedAt}

T=1   Instance 2: match:found 발행 (Redis Adapter)
      → Instance 1의 Player A에게도 전달

T=2   Instance 1: round:start 발행 (Redis Adapter)
      → Instance 2의 Player B에게도 전달

T=3   Player B submit:answer → Instance 2
      Instance 2: 세션 없음 (세션은 Instance 1 소유)

         [GameCommandBus.forward()]
         Redis PUBLISH game:commands
         Instance 1: handleIncomingCommand()
         Instance 1: processSubmitAnswer()
         Redis PUBLISH game:responses:{instance2_id}

T=4   Instance 2: Promise resolve → Player B에게 ack

T=5   Instance 1: opponent:submitted 발행 (Redis Adapter)
      → Instance 2의 Player B에게도 전달
```

---

## ALB 구성 — sticky session 불필요

| 항목 | 설정 | 근거 |
|------|------|------|
| Stickiness | OFF | WebSocket 연결 유지 중에는 same-instance 보장됨; Redis Adapter가 크로스 인스턴스 이벤트를 담당 |
| Load balancing | round-robin | 트래픽 고른 분산 |
| Idle timeout | 3600s | WebSocket 장시간 연결 지원 |
| Protocol | HTTP/1.1 (WebSocket upgrade) | HTTP/2는 WebSocket 미지원 |

---

## 메트릭 — 다중 인스턴스 모니터링

| 메트릭 | 타입 | 의미 |
|--------|------|------|
| `game_command_forwards_total` | Counter | 크로스 인스턴스 포워딩 횟수. 인스턴스 수 증가 시 비례 증가 |
| `game_command_forward_latency_seconds` | Histogram | 포워딩 지연 (Redis RTT + 처리). p95 < 50ms 목표 |
| `websocket_connections_active` | Gauge | 인스턴스별 활성 WebSocket 연결 수 |
| `games_active_total` | Gauge | 인스턴스별 진행 중 게임 수 |
| `process_event_loop_utilization` | Gauge | ELU. 0.85 초과 시 scale-out 트리거 수준 |
| `matchmaking_wait_duration_seconds` | Histogram | 매칭 대기 시간. 인스턴스 증가로 영향받지 않아야 함 |

> **현재 제약**: Prometheus가 ALB를 통해 스크래핑하므로 메트릭은 **모든 인스턴스의 합산값**이다. 인스턴스별 분리 메트릭은 ECS task metadata 기반 직접 스크래핑이 필요하다 (미구현).
