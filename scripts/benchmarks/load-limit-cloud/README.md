# 부하 한계 측정 — 클라우드 (load-limit-cloud)

CSArena 백엔드의 동시 활성 룸 한계를 **AWS ECS Fargate 환경**에서 측정.

12번(로컬 M3 Pro) 측정의 후속편. 같은 한계 정의 + 같은 시나리오로 환경만 바꿔, "Fargate vCPU별 동시 룸 한계 + 12번 결과 재현 여부"를 정량화한다.

## 한계 정의 (12번과 동일 — 사전 못박기)

| 기준 | 임계 | 데이터 출처 |
|---|---|---|
| 이벤트 루프 활용도 | `process_event_loop_utilization` > 0.85 (지속) | `/api/metrics` (1초 사이드카) |
| 컨테이너 CPU | CPUUtilization > 90% (지속) | CloudWatch (1분 사후 조회) |
| 컨테이너 메모리 | MemoryUtilization > 90% (지속) | CloudWatch (1분 사후 조회) |
| 컨테이너 OOM | task stop reason = `OutOfMemoryError` | CloudWatch Logs / `aws ecs describe-tasks` |
| `submit_ack_duration` p95 | > 200ms | k6 |

> CPU/메모리 1분 해상도는 한계 정의가 "지속" 임계라 자연스럽게 맞물림. ELU만 1초 granularity로 잡으면 한계 판정에 충분 (12번 결론: 1차 병목은 일관되게 ELU).

## 측정 매트릭스

| 환경 | family | cpu / memory | task definition |
|---|---|---|---|
| Fargate 0.5 vCPU | `csarena-backend-bench-512` | 512 / 1024 | `task-definitions/bench-512.json` |
| Fargate 1 vCPU | `csarena-backend-bench-1024` | 1024 / 2048 | `task-definitions/bench-1024.json` |
| Fargate 2 vCPU | `csarena-backend-bench-2048` | 2048 / 4096 | `task-definitions/bench-2048.json` |

각 환경 × 룸 수 단계(50, 100, 200, 500) = **총 12회 측정.**

## 시뮬레이션 시나리오

12번과 동일 (`scripts/benchmarks/load-limit/load-test-rooms.js` 그대로 재사용). `NGINX_URL` 환경변수로 endpoint만 교체.

```
connect → CONNECT(/ws,token) → connect:completed → match:enqueue
  → match:found → round:ready → round:start → submit:answer
  → round:result → close
```

채점은 `BENCH_GRADING_BYPASS=true`로 우회 (BENCH task definition에 자동 주입).

## 표기 규칙 (금지/허용 — 12번과 동일)

| 금지 | 허용 |
|---|---|
| "t3.micro 모사" | "Fargate 0.5 vCPU / 1 GB · ap-northeast-2" |
| "1000 룸 안정 운영" | "Fargate 1 vCPU 환경에서 N 룸까지 ELU < 0.85" |
| "프로덕션 부하" | "k6 합성 부하 (단일 라운드 시뮬레이션)" |

## 비스코프

- REST API 부하 한계 측정 (별도 측정 영역)
- 답안 제출 빈도 폭주 시나리오 (별도)
- ElastiCache·RDS 이관 후 측정 (출시 시점 별개 작업)

---

## 실행 절차

### 0. 사전 준비

**0-1. AWS 자격증명 확인**

```bash
export AWS_PROFILE=csarena-team   # 또는 본인 프로필
aws sts get-caller-identity --region ap-northeast-2
```

**0-2. 핵심 endpoint 조회**

```bash
# ALB DNS — 사이드카 수집기에서 사용
ALB_DNS=$(aws elbv2 describe-load-balancers --region ap-northeast-2 \
  --names csarena-alb \
  --query "LoadBalancers[0].DNSName" --output text)
echo "ALB_DNS: $ALB_DNS"

# CloudFront DNS — k6에서 사용 (production endpoint와 동일)
CF_DNS=dm2twkzzyg6a9.cloudfront.net
```

**0-3. task definition placeholder 치환 (필수)**

`task-definitions/bench-{512,1024,2048}.json`은 secrets와 측정 호스트 IP를 placeholder로 두고 커밋되어 있음. 측정 시작 전 반드시 production 값을 주입해야 한다.

