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

  # 숫자 검증 후 포맷 — 비숫자는 그대로 출력 (printf가 부분 출력 후 실패하면 "0.00n/a" 같은
  # 깨진 값이 캡처돼 표 정렬이 망가지는 문제 방지)
  format_num() {
    local v="$1"
    if [[ "$v" =~ ^-?[0-9]+(\.[0-9]+)?$ ]]; then
      printf "%.2f" "$v"
    else
      printf "%s" "$v"
    fi
  }
  cpu_avg_f=$(format_num "$cpu_avg")
  cpu_max_f=$(format_num "$cpu_max")
  mem_avg_f=$(format_num "$mem_avg")
  mem_max_f=$(format_num "$mem_max")

  printf "%-25s %-10s %-10s %-10s %-10s\n" "$name" "$cpu_avg_f" "$cpu_max_f" "$mem_avg_f" "$mem_max_f"
done
