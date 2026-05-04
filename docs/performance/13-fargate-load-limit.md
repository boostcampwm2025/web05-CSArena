# 13. Fargate 클라우드 부하 한계 측정

## TL;DR

**Fargate 1 vCPU + 2 GB task 한 대로 동시 500 게임 룸까지 안정 운영** 가능을 측정으로 확인.

핵심 발견 3가지:

1. **12번 결론 정확히 재현** — Fargate 0.5 vCPU 환경에서 한계 룸 수가 100 룸으로 12번 cpus:1 환경(100 룸)과 일치. 1차 병목도 동일하게 이벤트 루프(ELU).
2. **vCPU 1→2 superlinear 패턴 강화** — 12번에서 발견한 "vCPU 추가가 비선형 처리량 이득"이 Fargate에서 더 강하게 나타남. 1 vCPU만으로도 12번 cpus:2 한계인 500 룸까지 미도달.
3. **로컬 docker 가상화 overhead 5배 정량화** — 같은 "1 코어" 제약에서 로컬 100 룸 vs Fargate 500 룸+. 12번에서 자체 인정한 "호스트 효과" 약점을 데이터로 검증.

---

## 측정 배경

12번 측정에서 잡은 한계는 **로컬 단일 호스트(M3 Pro 18GB · macOS · Docker Desktop)** 환경의 한계였다. 측정 자체는 의미가 있었지만 두 가지 약점이 있었다:

1. **호스트 효과 분리 불가** — macOS 스케줄러, Docker Desktop 가상화, 다른 프로세스 영향이 절대값에 섞임
2. **AWS 환경 변수 미반영** — Fargate burst credit, Nitro 하이퍼바이저, ALB hop, CloudFront TLS 등이 별개 변수

13번은 **같은 시나리오 + 같은 한계 정의**로 환경만 클라우드로 바꿔, 12번 추세가 재현되는지 + 절대값 차이가 얼마인지 확인하는 게 목표.

---

## 측정 방법

### 한계 정의 (12번과 동일 — 사전 못박기)

다음 중 하나라도 도달 시 "한계 도달"로 판정:

| 기준 | 임계 | 데이터 출처 |
|---|---|---|
| 이벤트 루프 활용도 | `process_event_loop_utilization` p95 > 0.85 (지속) | `/api/metrics` 1초 폴링 |
| 컨테이너 CPU | CPUUtilization > 90% (지속) | CloudWatch 1분 사후 |
| 컨테이너 메모리 | MemoryUtilization > 90% (지속) | CloudWatch 1분 사후 |
| 컨테이너 OOM | task stop reason = `OutOfMemoryError` | `aws ecs describe-tasks` |
| `submit_ack_duration` p95 | > 200ms | k6 |

### 측정 매트릭스

3환경 × 4룸수 = **12회 측정**. 각 측정 2분간 부하 유지.

| 환경 | task definition | cpu / memory |
|---|---|---|
| Fargate 0.5 vCPU | `csarena-backend-bench-512` | 512 / 1024 |
| Fargate 1 vCPU | `csarena-backend-bench-1024` | 1024 / 2048 |
| Fargate 2 vCPU | `csarena-backend-bench-2048` | 2048 / 4096 |

룸 수: 50 / 100 / 200 / 500

### 12번과의 차이

| 항목 | 12번 (로컬) | 13번 (Fargate) |
|---|---|---|
| 호스트 | M3 Pro 18GB · macOS 25 · Docker Desktop | AWS ECS Fargate · ap-northeast-2 |
| backend 컨테이너 | 로컬 docker | Fargate task |
| endpoint | `ws://localhost:8080` (직접) | `wss://dm2twkzzyg6a9.cloudfront.net` (CloudFront → ALB → Fargate) |
| 채점 우회 | `BENCH_GRADING_BYPASS=true` | 동일 |
| CPU/mem 수집 | `docker stats` 1초 | CloudWatch 1분 사후 |
| ELU 수집 | `/api/metrics` 1초 | 동일 |

**production service를 BENCH task definition으로 일시 교체하는 방식**으로 진행. 진짜 사용자 트래픽이 거의 없는 부트캠프 환경이라 가능한 선택.

---

## 결과

### 환경별 한계 한눈에

