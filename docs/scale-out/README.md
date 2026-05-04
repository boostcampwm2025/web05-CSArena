# CSArena 수평 확장(Scale-out) 엔지니어링

## 요약

CSArena 게임 서버를 단일 ECS Fargate 태스크에서 **다중 인스턴스 수평 확장** 구조로 설계하고, Fargate 3개 환경(0.5/1/2 vCPU) × 4단계 부하 = **12회 측정**으로 실제 한계를 정량화했다.

| 환경 | 한계 룸 수 | 비고 |
|------|-----------|------|
| Fargate 0.5 vCPU / 1 GB | **100 룸** | 현재 production 스펙 |
| Fargate 1 vCPU / 2 GB | **500 룸+** | ELU 0.76 — 여유 있음 |

---

## 핵심 엔지니어링 과제

### 문제: "stateful WebSocket을 stateless하게 확장"

게임 서버는 본질적으로 stateful하다.
- 게임 세션(현재 라운드, 제출 답안, 타이머 상태)이 메모리에 존재
- 두 플레이어의 WebSocket 연결이 **서로 다른 인스턴스**에 맺어질 수 있음
- Redis와 ALB만 있고 EKS/사이드카/서비스메시는 없는 환경

### 해결: 4가지 분산 패턴 동시 적용

---

## 1. Socket.IO Redis Adapter — 크로스 인스턴스 브로드캐스트

**문제**: `server.to(roomId).emit()`이 로컬 인스턴스의 소켓에만 전달됨.

**해결**: `@socket.io/redis-adapter` + Redis Pub/Sub.

```
Instance 1  ──emit('round:start')──►  Redis socket.io#{roomId}  ──►  Instance 2
                                                                        └─► Player B
```

**구현 포인트**: `@socket.io/redis-adapter`는 내부적으로 `node-redis` API를 요구한다. 프로젝트 나머지 코드가 `ioredis`를 쓰더라도 어댑터 전용 연결은 반드시 `node-redis`로 분리해야 한다.

**ALB sticky session 불필요**: 클라이언트가 `transports: ['websocket']`만 사용하므로 long-polling 세션 쿠키가 없다. WebSocket 연결 이후에는 same-instance 보장이 되고, 이벤트 전달은 Redis Adapter가 담당한다.

---

## 2. GameCommandBus — Correlation ID 기반 분산 RPC

**문제**: 게임 세션이 Instance 1에 있는데, Player B의 `submit:answer`가 Instance 2를 통해 도착. Instance 2는 세션을 찾지 못함.

**해결**: Redis Pub/Sub 기반 요청-응답 패턴.

```
Player B → Instance 2
  ↓ sessionManager.getUserIdBySocketId() → null
  ↓ commandBus.forward(submit_answer, correlationId, sourceInstance=2)
  ↓ Redis PUBLISH game:commands
Instance 1 수신 → handleRemoteCommand() → processSubmitAnswer()
  ↓ Redis PUBLISH game:responses:{instance2}
Instance 2 → Promise resolve → Player B에게 ack
```

**설계 포인트**:
- 자기 자신이 보낸 커맨드는 `sourceInstance` 비교로 무시 (self-loop 방지)
- 3초 timeout으로 무응답 보호
- 포워딩 횟수(`game_command_forwards_total`)와 지연(`game_command_forward_latency_seconds`)을 Prometheus로 측정

---

## 3. Redis Lua 원자 스크립트 — 분산 매칭

**문제**: 두 인스턴스가 동시에 매칭 큐를 조회하면 같은 플레이어를 두 번 매칭시킬 수 있음 (race condition).

**해결**: Redis Lua 스크립트. Lua는 Redis 서버에서 단일 스레드로 원자 실행되므로 `ZRANGEBYSCORE` → `ZREM` 사이에 다른 요청이 끼어들 수 없다.

```lua
-- addAndMatchScript
local candidates = redis.call('ZRANGEBYSCORE', queueKey, minElo, maxElo, 'WITHSCORES')
-- 최적 상대 탐색 (ELO 차이 최소 + 대기 시간 기반 허용 범위)
if bestMatch then
  redis.call('ZREM', queueKey, bestMatch)   -- 원자적 제거
  redis.call('DEL', PLAYER_DATA_PREFIX .. bestMatch)
  return {bestMatch, bestMatchQueuedAt}     -- queuedAt 반환 (대기 시간 메트릭용)
end
```

