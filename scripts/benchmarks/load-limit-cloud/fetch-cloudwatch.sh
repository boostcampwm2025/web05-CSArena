#!/bin/bash
# 측정 윈도우별 CloudWatch CPU/MemoryUtilization 사후 조회
#
# windows.csv의 (prefix, rooms, start, end)에 대해 CloudWatch AWS/ECS 네임스페이스에서
# 1분 해상도 통계를 가져와 results/${prefix}-rooms${N}-cw.json으로 저장.
#
# windows.csv의 start/end는 ISO8601 형식(YYYY-MM-DDTHH:MM:SS+0900)으로 가정.
# run-bench.sh가 이 형식으로 기록한다. 자정 경계 / 다른 날 재실행 충돌 방지.
#
# 사용:
#   ./fetch-cloudwatch.sh
set -euo pipefail

CLUSTER=csarena-cluster
SERVICE=csarena-backend
REGION=ap-northeast-2

cd "$(dirname "$0")"

# KST(또는 다른 timezone) ISO8601 → UTC 변환 (BSD/GNU 호환)
# 입력 예: 2026-05-03T14:54:31+0900
# 출력 예: 2026-05-03T05:54:31Z
to_utc() {
  local iso="$1"
  # BSD date (mac)
  if date -j -u -f "%Y-%m-%dT%H:%M:%S%z" "$iso" "+%Y-%m-%dT%H:%M:%SZ" 2>/dev/null; then
    return
  fi
  # GNU date (Linux/CI)
  date -u -d "$iso" "+%Y-%m-%dT%H:%M:%SZ"
}

printf "%-20s %-6s %-32s %-32s\n" "PREFIX" "ROOMS" "WINDOW (local)" "WINDOW (UTC)"
printf "%-20s %-6s %-32s %-32s\n" "------" "-----" "--------------" "------------"

cat results/bench512-windows.csv results/bench1024-windows.csv results/bench2048-windows.csv \
  | grep -v "^prefix" \
  | while IFS=',' read -r prefix rooms start end; do
    start_utc=$(to_utc "$start")
    end_utc=$(to_utc "$end")

    printf "%-20s %-6s %-32s %-32s\n" \
      "$prefix" "$rooms" "${start} ~ ${end}" "${start_utc} ~ ${end_utc}"

    cpu=$(aws cloudwatch get-metric-statistics --region "$REGION" \
      --namespace AWS/ECS \
      --metric-name CPUUtilization \
      --dimensions "Name=ClusterName,Value=$CLUSTER" "Name=ServiceName,Value=$SERVICE" \
      --start-time "$start_utc" --end-time "$end_utc" \
      --period 60 \
      --statistics Average Maximum \
      --query "Datapoints | sort_by(@, &Timestamp)" \
      --output json)

    mem=$(aws cloudwatch get-metric-statistics --region "$REGION" \
      --namespace AWS/ECS \
      --metric-name MemoryUtilization \
      --dimensions "Name=ClusterName,Value=$CLUSTER" "Name=ServiceName,Value=$SERVICE" \
      --start-time "$start_utc" --end-time "$end_utc" \
      --period 60 \
      --statistics Average Maximum \
      --query "Datapoints | sort_by(@, &Timestamp)" \
      --output json)

    jq -n --argjson cpu "$cpu" --argjson mem "$mem" \
      '{cpu: $cpu, memory: $mem}' \
      > "results/${prefix}-rooms${rooms}-cw.json"
  done

echo ""
echo "=== CloudWatch 데이터 저장 완료 ==="
ls -la results/*-cw.json