치환 대상:
| placeholder | 값 출처 |
|---|---|
| `REPLACE_WITH_PRODUCTION_DB_PASSWORD` | production task definition v17의 `DB_PASSWORD` |
| `REPLACE_WITH_PRODUCTION_REDIS_PASSWORD` | 동상 `REDIS_PASSWORD` |
| `REPLACE_WITH_PRODUCTION_JWT_SECRET` | 동상 `JWT_SECRET` |
| `REPLACE_WITH_PRODUCTION_JWT_REFRESH_SECRET` | 동상 `JWT_REFRESH_SECRET` |
| `REPLACE_WITH_GITHUB_CLIENT_ID` | 동상 `GITHUB_CLIENT_ID` |
| `REPLACE_WITH_GITHUB_CLIENT_SECRET` | 동상 `GITHUB_CLIENT_SECRET` |
| `REPLACE_WITH_BENCH_HOST_PUBLIC_IP` | 측정 호스트 공인 IP — `curl -s -4 ifconfig.me` |

production v17 값 일괄 조회:

```bash
aws ecs describe-task-definition --region ap-northeast-2 \
  --task-definition csarena-backend:17 \
  --query "taskDefinition.containerDefinitions[0].environment" \
  --output json
```

치환 (예시 — 본인 값으로 교체):

```bash
MY_IP=$(curl -s -4 ifconfig.me)
echo "My public IP: $MY_IP"

# 3개 파일 일괄 치환
for f in task-definitions/bench-{512,1024,2048}.json; do
  sed -i.bak \
    -e "s|REPLACE_WITH_BENCH_HOST_PUBLIC_IP|${MY_IP}|g" \
    -e "s|REPLACE_WITH_PRODUCTION_DB_PASSWORD|<production DB_PASSWORD>|g" \
    -e "s|REPLACE_WITH_PRODUCTION_REDIS_PASSWORD|<production REDIS_PASSWORD>|g" \
    -e "s|REPLACE_WITH_PRODUCTION_JWT_SECRET|<production JWT_SECRET>|g" \
    -e "s|REPLACE_WITH_PRODUCTION_JWT_REFRESH_SECRET|<production JWT_REFRESH_SECRET>|g" \
    -e "s|REPLACE_WITH_GITHUB_CLIENT_ID|<production GITHUB_CLIENT_ID>|g" \
    -e "s|REPLACE_WITH_GITHUB_CLIENT_SECRET|<production GITHUB_CLIENT_SECRET>|g" \
    "$f"
done
```

> ⚠️ 치환된 파일은 **절대 커밋하지 말 것**. `.bak` 파일도 정리.

**0-4. k6 설치 확인**

```bash
k6 version   # v1.6.x 이상
```

### 1. BENCH task definition 3종 등록

```bash
cd scripts/benchmarks/load-limit-cloud

aws ecs register-task-definition --region ap-northeast-2 \
  --cli-input-json file://task-definitions/bench-512.json

aws ecs register-task-definition --region ap-northeast-2 \
  --cli-input-json file://task-definitions/bench-1024.json

aws ecs register-task-definition --region ap-northeast-2 \
  --cli-input-json file://task-definitions/bench-2048.json
```

각 명령 출력의 `revision` 번호를 기록 (예: `csarena-backend-bench-512:1`).

### 2. EC2 PostgreSQL에 1000명 시드

EC2 PG는 private IP(172.31.44.173)라 로컬에서 직접 접근 불가. **SSH 터널** 또는 **EC2 직접 실행** 필요.

**옵션 A — SSH 터널 (권장)**

```bash
# 별도 터미널에서 터널 유지
ssh -i ~/csarena.pem -L 5432:172.31.44.173:5432 ec2-user@13.125.237.251 -N

# 메인 터미널에서 시드 실행
PGPASSWORD='<production DB_PASSWORD>' psql -h localhost -p 5432 -U csarena -d csarena \
  < ../load-limit/seed-bench-users-1000.sql
```

**옵션 B — EC2에서 직접 실행**

