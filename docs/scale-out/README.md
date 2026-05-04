# CSArena 수평 확장(Scale-out) 엔지니어링

## 한 줄 요약

**"게임 세션이 메모리에 있는 stateful WebSocket 서버를 sticky session 없이 수평 확장"** —
Redis Pub/Sub 기반 4가지 분산 패턴으로 해결하고, ECS Fargate 실환경에서 정량 검증했다.

---

## 배경 — 왜 어려운가

CSArena 게임 서버는 본질적으로 stateful하다.

```
게임 세션 (라운드, 제출 답안, 타이머) → NestJS 인스턴스 메모리에 저장
두 플레이어의 WebSocket → ALB round-robin → 서로 다른 인스턴스
```

단순히 인스턴스를 늘리면 세 가지 문제가 즉시 발생한다:

| 문제 | 발생 시점 |
|------|----------|
| `server.to(roomId).emit()`이 로컬 소켓에만 전달됨 | round:start 이벤트 |
| Player B의 submit:answer가 세션 없는 인스턴스에 도착 | 답안 제출 |
| 두 인스턴스가 같은 플레이어를 동시에 매칭시킬 수 있음 | 매칭 진입 시 |

제약 조건: EKS·서비스 메시·사이드카 없음. Redis와 ALB만 존재.

---

## 해결 — 4가지 분산 패턴

### 1. Socket.IO Redis Adapter — 크로스 인스턴스 브로드캐스트

**문제**: Instance 1에서 `server.to(roomId).emit('round:start')`를 호출해도
Instance 2에 연결된 Player B는 수신 불가.

**해결**:

```
Instance 1  ─emit('round:start')─►  Redis socket.io#{roomId}  ──►  Instance 2
                                                                      └─► Player B
```

`@socket.io/redis-adapter`가 Redis Pub/Sub을 경유해 모든 인스턴스로 전달.

**구현 시 만난 함정**: `@socket.io/redis-adapter`는 내부적으로 `node-redis` API를 요구한다.
프로젝트 나머지 코드가 `ioredis`를 써도 어댑터 전용 연결만 `node-redis`로 분리해야 한다.
`ioredis`로 연결하면 subscribe 채널이 생성되지 않아 **무음 실패(silent failure)** 한다.

**왜 sticky session을 쓰지 않았는가**: 클라이언트가 `transports: ['websocket']`만 사용하므로
long-polling 기반 세션 쿠키가 필요 없다. WebSocket 연결이 유지되는 동안은 same-instance가
보장되고, 이벤트 전달은 Redis Adapter가 담당하므로 sticky session은 오히려 트래픽 분산을 방해한다.

---

### 2. GameCommandBus — Correlation ID 기반 분산 RPC

**문제**: 게임 세션이 Instance 1 메모리에 있는데, Player B의 `submit:answer`가
Instance 2를 통해 도착. Instance 2는 세션을 찾지 못한다.

**해결**: Redis Pub/Sub 기반 요청-응답 패턴(Correlation ID RPC).

```
Player B → Instance 2
  ↓ sessionManager.getUserIdBySocketId() → null (세션 없음)
  ↓ commandBus.forward(submit_answer, correlationId, sourceInstance=2)
  ↓ Redis PUBLISH game:commands
Instance 1 수신 → processSubmitAnswer()
  ↓ Redis PUBLISH game:responses:{instance2_id}
Instance 2 → Promise.resolve(response) → Player B에게 ack
```

설계 포인트:
- `sourceInstance` 비교로 자기 자신이 보낸 커맨드 무시 (self-loop 방지)
- 3초 timeout으로 무응답 보호
- `game_command_forwards_total` / `game_command_forward_latency_seconds` Prometheus 계측

**왜 Redis 세션 영속화(세션을 Redis에 저장) 대신 이 방식인가**:
세션을 Redis에 저장하면 매 게임 이벤트마다 직렬화/역직렬화 + Redis 왕복이 발생한다.
인메모리 접근에 비해 수십 ms 오버헤드가 누적되고, 세션 구조 변경 시 마이그레이션 비용이 크다.
GameCommandBus는 라우팅을 Redis가 담당하되 처리는 세션 소유 인스턴스의 메모리에서 수행하므로,
cross-instance 경우에만 추가 Redis RTT가 발생한다.

---

### 3. Redis Lua 원자 스크립트 — 분산 매칭 Race Condition 방지

**문제**: 두 인스턴스가 동시에 매칭 큐를 조회하면 같은 플레이어가 두 게임에 동시 배치될 수 있다.

**해결**: `ZRANGEBYSCORE` → `ZREM`을 Lua 스크립트 단일 실행 컨텍스트에서 원자 처리.

```lua
local candidates = redis.call('ZRANGEBYSCORE', queueKey, minElo, maxElo, 'WITHSCORES')
-- 최적 상대 탐색 (ELO 차이 최소 + 대기 시간 기반 허용 범위)
if bestMatch then
  redis.call('ZREM', queueKey, bestMatch)   -- 원자적 제거: 이 사이에 다른 Lua가 끼어들 수 없음
  redis.call('DEL', PLAYER_DATA_PREFIX .. bestMatch)
  return {bestMatch, bestMatchQueuedAt}
end
```