| 환경 | ELU p95 첫 0.85 도달 | CPU max 첫 90% 도달 | mem 한계 | **한계 룸 수** |
|---|---|---|---|---|
| Fargate 0.5 vCPU / 1 GB | **100 룸 (0.896)** | **100 룸 (99.31%)** | 미도달 (max 19%) | **100 룸** |
| Fargate 1 vCPU / 2 GB | 미도달 (500 룸 0.756) | 미도달 (max 76%) | 미도달 (max 12%) | **500 룸 미도달** |
| Fargate 2 vCPU / 4 GB | 미도달 (500 룸 0.260) | 미도달 (max 23%) | 미도달 (max 6%) | **500 룸에서 사실상 idle** |

> 1차 병목은 일관되게 **이벤트 루프(ELU)**. 12번 결론과 동일.

### Fargate 0.5 vCPU / 1 GB (현재 production)

| 룸 | ELU p95 | CPU avg / max | mem max | submit_ack p95 | match→round_start p95 | iter p95 |
|---|---|---|---|---|---|---|
| 50  | 0.801 | 25% / 72% | 13% | 98ms | 3.49s | 5.44s |
| 100 | **0.896** | 53% / **99%** | 14% | 97ms | 5.66s | 7.74s |
| 200 | **0.944** | 60% / **100%** | 15% | 100ms | 10.28s | 15.97s |
| 500 | **0.946** | 73% / 100% | 19% | 99ms | 22.15s | 33.92s |

- 100 룸부터 ELU 0.85 돌파 = 한계 도달
- 200/500 룸은 `match→round_start` latency가 3.5s → 22s 폭증
- → **글로벌 틱이 모든 룸 처리 못 따라가는 ELU 포화 직접 증거**

### Fargate 1 vCPU / 2 GB

| 룸 | ELU p95 | CPU avg / max | mem max | submit_ack p95 | match→round_start p95 | iter p95 |
|---|---|---|---|---|---|---|
| 50  | 0.478 | 20% / 35% | 8% | 25ms | 3.27s | 4.73s |
| 100 | 0.532 | 33% / 58% | 9% | 26ms | 3.30s | 4.79s |
| 200 | 0.763 | 60% / 75% | 10% | 31ms | 4.75s | 6.16s |
| 500 | 0.756 | 54% / 76% | 12% | 30ms | 12.69s | 15.97s |

- 500 룸까지 ELU p95 0.85 미도달 — 한계 못 잡음
- **submit_ack이 0.5 vCPU 환경의 ~1/4** (98ms → 25ms) — 단발 sync 처리도 vCPU 추가 효과 압도적
- match→round_start도 0.5 vCPU의 절반 — latency 자체가 안정

### Fargate 2 vCPU / 4 GB

| 룸 | ELU p95 | CPU avg / max | mem max |
|---|---|---|---|
| 50  | 0.333 | 4% / 12% | 6% |
| 100 | 0.481 | 5% / 23% | 5% |
| 200 | 0.067 | 1% / 3% | 3% |
| 500 | 0.260 | 2% / 8% | 4% |

- 모든 룸에서 ELU 한참 여유. 진짜 한계는 1000 룸 이상 부하에서 측정 필요.

### 12번 (로컬) vs 13번 (Fargate) 직접 비교

| 자원 제약 매핑 | 12번 (로컬 docker) | 13번 (Fargate Nitro) | 차이 |
|---|---|---|---|
| cpus:1 mem:1g ↔ Fargate 0.5 vCPU 1 GB | 100 룸 (ELU 0.879) | **100 룸 (ELU p95 0.896)** | **거의 정확히 재현** |
| cpus:1 mem:1g ↔ Fargate 1 vCPU 2 GB | 100 룸 | **500 룸+ 미도달** (p95 0.756) | **Fargate가 ≥ 5배** |
| cpus:2 mem:2g ↔ Fargate 2 vCPU 4 GB | 500 룸 | **사실상 idle** | **Fargate가 추가 여유** |

같은 "1 코어" 제약이 환경에 따라 5배 다른 결과 → **로컬 docker 가상화 + macOS 스케줄러 overhead**가 처리량을 5배 제한했다는 가설을 데이터로 확인.

---

## 분석

### Q1. 1차 병목은 어디인가?

**이벤트 루프(ELU)**. 모든 환경에서 일관되게 ELU가 먼저 한계 도달.

`RoundTimer.startGlobalTick`이 활성 룸을 매초 순회하면서 `round:tick`을 fan-out하는 단일 스레드 작업이 부하 크기에 정비례하는 핵심 부담. 답안 제출 같은 단발 처리는 어떤 환경에서도 100ms 미만으로 안정 — 1차 병목은 *룸 수에 비례한 작업*에 있음.

