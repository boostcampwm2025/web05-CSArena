#!/bin/bash
# 측정 윈도우별 CloudWatch CPU/MemoryUtilization 사후 조회
#
# windows.csv의 (prefix, rooms, start KST, end KST)에 대해
# CloudWatch AWS/ECS 네임스페이스에서 1분 해상도 통계를 가져와
# results/${prefix}-rooms${N}-cw.json으로 저장.
#
# 사용:
#   ./fetch-cloudwatch.sh
set -u

DATE=2026-05-03   # 측정 날짜 (필요 시 수정)
CLUSTER=csarena-cluster
SERVICE=csarena-backend
REGION=ap-northeast-2

cd "$(dirname "$0")"

printf "%-20s %-6s %-30s %-30s\n" "PREFIX" "ROOMS" "WINDOW (KST)" "WINDOW (UTC)"
printf "%-20s %-6s %-30s %-30s\n" "------" "-----" "-------------" "--------------"

cat results/bench512-windows.csv results/bench1024-windows.csv results/bench2048-windows.csv \
  | grep -v "^prefix" \
  | while IFS=',' read prefix rooms start end; do
    # KST → UTC 변환 (mac date)
    start_utc=$(date -j -u -f "%Y-%m-%dT%H:%M:%S%z" "${DATE}T${start}+0900" "+%Y-%m-%dT%H:%M:%SZ")
    end_utc=$(date -j -u -f "%Y-%m-%dT%H:%M:%S%z" "${DATE}T${end}+0900" "+%Y-%m-%dT%H:%M:%SZ")

    printf "%-20s %-6s %-30s %-30s\n" \
      "$prefix" "$rooms" "${start} ~ ${end}" "${start_utc} ~ ${end_utc}"

    cpu=$(aws cloudwatch get-metric-statistics --region $REGION \
      --namespace AWS/ECS \
      --metric-name CPUUtilization \
      --dimensions Name=ClusterName,Value=$CLUSTER Name=ServiceName,Value=$SERVICE \
      --start-time "$start_utc" --end-time "$end_utc" \
      --period 60 \
      --statistics Average Maximum \
      --query "Datapoints | sort_by(@, &Timestamp)" \
      --output json)

    mem=$(aws cloudwatch get-metric-statistics --region $REGION \
      --namespace AWS/ECS \
      --metric-name MemoryUtilization \
      --dimensions Name=ClusterName,Value=$CLUSTER Name=ServiceName,Value=$SERVICE \
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
