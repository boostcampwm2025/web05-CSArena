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
#                                                 start/end는 ISO8601 (YYYY-MM-DDTHH:MM:SS+TZ)
#                                                 — 자정 경계/다른 날 재실행 충돌 방지
#
# 동작 보장:
#   - set -euo pipefail로 에러 시 즉시 중단 (k6 thresholds 실패 99는 제외 — 측정은 유효)
#   - trap EXIT/INT/TERM으로 collector 좀비 차단
#
# 전제 조건:
#   - service가 csarena-backend-bench-${cpu} task definition으로 deploy 완료
#   - tokens.json이 ../websocket-multi-instance/에 있음
#   - PROMETHEUS_ALLOWED_CIDRS에 측정 호스트 공인 IP 포함
#   - k6 설치
set -euo pipefail

CPU=${1:?"usage: $0 <cpu> (512|1024|2048)"}
PREFIX="bench${CPU}"

ALB_DNS=csarena-alb-330901287.ap-northeast-2.elb.amazonaws.com
CF_DNS=dm2twkzzyg6a9.cloudfront.net

cd "$(dirname "$0")"
mkdir -p results

# Collector cleanup — INT/TERM/EXIT 모두에서 좀비 방지
COLLECT_PID=""
cleanup() {
  if [[ -n "$COLLECT_PID" ]]; then
    kill "$COLLECT_PID" 2>/dev/null || true
    wait "$COLLECT_PID" 2>/dev/null || true
    COLLECT_PID=""
  fi
}
trap cleanup EXIT INT TERM

# 측정 시간 윈도우 헤더 (덮어쓰기) — start/end는 ISO8601 with timezone
echo "prefix,rooms,start,end" > "results/${PREFIX}-windows.csv"

for ROOMS in 50 100 200 500; do
  TS_START=$(date +"%Y-%m-%dT%H:%M:%S%z")
  echo ""
  echo "=========================================="
  echo "=== $PREFIX / ROOMS=$ROOMS / start: $TS_START"
  echo "=========================================="

  # 사이드카 백그라운드 — /api/metrics 1초 폴링
  ALB_URL=http://$ALB_DNS ./collect-bench-cloud.sh \
    > "results/${PREFIX}-rooms${ROOMS}-metrics.csv" \
    2> "results/${PREFIX}-rooms${ROOMS}-collect.err" &
  COLLECT_PID=$!

  # k6 부하 — exit code 처리:
  #   0  = 모든 thresholds 통과
  #   99 = thresholds 일부 실패 (그러나 시나리오 정상 완료 — 측정은 유효)
  #   그 외 = 실제 에러 (네트워크, 스크립트 결함 등) → 중단
  k6_exit=0
  k6 run \
    -e ROOMS="$ROOMS" -e DURATION=2m -e NGINX_URL="wss://$CF_DNS" \
    --summary-export="results/${PREFIX}-rooms${ROOMS}-k6.json" \
    ../load-limit/load-test-rooms.js || k6_exit=$?

  # 사이드카 종료 (정상/에러 양 경로)
  cleanup

  if [[ "$k6_exit" -ne 0 && "$k6_exit" -ne 99 ]]; then
    echo "ERROR: k6 unexpected exit code $k6_exit for $PREFIX rooms=$ROOMS — 배치 중단" >&2
    exit "$k6_exit"
  fi

  TS_END=$(date +"%Y-%m-%dT%H:%M:%S%z")
  echo "=== $PREFIX / ROOMS=$ROOMS / end: $TS_END (k6 exit=$k6_exit)"
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
ls -la "results/${PREFIX}-"*.csv "results/${PREFIX}-"*.json 2>/dev/null
