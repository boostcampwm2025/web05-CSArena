#!/bin/bash
# 부하 한계 측정 통합 ELU 분석기 (BSD awk 호환)
#
# - 사이드카 metrics.csv 12개에서 process_event_loop_utilization 추출
# - cold start 첫 30초 제외 (컨테이너 초기 GC + JIT spike 제거)
# - max / p99 / p95 / median 통계 출력
#
# 사용:
#   ./analyze-elu.sh
set -u

cd "$(dirname "$0")"

printf "%-35s %-6s %-8s %-8s %-8s %-8s\n" "FILE" "n" "max" "p99" "p95" "median"
printf "%-35s %-6s %-8s %-8s %-8s %-8s\n" "----" "-" "---" "---" "---" "------"

for f in results/bench512-rooms*-metrics.csv \
         results/bench1024-rooms*-metrics.csv \
         results/bench2048-rooms*-metrics.csv; do
  if [ ! -f "$f" ]; then continue; fi
  name=$(basename "$f" -metrics.csv)

  # ELU 값만 추출 → cold start 30개 제외 → 숫자 sort → percentile 계산
  awk -F',' '$3=="process_event_loop_utilization" {print $4}' "$f" \
    | tail -n +31 \
    | sort -n \
    | awk -v name="$name" '
        {a[NR]=$1}
        END {
          n = NR
          if (n == 0) { printf "%-35s n=0 (no data)\n", name; next }
          printf "%-35s %-6d %-8.3f %-8.3f %-8.3f %-8.3f\n",
            name, n, a[n], a[int(n*0.99)+1], a[int(n*0.95)+1], a[int(n*0.50)+1]
        }'
done
