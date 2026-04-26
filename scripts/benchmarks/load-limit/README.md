# 부하 한계 측정 (load-limit)

CSArena 백엔드의 동시 활성 룸 한계를 단계적으로 탐색하는 측정 셋업.

## 한계 정의 (사전 못박기)

다음 중 하나라도 도달 시 "한계 도달"로 판정:

1. `process_event_loop_utilization` > 0.85 (지속)
2. backend 컨테이너 CPU% > 90 (지속)
3. backend 컨테이너 mem usage > 90% of limit (지속)
4. 컨테이너 OOM (kernel log)
5. k6 `match_to_round_start_duration` p99 > 200ms

## 측정 매트릭스

| 환경 | compose 파일 | 비고 |
|---|---|---|
| 호스트 무제한 | `docker-compose.unlimited.yml` | "무제한 환경" 표기 금지 — "호스트(예: M1 Pro 16GB) 자원 제한 없음" |
| cpus:1 mem:1g | `docker-compose.cpus1.yml` | AWS 인스턴스 동치 주장 금지 |
| cpus:2 mem:2g | `docker-compose.cpus2.yml` | 같은 부하로 한계가 어떻게 이동하는지 비교 |

각 환경 × 룸 수 단계(50, 100, 200, 500) = 총 12회 측정.

## 시뮬레이션 범위 (옵션 ① — 단일 라운드)

```
connect → CONNECT(/ws,token) → connect:completed → match:enqueue
  → match:found → round:ready → round:start → submit:answer
  → round:result → close
```

한 게임 활성 시간 ≈ 15~16s. `vus = 2 × ROOMS`로 정상상태 ~ROOMS개 룸 유지.

Clova 채점은 `BENCH_GRADING_BYPASS=true`로 우회 (각 환경 compose가 자동 주입).

## 실행 절차

### 0. 사전 준비

ROOMS=500 측정은 **1000명 시드 + tokens.json 1000개**가 필수. 11번 측정의 50명 시드와는 별도 SQL 사용.

```bash
# 1000명 시드 (load-limit 전용)
docker exec -i web05-postgres-multi psql -U postgres -d boostcamp \
  < scripts/benchmarks/load-limit/seed-bench-users-1000.sql

# JWT 발급 — sign-bench-tokens.mjs 가 dev-benchuser% 동적 조회라 코드 변경 없이
# 그대로 1000개 entry tokens.json을 생성한다
cd scripts/benchmarks
JWT_SECRET=local-dev-jwt-secret-key-min-32-chars \
  node websocket-multi-instance/sign-bench-tokens.mjs

# 확인 — tokens.json 길이가 1000인지
jq 'length' websocket-multi-instance/tokens.json
```

### 1. 환경 기동 (예: cpus:1)

```bash
docker compose \
  -f docker-compose-multi.yml \
  -f scripts/benchmarks/websocket-multi-instance/docker-compose-multi.override.yml \
  -f scripts/benchmarks/load-limit/docker-compose.cpus1.yml \
  up -d --build
```

### 2. 사이드카 수집기 백그라운드

```bash
cd scripts/benchmarks/load-limit
./collect-bench.sh > results/cpus1-rooms200-metrics.csv 2> results/cpus1-rooms200-collect.err &
COLLECT_PID=$!
```

### 3. k6 부하

```bash
k6 run -e ROOMS=200 -e DURATION=2m \
  --summary-export=results/cpus1-rooms200-k6.json \
  load-test-rooms.js
```

### 4. 수집기 종료 + 분석

```bash
kill $COLLECT_PID
./analyze-bench.sh results/cpus1-rooms200-metrics.csv \
  > results/cpus1-rooms200-summary.txt
```

### 5. 환경 정리

```bash
docker compose \
  -f docker-compose-multi.yml \
  -f scripts/benchmarks/websocket-multi-instance/docker-compose-multi.override.yml \
  -f scripts/benchmarks/load-limit/docker-compose.cpus1.yml \
  down -v
```

다음 환경으로 넘어가서 1~5 반복.

## 결과 정리

각 측정의 `results/<env>-rooms<N>-summary.txt`를 모아 `docs/performance/12-load-limit-exploration.md` 표에 채워 넣는다.

## 표기 규칙 (금지/허용)

| 금지 | 허용 |
|---|---|
| "t3.micro 모사" | "cpus:1 mem:1g 제약 환경" |
| "1000 룸 안정 운영" | "M1 Pro 16GB · 단일 노드 / cpus:1 환경에서 200 룸까지 P99 < 150ms" |
| "무제한 환경 = 알고리즘 한계" | "호스트(M1 Pro 16GB) 자원 제한 없음 — 호스트가 사실상 캡" |
| "프로덕션 부하" | "k6 합성 부하 (단일 라운드 시뮬레이션)" |

## 비스코프

- 클라우드 환경 측정 (별도 작업)
- 답안 제출 빈도 한계 측정 (2차 측정 후보)
- ADR 신규 작성 (결과가 새 결정을 유도하면 그때)
