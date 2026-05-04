# Scale-Out 테스트 스크립트

`docs/scale-out-test-plan.md` 의 실행 파트. 각 스크립트가 테스트 계획의 어느 Phase에 해당하는지 아래 표를 참고한다.

## 스크립트 목록

| 파일 | 대응 Phase | 목적 |
|------|-----------|------|
| `http-baseline.js` | Phase 1-1 | HTTP REST 한계 측정 (VU 1000까지 램프업) |
| `ws-connections.js` | Phase 1-2 | WebSocket 연결 한계 측정 (최대 500 연결) |
| `game-simulation.js` | Phase 1-3 | 전체 게임 플로우 시뮬레이션 |
| `matchmaking-verify.js` | Phase 4-1 | 크로스 인스턴스 매칭 정합성 검증 |
| `matchmaking-burst.js` | Phase 4-5 | 100명 동시 매칭 Race Condition 검증 |
| `sign-bench-tokens.mjs` | Phase 0 | 테스트용 JWT 토큰 일괄 생성 |

## 사전 준비

### 1. tokens.json 생성

k6 스크립트는 `../websocket-multi-instance/tokens.json` 에서 토큰을 읽는다.

```bash
cd scripts/benchmarks

# ECS 서버와 동일한 JWT_SECRET 사용
JWT_SECRET=<backend-jwt-secret> \
  node scale-out/sign-bench-tokens.mjs

# 생성된 파일을 공유 경로로 복사
cp scale-out/tokens.json websocket-multi-instance/tokens.json

jq 'length' websocket-multi-instance/tokens.json  # 100 이상이어야 함
```

> USER_IDS에 지정한 ID는 실제 ECS DB에 존재해야 한다.
> `seed-bench-users.sql` 로 선행 시드가 필요하다.

### 2. BENCH_GRADING_BYPASS 활성화 (WebSocket 스크립트)

WebSocket 게임 플로우 테스트는 반드시 bypass 모드가 필요하다.
자세한 절차는 `docs/scale-out-test-plan.md` Phase 0-2 참고.

### 3. ECS desired-count 설정

```bash
# Phase 1: 단일 인스턴스 (기본값, 변경 불필요)
# Phase 4: 다중 인스턴스 고정
aws ecs update-service --cluster csarena-cluster \
  --service csarena-backend --desired-count 2
AWS_MAX_ATTEMPTS=80 aws ecs wait services-stable \
  --cluster csarena-cluster --services csarena-backend
```

## 실행 예시

```bash
# Phase 1-1: HTTP 한계 (단일 인스턴스)
k6 run -e BASE_URL=http://csarena-alb-330901287.ap-northeast-2.elb.amazonaws.com \
       scripts/benchmarks/scale-out/http-baseline.js

# Phase 1-2: WebSocket 연결 한계
k6 run -e BASE_URL=ws://csarena-alb-330901287.ap-northeast-2.elb.amazonaws.com \
       -e MAX_VUS=300 \
       scripts/benchmarks/scale-out/ws-connections.js

# Phase 1-3: 게임 시뮬레이션
k6 run -e BASE_URL=ws://csarena-alb-330901287.ap-northeast-2.elb.amazonaws.com \
       -e ROOMS=30 \
       scripts/benchmarks/scale-out/game-simulation.js

# Phase 4-1: 크로스 인스턴스 매칭 검증 (desired-count 2 상태)
k6 run -e BASE_URL=ws://csarena-alb-330901287.ap-northeast-2.elb.amazonaws.com \
       -e CONCURRENT_GAMES=5 \
       scripts/benchmarks/scale-out/matchmaking-verify.js

# Phase 4-5: 100명 동시 매칭 Race Condition
k6 run -e BASE_URL=ws://csarena-alb-330901287.ap-northeast-2.elb.amazonaws.com \
       -e PLAYERS=100 \
       scripts/benchmarks/scale-out/matchmaking-burst.js
```

## 환경변수 요약

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `BASE_URL` | `ws://csarena-alb-330901287...` | ALB 엔드포인트 |
| `ROOMS` | `30` | game-simulation 동시 게임 수 |
| `MAX_VUS` | `500` | ws-connections 최대 연결 수 |
| `CONCURRENT_GAMES` | `5` | matchmaking-verify 동시 게임 수 |
| `PLAYERS` | `100` | matchmaking-burst 동시 입장 인원 수 |
| `DURATION` | 스크립트마다 다름 | 테스트 지속 시간 |

## 주의사항

- `matchmaking-burst.js` 실행 전후 Redis 매칭 큐가 비어있는지 확인한다.
  고립된 플레이어가 있으면 이후 테스트 결과에 영향을 준다.
- 테스트 완료 후 반드시 `BENCH_GRADING_BYPASS` 를 제거하고 재배포한다.
- Auto Scaling 정책이 활성화된 상태에서 Phase 1을 실행하면 측정 중에
  scale-out이 발생할 수 있다. Phase 1은 정책 등록 전에 실행한다.
