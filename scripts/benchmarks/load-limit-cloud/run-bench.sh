#!/bin/bash
# 부하 한계 측정 자동화 — 한 환경(cpu)에서 4단계 룸 수 자동 측정
#
# 사용:
#   ./run-bench.sh 512    # Fargate 0.5 vCPU
#   ./run-bench.sh 1024   # Fargate 1 vCPU
#   ./run-bench.sh 2048   # Fargate 2 vCPU
#
# 결과:
#   results/bench${cpu}-rooms${N}-metrics.csv   ← 사이드카 1초 폴링
#   results/bench${cpu}-rooms${N}-k6.json       ← k6 summary
#   results/bench${cpu}-rooms${N}-collect.err   ← 사이드카 stderr
#   results/bench${cpu}-windows.csv             ← 측정 시간 윈도우 (CloudWatch 사후 조회용)
#
# 전제 조건:
#   - service가 csarena-backend-bench-${cpu} task definition으로 deploy 완료
#   - tokens.json이 ../websocket-multi-instance/에 있음
#   - PROMETHEUS_ALLOWED_CIDRS에 측정 호스트 공인 IP 포함
#   - k6 설치
set -u

CPU=${1:?"usage: $0 <cpu> (512|1024|2048)"}
PREFIX="bench${CPU}"

ALB_DNS=csarena-alb-330901287.ap-northeast-2.elb.amazonaws.com
CF_DNS=dm2twkzzyg6a9.cloudfront.net

mkdir -p results

# 측정 시간 윈도우 헤더 (덮어쓰기)
echo "prefix,rooms,start,end" > "results/${PREFIX}-windows.csv"

for ROOMS in 50 100 200 500; do
  TS_START=$(date +%H:%M:%S)
  echo ""
  echo "=========================================="
  echo "=== $PREFIX / ROOMS=$ROOMS / start: $TS_START"
  echo "=========================================="

  # 사이드카 백그라운드 — /api/metrics 1초 폴링
  ALB_URL=http://$ALB_DNS ./collect-bench-cloud.sh \
    > "results/${PREFIX}-rooms${ROOMS}-metrics.csv" \
    2> "results/${PREFIX}-rooms${ROOMS}-collect.err" &
  COLLECT_PID=$!

  # k6 부하 (CloudFront → ALB → Fargate task)
  k6 run \
    -e ROOMS="$ROOMS" -e DURATION=2m -e NGINX_URL="wss://$CF_DNS" \
    --summary-export="results/${PREFIX}-rooms${ROOMS}-k6.json" \
    ../load-limit/load-test-rooms.js

  # 사이드카 종료
  kill "$COLLECT_PID" 2>/dev/null
  wait "$COLLECT_PID" 2>/dev/null

  TS_END=$(date +%H:%M:%S)
  echo "=== $PREFIX / ROOMS=$ROOMS / end: $TS_END"
  echo "${PREFIX},${ROOMS},${TS_START},${TS_END}" >> "results/${PREFIX}-windows.csv"

  # 다음 단계 전 안정화 (active 룸 cleanup, gc 안정)
  if [ "$ROOMS" != "500" ]; then
    echo "다음 단계 전 60초 대기..."
    sleep 60
  fi
done

echo ""
echo "=========================================="
echo "=== $PREFIX 4단계 측정 완료"
echo "=========================================="
ls -la results/${PREFIX}-*.csv results/${PREFIX}-*.json 2>/dev/null