100명 동시 진입 부하 테스트에서 actual_pairs = 49 (중복 매칭 0건) 확인.
중복 매칭이 발생하면 actual_pairs > 50이 되어야 하므로 Lua 원자성이 실환경에서 검증된 셈이다.

**추가 설계**:
- ELO 동적 범위: 대기 10초 미만 ±100 → 30초 이상 ±500 (Lua 내에서 계산, 별도 락 불필요)
- Stale 항목 자동 정리: 플레이어 메타데이터 TTL 300초. Lua 내에서 메타데이터 유무 확인 후 stale 멤버 자동 제거

---

### 4. BullMQ Redis 락 — 분산 잡 처리

`RoundTimerWorker`와 `MatchPersistenceWorker`가 여러 인스턴스에서 동시에 동작해도,
BullMQ 내부 Redis `SETNX` 기반 락으로 각 잡은 정확히 하나의 워커만 처리한다.

실환경 검증: CloudWatch에서 RoundTimerWorker 이벤트 14,851건 분석 시
동일 room+이벤트타입이 5회(라운드 수 한계)를 초과한 경우 0건.

---

## 측정 결과

### 단일 인스턴스 한계 (Fargate, 12회 측정)

| 환경 | 한계 룸 수 | ELU p95 | submit_ack p95 |
|------|-----------|---------|---------------|
| **0.5 vCPU / 1 GB (현재 production)** | **100 룸** | 0.896 | 97ms |
| 1 vCPU / 2 GB | 500 룸+ 미도달 | 0.756 | 31ms |
| 2 vCPU / 4 GB | 사실상 idle | 0.260 | — |

**1차 병목**: `RoundTimer.startGlobalTick()`이 매초 활성 룸 전체에 `round:tick`을 fan-out.
룸 수에 정비례하는 단일 스레드 작업이 이벤트 루프를 점유.

**로컬 Docker vs Fargate Nitro 5배 차이**: 같은 "1 코어" 제약에서 로컬 100 룸, Fargate 500 룸+.
macOS 스케줄러 + Docker Desktop 가상화 overhead vs Nitro hypervisor의 직접 hyperthread 매핑 차이.

### 다중 인스턴스 검증 결과 (Fargate 1 vCPU, desired-count 2, 2026-05-05)

| 검증 항목 | 결과 | 판정 |
|----------|------|------|
| 크로스 인스턴스 매칭 성공률 | **100%** | ✓ |
| 크로스 인스턴스 이벤트 수신률 (round:start) | **100%** | ✓ |
| GameCommandBus 포워딩 발생 | **4회** (2-인스턴스 환경) | ✓ |
| BullMQ 잡 중복 처리 | **0건** | ✓ |
| Race condition (100명 동시 매칭) | **actual_pairs=49**, 중복 0 | ✓ |

### Scale-out 타이밍 (ECS Fargate, 2026-05-05)

| 구간 | 소요 시간 |
|------|----------|
| desiredCount 변경 → 태스크 PENDING | 20초 |
| PENDING → RUNNING | 40초 |
| RUNNING → ALB HEALTHY | 30초 |
| **트래픽 수신까지 총** | **90초** |
| CloudWatch 알람 포함 시 (자동 scale-out) | **~3.5분** |

**Auto Scaling 임계값 설계**: CPU avg 60% = ELU ≈ 0.76 (1 vCPU · 200 룸 측정 데이터).
ELU 한계(0.85) 전에 scale-out을 개시하도록 설정.

### Scale-in 안전성 (2026-05-05)

ROOMS=5 게임 진행 중 desiredCount 2→1 강제 감소:
- **56 게임 완료, error_rate = 0**
- ALB deregistration_delay 300초 설정 확인 — 5라운드 게임(최대 5분) 자연 완료 가능

---

## Trade-off와 선택 근거

### in-memory 세션 vs Redis 세션 영속화

| | in-memory (현재) | Redis 영속화 |
|-|-----------------|------------|
| 성능 | 메모리 직접 접근 | 직렬화 + Redis RTT 추가 |
| 비정상 종료 복구 | 세션 유실 | 복구 가능 |
| 구현 복잡도 | 낮음 (GameCommandBus로 보완) | 높음 (스키마 버전 관리 필요) |
| 정상 scale-in | ALB draining 300s 내 자연 완료 | 해당 없음 |

→ **in-memory 선택**: 게임 특성상 세션 수명이 5분 이내. 정상 scale-in은 draining으로 보호.
비정상 종료(OOM) 시 세션 유실은 수용 가능한 리스크로 판단.

### sticky session vs Redis Adapter

