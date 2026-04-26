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

# docker stats 한 번에 비차단 호출 — backend-1, backend-2
docker_stats_snapshot() {
  local ts="$1"
  # CPU%, mem usage(MB) — limit 대비 비율은 분석 단계에서 계산
  docker stats --no-stream --format '{{.Container}},{{.CPUPerc}},{{.MemUsage}}' \
    web05-backend-1 web05-backend-2 web05-redis-multi 2>/dev/null \
    | awk -F',' -v ts="$ts" '
      {
        # MemUsage 형태: "123.4MiB / 1GiB"
        split($3, mem, " / ")
        gsub(/[^0-9.]/, "", $2)  # CPU% → 숫자만
        gsub(/[^0-9.]/, "", mem[1])
        printf "%s,docker,%s_cpu_pct,%s\n", ts, $1, $2
        printf "%s,docker,%s_mem_mib,%s\n", ts, $1, mem[1]
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

# redis 상태
redis_snapshot() {
  local ts="$1"
  local cc
  local mem
  cc=$(docker exec web05-redis-multi redis-cli CLIENT LIST 2>/dev/null | wc -l | tr -d ' ')
  mem=$(docker exec web05-redis-multi redis-cli INFO memory 2>/dev/null \
        | awk -F: '/^used_memory:/ {print $2}' | tr -d '\r\n')
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
