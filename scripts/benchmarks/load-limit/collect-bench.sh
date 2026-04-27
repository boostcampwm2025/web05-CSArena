#!/usr/bin/env bash
# 부하 한계 측정 사이드카 수집기 — 1초 주기로 핵심 지표 수집
#
# 수집 대상:
#   - docker stats: backend-1/2 CPU%, mem usage/limit
#   - /api/metrics: process_event_loop_utilization, websocket_connections_active,
#                   games_active_total, game_session_leak_recovered_total
#   - redis: client_count, used_memory_bytes
#
# 사용:
#   ./collect-bench.sh > results/cpus1-rooms200-metrics.csv
#
# 결과 분석:
#   ./analyze-bench.sh results/cpus1-rooms200-metrics.csv
#
set -u

METRIC_NAMES='process_event_loop_utilization|websocket_connections_active|games_active_total|game_session_leak_recovered_total|matchmaking_queue_size'

# CSV 헤더
echo "timestamp,source,metric,value"

# docker stats 한 번에 비차단 호출 — backend-1, backend-2, redis
# MemUsage는 사람 친화 단위(KiB/MiB/GiB)로 출력되므로 단위 추출 후 모두 MiB로 정규화한다.
# 단위 무시하고 숫자만 추출하면 1.5GiB가 1.5(MiB)로 기록되는 data corruption 위험.
docker_stats_snapshot() {
  local ts="$1"
  docker stats --no-stream --format '{{.Container}},{{.CPUPerc}},{{.MemUsage}}' \
    web05-backend-1 web05-backend-2 web05-redis-multi 2>/dev/null \
    | awk -F',' -v ts="$ts" '
      {
        cpu = $2
        gsub(/[^0-9.]/, "", cpu)

        # MemUsage 형태: "123.4MiB / 1GiB"
        split($3, mem, " / ")
        raw = mem[1]
        # 단위 추출 (B / KiB / MiB / GiB)
        unit = "MiB"
        if (raw ~ /KiB/) unit = "KiB"
        else if (raw ~ /MiB/) unit = "MiB"
        else if (raw ~ /GiB/) unit = "GiB"
        else if (raw ~ /[0-9]B/) unit = "B"
        # 숫자 추출
        num = raw
        gsub(/[^0-9.]/, "", num)
        # MiB로 변환
        if (unit == "B")        mib = num / 1048576
        else if (unit == "KiB") mib = num / 1024
        else if (unit == "MiB") mib = num + 0
        else if (unit == "GiB") mib = num * 1024

        printf "%s,docker,%s_cpu_pct,%s\n", ts, $1, cpu
        printf "%s,docker,%s_mem_mib,%.2f\n", ts, $1, mib
      }'
}

# /api/metrics 스크레이핑 — backend-1/2 각각
prom_snapshot() {
  local ts="$1"
  local port="$2"
  local src="$3"

  curl -sS --max-time 1 "http://localhost:${port}/api/metrics" 2>/dev/null \
    | grep -E "^($METRIC_NAMES)" \
    | awk -v ts="$ts" -v src="$src" '{print ts","src","$1","$2}'
}

# redis 상태 — INFO clients + INFO memory 한 호출로 통합.
# CLIENT LIST는 redis-cli 자체 연결까지 +1로 세서 절대값이 부풀려지고
# docker exec 호출도 두 번 들어가던 것을 한 번으로 줄임.
# 주: connected_clients도 INFO 호출 시점의 redis-cli 자기 연결을 포함(+1).
#     이는 절대값에 한해 알려진 한계.
redis_snapshot() {
  local ts="$1"
  local info
  info=$(docker exec web05-redis-multi redis-cli INFO clients memory 2>/dev/null)
  local cc
  local mem
  cc=$(echo "$info" | awk -F: '/^connected_clients:/ {print $2}' | tr -d '\r\n')
  mem=$(echo "$info" | awk -F: '/^used_memory:/ {print $2}' | tr -d '\r\n')
  echo "$ts,redis,client_count,$cc"
  echo "$ts,redis,used_memory_bytes,$mem"
}

while true; do
  TS=$(date +%H:%M:%S.%3N)

  # 백그라운드 병렬 수집 (1초 budget 안에 모두 끝나도록)
  docker_stats_snapshot "$TS" &
  prom_snapshot "$TS" 4001 "backend-1" &
  prom_snapshot "$TS" 4002 "backend-2" &
  redis_snapshot "$TS" &
  wait

  sleep 1
done