```bash
scp -i ~/csarena.pem ../load-limit/seed-bench-users-1000.sql ec2-user@13.125.237.251:/tmp/
ssh -i ~/csarena.pem ec2-user@13.125.237.251 \
  "PGPASSWORD='<production DB_PASSWORD>' psql -h 172.31.44.173 -U csarena -d csarena < /tmp/seed-bench-users-1000.sql"
```

### 3. JWT 토큰 1000개 발급

production과 동일한 `JWT_SECRET`을 사용해야 backend가 토큰 검증 통과. SSH 터널이 켜진 상태여야 동적 user 조회 가능.

```bash
cd ../websocket-multi-instance

JWT_SECRET='<production JWT_SECRET>' \
  DB_HOST=localhost DB_PORT=5432 \
  DB_USER=csarena DB_PASSWORD='<production DB_PASSWORD>' DB_NAME=csarena \
  node sign-bench-tokens.mjs

# 확인 — 1000개 entry
jq 'length' tokens.json
```

(`sign-bench-tokens.mjs`의 환경변수 이름이 다르면 스크립트 내부 변수명에 맞춰 export. `<...>` 부분은 production task definition v17에서 받아 채울 것 — 절대 커밋 금지)

### 4. 측정 — 환경 1 (Fargate 0.5 vCPU)

**4-1. production service를 BENCH task definition으로 일시 교체**

```bash
aws ecs update-service --region ap-northeast-2 \
  --cluster csarena-cluster \
  --service csarena-backend \
  --task-definition csarena-backend-bench-512

# 새 task가 healthy 될 때까지 대기 (~1~2분)
aws ecs wait services-stable --region ap-northeast-2 \
  --cluster csarena-cluster --services csarena-backend
```

**4-2. 측정 endpoint 검증**

```bash
# health check
curl -i https://${CF_DNS}/api/health

# /api/metrics 접근 (사이드카 수집기 사전 검증)
curl -sS http://${ALB_DNS}/api/metrics | head -5
# → 200 응답이면 OK. 403이면 PROMETHEUS_ALLOWED_CIDRS 다시 확인
```

**4-3. 룸 4단계 부하 — 각 단계마다 사이드카 수집기 동시 실행**

```bash
cd scripts/benchmarks/load-limit-cloud

for ROOMS in 50 100 200 500; do
  echo "=== bench-512 / ROOMS=$ROOMS ==="

  # 사이드카 백그라운드
  ALB_URL=http://${ALB_DNS} ./collect-bench-cloud.sh \
    > results/bench512-rooms${ROOMS}-metrics.csv \
    2> results/bench512-rooms${ROOMS}-collect.err &
  COLLECT_PID=$!

  # k6 부하 (CloudFront endpoint = production endpoint)
  NGINX_URL=wss://${CF_DNS} k6 run \
    -e ROOMS=$ROOMS -e DURATION=2m \
    --summary-export=results/bench512-rooms${ROOMS}-k6.json \
    ../load-limit/load-test-rooms.js

  kill $COLLECT_PID
  wait $COLLECT_PID 2>/dev/null

  # 다음 단계 전 안정화 대기 (active 룸 cleanup)
  sleep 60
done
```

### 5. 측정 — 환경 2 (Fargate 1 vCPU)

```bash
aws ecs update-service --region ap-northeast-2 \
  --cluster csarena-cluster --service csarena-backend \
  --task-definition csarena-backend-bench-1024

aws ecs wait services-stable --region ap-northeast-2 \
  --cluster csarena-cluster --services csarena-backend

# 4-3 루프 반복 (파일명 prefix만 bench1024-로 변경)
for ROOMS in 50 100 200 500; do
  ALB_URL=http://${ALB_DNS} ./collect-bench-cloud.sh \
    > results/bench1024-rooms${ROOMS}-metrics.csv \
    2> results/bench1024-rooms${ROOMS}-collect.err &
  COLLECT_PID=$!

  NGINX_URL=wss://${CF_DNS} k6 run \
    -e ROOMS=$ROOMS -e DURATION=2m \
    --summary-export=results/bench1024-rooms${ROOMS}-k6.json \
    ../load-limit/load-test-rooms.js

  kill $COLLECT_PID
  wait $COLLECT_PID 2>/dev/null
  sleep 60
done
```

### 6. 측정 — 환경 3 (Fargate 2 vCPU)