| | sticky session | Redis Adapter (현재) |
|-|---------------|-------------------|
| ALB 설정 | 필요 | 불필요 |
| 트래픽 분산 | 특정 인스턴스 집중 가능 | round-robin 고른 분산 |
| 재연결 시 | 같은 인스턴스로 유도 | 다른 인스턴스 가능 (세션 유실) |
| WebSocket only | sticky 불필요 | 적합 |

→ **Redis Adapter 선택**: 클라이언트가 `transports: ['websocket']`만 사용하므로 long-polling 세션이 없음.
WebSocket 연결 유지 중에는 same-instance가 이미 보장되어 sticky session이 오히려 불필요한 제약.

### Prometheus 인스턴스별 스크래핑 미구현

ALB를 통한 스크래핑으로 다중 인스턴스 메트릭이 합산된다. ECS task metadata 기반 직접 스크래핑으로
인스턴스별 분리가 가능하지만 구현하지 않았다.

→ **판단**: 현재 max-capacity 4 환경에서 합산 메트릭으로도 병목 탐지(ELU 추이, forward rate)는 충분하다.
인스턴스별 분리 필요성은 실제 다중 인스턴스 운영 데이터가 쌓인 후 재평가한다.

---

## 배운 점

### 1. 부하 테스트 환경이 측정값을 결정한다

`BENCH_GRADING_BYPASS=true` 환경에서 200 룸 기준 CPU 20% (ELU 0.12).
실 운영 동일 조건에서는 CPU 60% (ELU 0.76). 3배 차이의 원인은 Clova 그레이딩 API 호출.

**교훈**: 부하 테스트는 "무엇을 우회했는가"를 명시해야 한다. bypass 조건의 측정값은 다른 시스템과 비교하거나
Auto Scaling 임계값 캘리브레이션에 그대로 사용할 수 없다.

### 2. 로컬 벤치마크는 절대값이 아니라 추세만 신뢰한다

로컬 Docker(macOS) vs Fargate Nitro에서 같은 코드, 같은 "1 코어" 제약에서 5배 차이.
로컬에서 잡은 한계가 클라우드 배포 후 완전히 달라질 수 있다.
한계 측정은 반드시 실제 배포 환경(Fargate)에서 수행해야 의미가 있다.

### 3. silent failure는 로그에 남지 않는다

`ioredis`로 Redis Adapter를 연결하면 에러가 발생하지 않는다. 단순히 크로스 인스턴스 이벤트가
전달되지 않을 뿐이다. 스테이징 단계에서 단일 인스턴스만 테스트하면 발견할 수 없다.
**다중 인스턴스 시나리오를 별도 단계로 검증하는 테스트 계획이 필수**임을 확인했다.

### 4. ECS Draining + ALB deregistration_delay의 현실적 동작

deregistration_delay 300초가 설정되어 있어도, 드레이닝 대상 인스턴스에 활성 연결이 없으면
NestJS graceful shutdown이 즉시 완료되어 태스크가 조기 종료된다.
"300초 보호"는 연결이 있을 때만 동작하고, 연결이 없으면 의도대로 빠르게 종료된다.
이는 버그가 아니라 올바른 동작이지만, scale-in 테스트 설계 시 고려해야 한다.

---

## 알려진 한계

**GameSessionManager 비정상 종료 시 세션 유실**
- ECS OOM kill, task health check 실패 등 비정상 종료에서 발생
- 정상 scale-in(draining)에서는 발생하지 않음 (실측 확인)
- 완화: idle sweeper가 5분마다 30분 비활성 세션 자동 정리 (`game_session_leak_recovered_total`)

**Prometheus 인스턴스별 메트릭 합산**
- ALB 경유 스크래핑으로 다중 인스턴스 값이 합산됨
- 인스턴스별 분리: ECS task metadata 기반 직접 스크래핑 필요 (미구현, 현재 운영 규모에서는 합산 메트릭으로 충분)

**max-capacity 4 제약**
- Redis/PostgreSQL이 EC2 단일 노드. 태스크당 ~10 Redis 연결 × 4 = 40개 상한
- 이 이상 확장 시 Redis 클러스터 또는 ElastiCache 전환 필요

---

## 문서 목차

| 문서 | 내용 |
|------|------|
| [01-architecture.md](01-architecture.md) | 코드 인용 포함 아키텍처 상세 |
| [02-autoscaling-setup.md](02-autoscaling-setup.md) | Auto Scaling 구성 명령 및 파라미터 근거 |
| [03-correctness-analysis.md](03-correctness-analysis.md) | Phase 4 정합성 검증 — 코드 근거 + 실측 결과 |
| [04-timing-and-scalein.md](04-timing-and-scalein.md) | Phase 3 타이밍 + Phase 5 scale-in 실측 결과 |
| [../performance/13-fargate-load-limit.md](../performance/13-fargate-load-limit.md) | Fargate 12회 부하 한계 측정 전문 |
| [../scale-out-test-plan.md](../scale-out-test-plan.md) | 전체 테스트 계획 및 최종 결과 체크리스트 |
