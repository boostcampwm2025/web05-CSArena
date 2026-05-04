#!/bin/bash
# 측정 윈도우별 CloudWatch CPU/mem 통계 표 출력
#
# fetch-cloudwatch.sh가 만든 results/*-cw.json에서
# 각 측정의 CPU avg/max, mem avg/max 추출 (1분 해상도)
#
# 사용:
#   ./analyze-cloudwatch.sh
set -u

cd "$(dirname "$0")"

printf "%-25s %-10s %-10s %-10s %-10s\n" "FILE" "CPU avg%" "CPU max%" "MEM avg%" "MEM max%"
printf "%-25s %-10s %-10s %-10s %-10s\n" "----" "-------" "-------" "-------" "-------"

for f in results/bench512-rooms*-cw.json \
         results/bench1024-rooms*-cw.json \
         results/bench2048-rooms*-cw.json; do
  if [ ! -f "$f" ]; then continue; fi
  name=$(basename "$f" -cw.json)

  cpu_avg=$(jq -r '[.cpu[].Average // 0] | if length>0 then (add/length|tostring) else "n/a" end' "$f")
  cpu_max=$(jq -r '[.cpu[].Maximum // 0] | if length>0 then (max|tostring) else "n/a" end' "$f")
  mem_avg=$(jq -r '[.memory[].Average // 0] | if length>0 then (add/length|tostring) else "n/a" end' "$f")
  mem_max=$(jq -r '[.memory[].Maximum // 0] | if length>0 then (max|tostring) else "n/a" end' "$f")

  # 소수점 2자리로 포맷
  cpu_avg_f=$(printf "%.2f" "$cpu_avg" 2>/dev/null || echo "$cpu_avg")
  cpu_max_f=$(printf "%.2f" "$cpu_max" 2>/dev/null || echo "$cpu_max")
  mem_avg_f=$(printf "%.2f" "$mem_avg" 2>/dev/null || echo "$mem_avg")
  mem_max_f=$(printf "%.2f" "$mem_max" 2>/dev/null || echo "$mem_max")

  printf "%-25s %-10s %-10s %-10s %-10s\n" "$name" "$cpu_avg_f" "$cpu_max_f" "$mem_avg_f" "$mem_max_f"
done
