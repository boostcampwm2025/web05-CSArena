/**
 * Phase 1-1: HTTP REST 한계 측정
 *
 * 단계적으로 VU를 올리며 단일 ECS 태스크의 CPU 포화점을 탐색한다.
 * ELU > 0.85 또는 HTTP p95 > 2s 시점의 VU 수를 기록한다.
 *
 * 실행:
 *   k6 run scripts/benchmarks/scale-out/http-baseline.js
 *   k6 run -e BASE_URL=http://your-alb.ap-northeast-2.elb.amazonaws.com \
 *           scripts/benchmarks/scale-out/http-baseline.js
 *
 * 사전 조건:
 *   - BENCH_GRADING_BYPASS=true 가 ECS 태스크에 설정돼 있을 필요 없음 (HTTP only)
 *   - TEST_TOKEN 환경변수: leaderboard 인증이 필요한 경우 설정
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://csarena-alb-330901287.ap-northeast-2.elb.amazonaws.com';

const reqDuration = new Trend('req_duration', true);
const errCount = new Counter('err_count');
const errRate = new Rate('err_rate');

export const options = {
  stages: [
    { duration: '1m', target: 50 },    // 워밍업
    { duration: '2m', target: 200 },   // 가속
    { duration: '3m', target: 500 },   // 고부하
    { duration: '3m', target: 1000 },  // 한계 탐색
    { duration: '1m', target: 0 },     // 쿨다운
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const headers = {};
  if (__ENV.TEST_TOKEN) {
    headers['Authorization'] = `Bearer ${__ENV.TEST_TOKEN}`;
  }

  const responses = http.batch([
    ['GET', `${BASE_URL}/api/leaderboard`, null, { headers }],
    ['GET', `${BASE_URL}/api/health`, null, {}],
  ]);

  for (const res of responses) {
    const ok = res.status === 200;
    reqDuration.add(res.timings.duration);
    check(res, { 'status 200': () => ok });
    if (!ok) {
      errCount.add(1);
      errRate.add(1);
    } else {
      errRate.add(0);
    }
  }

  sleep(0.5);
}

export function handleSummary(data) {
  return {
    stdout: JSON.stringify({
      p95_ms: data.metrics.http_req_duration?.values?.['p(95)'],
      p99_ms: data.metrics.http_req_duration?.values?.['p(99)'],
      err_rate: data.metrics.http_req_failed?.values?.rate,
      rps: data.metrics.http_reqs?.values?.rate,
    }, null, 2),
  };
}