### Q2. vCPU 1→2 superlinear 이득 이유

추가 코어가 **V8 GC + libuv worker pool을 메인 이벤트 루프와 분리 수용**. 메인 스레드가 사용자 코드(글로벌 틱 + emit)에 더 많은 시간 할애 가능.

Node가 단일 스레드라 vCPU 수가 처리량에 직접 비례하지 않을 거라는 통념과 반대로, vCPU 추가가 **GC/I/O 격리** 효과를 통해 비선형 이득을 가져옴.

### Q3. 같은 cpus:1인데 왜 5배 차이?

- **로컬 docker (M3 Pro 위)**: macOS 스케줄러 + Docker Desktop 가상화 (Linux VM in macOS) + cgroups CFS quota → 가상화 hop이 두꺼움
- **Fargate Nitro**: AWS 자체 hypervisor가 vCPU를 직접 hyperthread에 매핑 → 가상화 overhead가 거의 0

### Q4. CloudFront → ALB → Fargate 경로 latency 영향

`submit_ack p95` 비교:

| 환경 | submit_ack p95 |
|---|---|
| 12번 로컬 (ws://localhost) | ~14ms |
| 13번 Fargate 0.5 vCPU (CloudFront 경유) | ~98ms |
| 13번 Fargate 1 vCPU (CloudFront 경유) | ~25ms |

TLS + CloudFront edge + ALB hop 추가 latency는 **~10~80ms 범위**. 0.5 vCPU에서 더 큰 이유는 backend 자체 처리 latency가 vCPU 부족으로 함께 늘어났기 때문.

---

## 결정 사항

### 즉시 적용 가능

| 액션 | 효과 | 비용 |
|---|---|---|
| production task를 0.5 vCPU → 1 vCPU로 변경 | 동시 수용 5배+ 증가 | 월 ~$15 → ~$30 (~$15 추가) |
| ECS auto-scaling: CPU > 60% 시 task +1 (ELU 0.85 proxy) | 평소 1 task, 부하 시 자동 확장 | 변동 비용 (부하만큼) |

> CPU 60% avg → ELU ≈ 0.76 (1 vCPU 200 룸 기준). scale-out 임계값으로 적합.

### 후속 측정 권장

- **1 vCPU의 진짜 한계** (1000~2000 룸 시드 확장 필요)
- **2 vCPU의 진짜 한계** (5000 룸+ 시드 확장 필요)
- **다중 task 환경 측정** (단일 task 기준. ALB Round-robin + Redis Adapter 분산 효과 검증)

---

## 환경 라벨

| 항목 | 값 |
|---|---|
| 측정일 | 2026-05-03 |
| ECS 클러스터 | csarena-cluster |
| ECS 서비스 | csarena-backend (production service 일시 교체 방식) |
| Region | ap-northeast-2 |
| Task definition family | csarena-backend-bench-{512,1024,2048} (각 revision 1) |
| backend 이미지 | `csarena-backend:v8` (BENCH_GRADING_BYPASS=true 주입) |
| Production task definition (원복 대상) | csarena-backend:17 |
| 측정 호스트 (k6 실행) | M3 Pro 18GB · macOS 25 · 광랜 |
| 측정 호스트 → 백엔드 | wss://dm2twkzzyg6a9.cloudfront.net |
| 사이드카 → 백엔드 | http://csarena-alb-330901287.ap-northeast-2.elb.amazonaws.com |
| Redis | EC2 단일 노드 (172.31.44.173, csarena-redis container) |
| PostgreSQL | EC2 단일 노드 (172.31.44.173, csarena-postgres container) |
| ALB idle_timeout | 3600s (2026-04-29 변경) |
| ALB sticky | OFF / round_robin (확인 완료) |

## 산출물 위치

```
scripts/benchmarks/load-limit-cloud/
├── task-definitions/
│   ├── bench-512.json
│   ├── bench-1024.json
│   └── bench-2048.json
├── results/
│   └── bench{512,1024,2048}-rooms{N}-{metrics.csv,k6.json,cw.json}  × 12
├── collect-bench-cloud.sh
├── sign-bench-tokens-cloud.mjs
├── run-bench.sh
├── analyze-elu.sh
├── fetch-cloudwatch.sh
├── analyze-cloudwatch.sh
└── README.md
```