```bash
aws ecs update-service --region ap-northeast-2 \
  --cluster csarena-cluster --service csarena-backend \
  --task-definition csarena-backend-bench-2048

aws ecs wait services-stable --region ap-northeast-2 \
  --cluster csarena-cluster --services csarena-backend

for ROOMS in 50 100 200 500; do
  ALB_URL=http://${ALB_DNS} ./collect-bench-cloud.sh \
    > results/bench2048-rooms${ROOMS}-metrics.csv \
    2> results/bench2048-rooms${ROOMS}-collect.err &
  COLLECT_PID=$!

  NGINX_URL=wss://${CF_DNS} k6 run \
    -e ROOMS=$ROOMS -e DURATION=2m \
    --summary-export=results/bench2048-rooms${ROOMS}-k6.json \
    ../load-limit/load-test-rooms.js

  kill $COLLECT_PID
  wait $COLLECT_PID 2>/dev/null
  sleep 60
done
```

### 7. ⚠️ production task definition 원복 (필수)

**측정 끝나면 반드시 v14로 되돌리기**. PROMETHEUS_ALLOWED_CIDRS 외부 IP 노출도 자동으로 닫힘.

```bash
aws ecs update-service --region ap-northeast-2 \
  --cluster csarena-cluster \
  --service csarena-backend \
  --task-definition csarena-backend:14

aws ecs wait services-stable --region ap-northeast-2 \
  --cluster csarena-cluster --services csarena-backend

# 검증 — 다시 v14로 돌아왔는지
aws ecs describe-services --region ap-northeast-2 \
  --cluster csarena-cluster --services csarena-backend \
  --query "services[0].taskDefinition"
```

### 8. CloudWatch에서 CPU/mem 사후 조회

각 측정 시간 윈도우(예: bench-512 / ROOMS=200 측정이 14:30~14:32)를 기억해두고 메트릭 조회.

```bash
# 예시 — bench-512 / ROOMS=200 측정 윈도우
START=2026-05-03T14:30:00Z
END=2026-05-03T14:32:00Z

# CPU
aws cloudwatch get-metric-statistics --region ap-northeast-2 \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ClusterName,Value=csarena-cluster Name=ServiceName,Value=csarena-backend \
  --start-time $START --end-time $END \
  --period 60 \
  --statistics Average,Maximum

# Memory
aws cloudwatch get-metric-statistics --region ap-northeast-2 \
  --namespace AWS/ECS \
  --metric-name MemoryUtilization \
  --dimensions Name=ClusterName,Value=csarena-cluster Name=ServiceName,Value=csarena-backend \
  --start-time $START --end-time $END \
  --period 60 \
  --statistics Average,Maximum
```

각 12 측정 윈도우의 결과를 `results/bench{cpu}-rooms{N}-cw.json`으로 저장 (수동 또는 스크립트화).

### 9. 분석 + doc 작성

12번 분석기 그대로 재사용:

```bash
for f in results/bench*-rooms*-metrics.csv; do
  ../load-limit/analyze-bench.sh "$f" > "${f%-metrics.csv}-summary.txt"
done
```

각 summary + CloudWatch CPU/mem 결과를 `docs/performance/13-cloud-load-limit.md` 표에 채워 넣는다.

---

## 산출물 (예상)

```
results/
  bench512-rooms{50,100,200,500}-metrics.csv     ← 사이드카 ELU 1초
  bench512-rooms{50,100,200,500}-k6.json         ← k6 latency
  bench512-rooms{50,100,200,500}-cw.json         ← CloudWatch CPU/mem 1분
  bench512-rooms{50,100,200,500}-summary.txt     ← analyze-bench 출력
  (1024, 2048도 동일)
```

## 시간 견적

| 단계 | 소요 |
|---|---|
| 0~1. 준비 + task def 등록 | ~10분 |
| 2~3. 시드 + 토큰 | ~10분 |
| 4. 환경 1 (4단계 측정) | ~30분 |
| 5. 환경 2 (4단계 측정) | ~30분 |
| 6. 환경 3 (4단계 측정) | ~30분 |
| 7. 원복 | 5분 |
| 8~9. 분석 + doc | ~1시간 |
| **합계** | **~3시간** |