**ELO 동적 범위**: 대기 시간에 따라 매칭 허용 ELO 격차를 동적으로 확장 (10초 미만 ±100 → 30초 이상 ±500). Lua 스크립트 내에서 직접 계산하여 별도 락 없이 원자적으로 처리.

**Stale 항목 자동 정리**: ZSET 멤버는 TTL이 없지만 플레이어 메타데이터에 300초 TTL 설정. Lua 내에서 메타데이터 유무를 확인해 stale 멤버를 자동으로 제거.

---

## 4. BullMQ — Redis 기반 분산 잡 처리

`RoundTimerWorker`, `MatchPersistenceWorker` 모두 BullMQ Redis 락으로 보호된다. 여러 인스턴스에서 워커가 동시에 동작해도 각 잡은 정확히 하나의 워커만 처리한다.

---

## 측정 결과 — ELU가 1차 병목

| 지표 | 1 vCPU·200룸 | 0.5 vCPU·100룸 (한계) |
|------|-------------|---------------------|
| ELU p95 | 0.763 | **0.896** |
| submit_ack p95 | 31ms | 97ms |
| match→round_start p95 | 4.75s | 5.66s |

**원인**: `RoundTimer.startGlobalTick()`이 매초 활성 룸 전체를 순회하며 `round:tick`을 emit. 룸 수에 정비례하는 단일 스레드 작업이 이벤트 루프를 점유.

```
활성 룸 100개 → 매초 100회 emit fan-out → ELU 높음
활성 룸 200개 → 매초 200회 emit fan-out → ELU 더 높음
```

**로컬 vs Fargate 5배 차이**: 같은 "1 코어" 제약에서 로컬 Docker(macOS 가상화 overhead)는 100룸, Fargate Nitro(직접 hyperthread 매핑)는 500룸+.

---

## Auto Scaling 설계

- **임계값**: CPU avg 60% (측정 데이터: 1 vCPU·200룸에서 CPU 60% ≈ ELU 0.76)
- **ScaleOutCooldown 60s**: ECS 기동 3~5분 → 알람 평가는 빠를수록 좋음
- **ScaleInCooldown 300s**: 게임 최대 길이 5분 동안 세션 보호
- **max-capacity 4**: Redis/PG 단일 EC2 연결 수 한계 고려

---

## 알려진 한계

**GameSessionManager가 인스턴스 메모리에 있음**:
- 비정상 태스크 종료 시 진행 중 세션 유실
- 정상 scale-in(draining 300s) 중에는 자연 종료되므로 실용적 문제 없음
- 5분마다 idle sweeper가 30분 이상 비활성 세션 자동 정리 (`game_session_leak_recovered_total`)

**Prometheus가 인스턴스별 메트릭을 구분 못함**:
- ALB를 통해 스크래핑하므로 모든 인스턴스 메트릭이 합산됨
- 인스턴스별 분리는 ECS task metadata 기반 직접 스크래핑 필요 (미구현)

---

## 문서 목차

| 문서 | 내용 |
|------|------|
| [01-architecture.md](01-architecture.md) | 다중 인스턴스 아키텍처 상세 (코드 인용 포함) |
| [02-autoscaling-setup.md](02-autoscaling-setup.md) | Auto Scaling 구성 명령 및 파라미터 근거 |
| [03-correctness-analysis.md](03-correctness-analysis.md) | 정합성 검증 항목별 코드 근거 및 실행 방법 |
| [04-timing-and-scalein.md](04-timing-and-scalein.md) | Scale-out 타이밍 측정 및 Scale-in 안전성 검증 |
| [../performance/13-fargate-load-limit.md](../performance/13-fargate-load-limit.md) | Fargate 부하 한계 측정 결과 (12회 측정 데이터) |
| [../scale-out-test-plan.md](../scale-out-test-plan.md) | 전체 테스트 계획 (Phase 0~5) |
