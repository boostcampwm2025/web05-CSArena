# Scale-out 타이밍 및 Scale-in 안전성 (Phase 3, 5)

## Phase 3: Scale-out 타이밍 측정

### 목표

CPU > 60%가 발생했을 때 신규 ECS 태스크가 ALB 헬스체크를 통과하고 실제 트래픽을 수신하기까지 총 소요 시간을 측정한다.

### 사전 조건

- Auto Scaling 정책 등록 완료 (`02-autoscaling-setup.md` 참고)
- BENCH_GRADING_BYPASS=true 설정된 태스크 정의 배포
- desired-count를 1로 초기화

```bash
aws ecs update-service \
  --cluster csarena-cluster \
  --service csarena-backend \
  --desired-count 1 \
  --region ap-northeast-2
```

### 부하 인가

13번 측정에서 1 vCPU 기준 200 룸에서 CPU avg 60%에 도달했다. 포화점 근처 부하를 인가한다.

```bash
# 터미널 1: k6 부하
k6 run \
  -e BASE_URL=ws://csarena-alb-330901287.ap-northeast-2.elb.amazonaws.com \
  -e ROOMS=200 \
  -e DURATION=10m \
  scripts/benchmarks/scale-out/game-simulation.js

# 터미널 2: ECS 서비스 상태 실시간 모니터링
watch -n 10 'aws ecs describe-services \
  --cluster csarena-cluster \
  --services csarena-backend \
  --region ap-northeast-2 \
  --query "services[0].{desired:desiredCount, running:runningCount, pending:pendingCount, events:events[:3]}"'

# 터미널 3: CloudWatch 알람 상태 모니터링
watch -n 30 'aws cloudwatch describe-alarms \
  --alarm-name-prefix "TargetTracking-service/csarena-cluster/csarena-backend" \
  --region ap-northeast-2 \
  --query "MetricAlarms[*].{Name:AlarmName,State:StateValue}"'
```

### 타임라인 기록 포인트

| 타임스탬프 | 이벤트 |
|-----------|-------|
| T+0 | k6 부하 시작 |
| T+A | Grafana에서 CPU > 60% 확인 |
| T+B | CloudWatch 알람 ALARM 상태 전환 |
| T+C | ECS `desiredCount` 2로 증가 |
| T+D | 신규 태스크 `PENDING` |
| T+E | 신규 태스크 `RUNNING` |
| T+F | ALB 헬스체크 통과, 트래픽 수신 시작 |
| **T+F - T+0** | **총 scale-out 소요 시간 (목표: 5분 이내)** |

### 예상 소요 시간 구간

```
CloudWatch 알람 평가 주기:  ~2분 (CPU 메트릭 1분 granularity × 2 evaluation)
ECS 스케줄링:               ~10초
Fargate 태스크 기동:        ~30초
이미지 pull (캐시됨):       ~10초
NestJS 애플리케이션 기동:   ~15초
ALB 헬스체크 통과:          ~30초 (10초 간격 × 3회)
                            ─────
합계:                       약 3~5분
```

### 가용성 확인

scale-out 진행 중에도 기존 연결이 유지되어야 한다.

```bash
# ALB 액세스 로그에서 5xx 발생 여부 확인
aws logs filter-log-events \
  --log-group-name /aws/alb/csarena-alb \
  --region ap-northeast-2 \
  --filter-pattern '"5" " 50"' \
  --start-time $(date -d '30 minutes ago' +%s000) \
  --query 'events[*].message'
```

---

## Phase 5: Scale-in 안전성

### 목표

부하 감소 후 ECS 태스크가 줄어들 때 진행 중인 게임 세션이 중단되지 않는가?

### ECS Draining 동작

ECS가 태스크를 종료할 때의 시퀀스:

1. ALB가 해당 태스크를 `draining` 상태로 변경 → 새 연결을 보내지 않음
2. `deregistration_delay` (기본 300초) 동안 기존 연결 유지
3. delay 경과 또는 기존 연결이 모두 종료되면 태스크에 `SIGTERM` 전달
4. NestJS `OnModuleDestroy` 훅 실행
5. 지정 시간 내 종료되지 않으면 `SIGKILL`

```
ALB: deregistration_delay (300s)
NestJS: onModuleDestroy() 실행
  └── GameCommandBus: 대기 중인 응답 Promise 모두 resolve (error 처리)
  └── RedisMatchQueue: "모듈 종료 시 큐 정리하지 않음 (다른 인스턴스가 사용 중일 수 있음)"
```

### 테스트 절차

```bash
# 1. 태스크 2개로 게임 10판 동시 진행
#    (game-simulation.js ROOMS=5 → VUS=10)

# 2. k6 부하 중단

# 3. CPU < 30% 유지 → 5분 후 scale-in 발생 (ScaleInCooldown 300s)

# 4. 태스크가 draining 시작하는 시점 확인
aws ecs describe-services \
  --cluster csarena-cluster \
  --services csarena-backend \
  --region ap-northeast-2 \
  --query "services[0].{desired:desiredCount, running:runningCount}"

# 5. draining 중 게임 진행 상태 Grafana로 확인
#    - games_active_total 이 0이 되지 않아야 함 (드레이닝 기간)
#    - bullmq_jobs_failed 증가 없어야 함
```

### 확인 지표

| 지표 | 정상 기준 |
|------|----------|
| `games_active_total` | Scale-in 직후 0이 되지 않음 (세션 자연 종료까지 유지) |
| `bullmq_jobs_failed{queue="match-persistence"}` | 증가 없음 |
| `game_session_leak_recovered_total{reason="catch_error"}` | 비정상 급증 없음 |
| ALB 5xx | 0 |

### GameSessionManager idle sweeper

비정상 종료(OOM 등)에 의해 세션이 고아 상태가 될 수 있다. `GameSessionManager`는 5분마다 30분 이상 비활성 세션을 자동으로 정리한다.

```typescript
// game-session-manager.ts
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;   // 5분마다 검사
const SESSION_STALE_MS  = 30 * 60 * 1000;  // 30분 비활성 시 stale

this.sweepInterval = setInterval(() => {
  this.sweepStaleSessions();
}, SWEEP_INTERVAL_MS);
```

고아 세션 정리 시 `game_session_leak_recovered_total{reason="idle"}` 카운터가 증가한다.

---

## 테스트 완료 후 정리

```bash
# 1. BENCH_GRADING_BYPASS 제거 후 운영 태스크 정의로 원복
aws ecs update-service \
  --cluster csarena-cluster \
  --service csarena-backend \
  --task-definition csarena-backend:17 \
  --region ap-northeast-2

# 2. desired-count 1로 복원 (운영 상태)
aws ecs update-service \
  --cluster csarena-cluster \
  --service csarena-backend \
  --desired-count 1 \
  --region ap-northeast-2

# 3. Auto Scaling 정책 유지 여부 결정
#    유지: 운영 트래픽에 따라 자동 확장
#    제거: scripts/benchmarks/scale-out/02-autoscaling-setup.md 참고

AWS_MAX_ATTEMPTS=80 aws ecs wait services-stable \
  --cluster csarena-cluster \
  --services csarena-backend \
  --region ap-northeast-2
```
