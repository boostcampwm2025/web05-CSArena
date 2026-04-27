#!/usr/bin/env bash
# 부하 한계 측정 결과 요약 — 한계 정의 기준 도달 여부 + 핵심 통계
#
# 한계 정의:
#   1. process_event_loop_utilization > 0.85 (지속)
#   2. backend CPU% > 90 (지속)
#   3. mem_usage > 90% of limit
#
# 사용:
#   ./analyze-bench.sh results/cpus1-rooms200-metrics.csv
#
set -u

CSV="${1:?Usage: $0 <metrics.csv>}"

if [[ ! -f "$CSV" ]]; then
  echo "ERROR: file not found: $CSV" >&2
  exit 1
fi

echo "=========================================="
echo " 부하 측정 결과 요약: $CSV"
echo "=========================================="

# 이벤트 루프 활용도 max / p50 / p95 — backend별
echo ""
echo "[event loop utilization]"
for src in backend-1 backend-2; do
  awk -F',' -v src="$src" '
    $2==src && $3=="process_event_loop_utilization" { print $4 }
  ' "$CSV" | sort -n | awk -v src="$src" '
    {a[NR]=$1}
    END {
      if (NR==0) { printf "  %s: (no samples)\n", src; exit }
      printf "  %s: max=%.3f p95=%.3f p50=%.3f n=%d\n",
        src, a[NR], a[int(NR*0.95)], a[int(NR*0.5)], NR
    }'
done

# CPU% — backend별
echo ""
echo "[backend CPU %]"
for c in web05-backend-1 web05-backend-2; do
  awk -F',' -v c="$c" '
    $2=="docker" && $3==c"_cpu_pct" { print $4 }
  ' "$CSV" | sort -n | awk -v c="$c" '
    {a[NR]=$1}
    END {
      if (NR==0) { printf "  %s: (no samples)\n", c; exit }
      printf "  %s: max=%.1f%% p95=%.1f%% p50=%.1f%% n=%d\n",
        c, a[NR], a[int(NR*0.95)], a[int(NR*0.5)], NR
    }'
done

# 메모리 (MiB)
echo ""
echo "[backend mem MiB]"
for c in web05-backend-1 web05-backend-2; do
  awk -F',' -v c="$c" '
    $2=="docker" && $3==c"_mem_mib" { print $4 }
  ' "$CSV" | sort -n | awk -v c="$c" '
    {a[NR]=$1}
    END {
      if (NR==0) { printf "  %s: (no samples)\n", c; exit }
      printf "  %s: max=%.1f p95=%.1f p50=%.1f n=%d\n",
        c, a[NR], a[int(NR*0.95)], a[int(NR*0.5)], NR
    }'
done

# WebSocket 활성 커넥션
echo ""
echo "[websocket_connections_active]"
for src in backend-1 backend-2; do
  awk -F',' -v src="$src" '
    $2==src && $3=="websocket_connections_active" { print $4 }
  ' "$CSV" | sort -n | awk -v src="$src" '
    {a[NR]=$1}
    END {
      if (NR==0) { printf "  %s: (no samples)\n", src; exit }
      printf "  %s: max=%d p95=%d p50=%d n=%d\n",
        src, a[NR], a[int(NR*0.95)], a[int(NR*0.5)], NR
    }'
done

# 활성 게임 수
echo ""
echo "[games_active_total]"
for src in backend-1 backend-2; do
  awk -F',' -v src="$src" '
    $2==src && $3=="games_active_total" { print $4 }
  ' "$CSV" | sort -n | awk -v src="$src" '
    {a[NR]=$1}
    END {
      if (NR==0) { printf "  %s: (no samples)\n", src; exit }
      printf "  %s: max=%d p95=%d p50=%d n=%d\n",
        src, a[NR], a[int(NR*0.95)], a[int(NR*0.5)], NR
    }'
done

# Redis
echo ""
echo "[redis]"
for metric in client_count used_memory_bytes; do
  vals=$(awk -F',' -v m="$metric" '$2=="redis" && $3==m { print $4 }' "$CSV" | sort -n)
  echo "$vals" | awk -v m="$metric" '
    {a[NR]=$1}
    END {
      if (NR==0) { printf "  %s: (no samples)\n", m; exit }
      if (m=="used_memory_bytes")
        printf "  used_memory: max=%.1fMiB p50=%.1fMiB\n", a[NR]/1048576, a[int(NR*0.5)]/1048576
      else
        printf "  %s: max=%d p50=%d\n", m, a[NR], a[int(NR*0.5)]
    }'
done

# 한계 도달 판정
echo ""
echo "[한계 정의 도달 여부]"
ELU_MAX=$(awk -F',' '
  $3=="process_event_loop_utilization" { if ($4+0 > max) max=$4+0 }
  END { printf "%.3f", max+0 }
' "$CSV")
echo "  event loop utilization max: $ELU_MAX (threshold 0.85)"
awk "BEGIN { exit ! ($ELU_MAX > 0.85) }" \
  && echo "    → 도달 (이벤트 루프 포화)" \
  || echo "    → 미도달"

CPU_MAX=$(awk -F',' '
  ($3=="web05-backend-1_cpu_pct" || $3=="web05-backend-2_cpu_pct") {
    if ($4+0 > max) max=$4+0
  }
  END { printf "%.1f", max+0 }
' "$CSV")
echo "  backend cpu max: ${CPU_MAX}% (threshold 90%)"
awk "BEGIN { exit ! ($CPU_MAX > 90) }" \
  && echo "    → 도달 (CPU 포화)" \
  || echo "    → 미도달"
