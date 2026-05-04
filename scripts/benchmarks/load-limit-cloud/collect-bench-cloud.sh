#!/usr/bin/env bash
# 부하 한계 측정 사이드카 수집기 — Fargate 환경용 (1초 주기)
#
# 12번(로컬) collect-bench.sh의 클라우드 변형:
#   - docker stats 영역 제거 → 컨테이너 CPU%/mem%는 CloudWatch에서 사후 조회
#     (Fargate는 docker stats 동등물이 없음. 1분 해상도면 "지속" 임계 판정에 충분)
#   - redis 영역 제거 → EC2 redis는 SG가 VPC 내부만 허용. 12번 결론상 헤드룸 충분
#   - 단일 ALB endpoint로 통합 (production service desired_count=1)
#
# 사용:
#   export ALB_URL=http://csarena-alb-xxxxxxxxxx.ap-northeast-2.elb.amazonaws.com
#   ./collect-bench-cloud.sh > results/bench512-rooms100-metrics.csv
#
# 결과 분석:
#   ../load-limit/analyze-bench.sh results/bench512-rooms100-metrics.csv
#
set -u

if [[ -z "${ALB_URL:-}" ]]; then
  echo "ERROR: ALB_URL 환경변수가 필요합니다 (예: http://csarena-alb-xxxx.elb.amazonaws.com)" >&2
  exit 1
fi

METRIC_NAMES='process_event_loop_utilization|websocket_connections_active|games_active_total|game_session_leak_recovered_total|matchmaking_queue_size'

# CSV 헤더 — 12번과 동일 (analyze-bench.sh 재사용 위함)
echo "timestamp,source,metric,value"

# /api/metrics 스크레이핑 — backend는 단일 인스턴스라 source는 "backend"로 고정
prom_snapshot() {
  local ts="$1"

  curl -sS --max-time 1 "${ALB_URL}/api/metrics" 2>/dev/null \
    | grep -E "^($METRIC_NAMES)" \
    | awk -v ts="$ts" '{print ts",backend,"$1","$2}'
}

while true; do
  TS=$(date +%H:%M:%S.%3N)
  prom_snapshot "$TS"
  sleep 1
done
