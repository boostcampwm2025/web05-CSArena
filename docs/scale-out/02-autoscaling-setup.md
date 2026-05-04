# Auto Scaling 구성 (Phase 2)

## 임계값 근거

13번 Fargate 측정 결과에서 도출한 수치다.

| 환경 | CPU avg | ELU p95 | 룸 수 |
|------|---------|---------|------|
| 1 vCPU 100 룸 | 33% | 0.532 | 안정 |
| 1 vCPU 200 룸 | **60%** | **0.763** | 경계 |
| 1 vCPU 500 룸 | 54% | 0.756 | 안정 (latency 증가) |
| 0.5 vCPU 100 룸 | **53%** | **0.896** | 한계 도달 |

**CPU 60% avg = ELU ≈ 0.76~0.85**. CloudWatch가 ELU를 직접 노출하지 않으므로 CPU avg 60%를 ELU 0.85의 proxy로 사용한다.

---

## 구성 명령

### Application Auto Scaling 등록

```bash
# 스케일 가능 대상 등록
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/csarena-cluster/csarena-backend \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 1 \
  --max-capacity 4 \
  --region ap-northeast-2

# 확인
aws application-autoscaling describe-scalable-targets \
  --service-namespace ecs \
  --resource-ids service/csarena-cluster/csarena-backend \
  --region ap-northeast-2
```

### CPU Target Tracking 정책 등록

```bash
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/csarena-cluster/csarena-backend \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name csarena-cpu-target-tracking \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 60.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "ScaleOutCooldown": 60,
    "ScaleInCooldown": 300,
    "DisableScaleIn": false
  }' \
  --region ap-northeast-2
```

### 파라미터 선택 근거

| 파라미터 | 값 | 근거 |
|----------|-----|------|
| `TargetValue` | 60.0 | 측정 데이터: 1 vCPU·200룸에서 CPU 60% ≈ ELU 0.763. 한계(ELU 0.85) 전에 scale-out 개시 |
| `max-capacity` | 4 | Redis/PG 단일 EC2 노드 연결 수 한계 고려. 태스크당 ~10 Redis 연결 × 4 = 40개 |
| `ScaleOutCooldown` | 60s | ECS 태스크 기동 3~5분 소요. 알람 평가를 빠르게 해야 실제 트래픽 수신까지 총 시간을 줄일 수 있음 |
| `ScaleInCooldown` | 300s | 최대 게임 길이 5라운드 × ~60초 = 5분. 부하가 줄었다고 즉시 태스크를 줄이면 진행 중인 세션이 소실됨 |

### 정책 확인 및 삭제

```bash
# 현재 등록된 정책 확인
aws application-autoscaling describe-scaling-policies \
  --service-namespace ecs \
  --resource-id service/csarena-cluster/csarena-backend \
  --region ap-northeast-2 \
  --query 'ScalingPolicies[*].{Name:PolicyName,Type:PolicyType,Target:TargetTrackingScalingPolicyConfiguration.TargetValue}'

# 정책 삭제 (테스트 종료 후)
aws application-autoscaling delete-scaling-policy \
  --service-namespace ecs \
  --resource-id service/csarena-cluster/csarena-backend \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name csarena-cpu-target-tracking \
  --region ap-northeast-2

# 스케일 가능 대상 해제
aws application-autoscaling deregister-scalable-target \
  --service-namespace ecs \
  --resource-id service/csarena-cluster/csarena-backend \
  --scalable-dimension ecs:service:DesiredCount \
  --region ap-northeast-2
```

---

## CloudWatch 알람 확인

Target Tracking 정책은 CloudWatch 알람을 자동 생성한다. 생성된 알람 이름을 확인한다.

```bash
aws cloudwatch describe-alarms \
  --alarm-name-prefix TargetTracking-service/csarena-cluster/csarena-backend \
  --region ap-northeast-2 \
  --query 'MetricAlarms[*].{Name:AlarmName,State:StateValue,Threshold:Threshold}'
```

예상 출력:
```
AlarmName: TargetTracking-service/csarena-cluster/csarena-backend-AlarmHigh-...
  State: OK
  Threshold: 60.0  (scale-out 트리거)

AlarmName: TargetTracking-service/csarena-cluster/csarena-backend-AlarmLow-...
  State: OK
  Threshold: 42.0  (scale-in 트리거, TargetValue × 0.7 자동 계산)
```

---

## ALB Deregistration Delay 확인

Scale-in 시 태스크가 draining되는 동안 기존 WebSocket 연결을 유지하려면 충분한 deregistration delay가 필요하다.

```bash
# 대상 그룹 ARN 조회
TG_ARN=$(aws elbv2 describe-target-groups \
  --region ap-northeast-2 \
  --query "TargetGroups[?contains(TargetGroupName, 'csarena')].TargetGroupArn" \
  --output text | head -1)

# 현재 delay 확인
aws elbv2 describe-target-group-attributes \
  --target-group-arn $TG_ARN \
  --region ap-northeast-2 \
  --query 'Attributes[?Key==`deregistration_delay.timeout_seconds`]'

# delay 변경 (필요 시 — 최소 330초 권장: 5라운드 × 60초 + 여유 30초)
aws elbv2 modify-target-group-attributes \
  --target-group-arn $TG_ARN \
  --region ap-northeast-2 \
  --attributes Key=deregistration_delay.timeout_seconds,Value=330
```

---

## ECS 서비스 상태 모니터링

```bash
# 실시간 태스크 수 모니터링
watch -n 5 'aws ecs describe-services \
  --cluster csarena-cluster \
  --services csarena-backend \
  --region ap-northeast-2 \
  --query "services[0].{desired:desiredCount, running:runningCount, pending:pendingCount}"'

# 스케일링 이벤트 로그
aws ecs describe-services \
  --cluster csarena-cluster \
  --services csarena-backend \
  --region ap-northeast-2 \
  --query "services[0].events[:10].{createdAt:createdAt, message:message}"
```
