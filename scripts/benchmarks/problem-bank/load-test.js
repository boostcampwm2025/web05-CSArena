/**
 * 문제은행 단독 부하테스트
 *
 * 실행:
 *   k6 run scripts/benchmarks/problem-bank/load-test.js
 */
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const problemBankDuration = new Trend('problem_bank_duration', true);
const errorRate = new Rate('errors');
const requestCount = new Counter('total_requests');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const USER_COUNT = parseInt(__ENV.USER_COUNT || '100');
const USER_ID_START = parseInt(__ENV.USER_ID_START || '13');

export const options = {
  scenarios: {
    problem_bank_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 10 },
        { duration: '30s', target: 30 },
        { duration: '30s', target: 50 },
        { duration: '30s', target: 50 },
        { duration: '15s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
    problem_bank_duration: ['p(95)<200'],
    errors: ['rate<0.01'],
  },
};

export function setup() {
  const tokens = [];
  for (let i = 0; i < USER_COUNT; i++) {
    const res = http.get(
      `${BASE_URL}/api/auth/dev-login?name=testuser_${USER_ID_START + i}`,
      { redirects: 0 },
    );
    const match = (res.headers['Location'] || '').match(/access_token=([^&]+)/);
    if (match) tokens.push(match[1]);
  }
  if (tokens.length === 0) throw new Error('토큰 발급 실패');
  console.log(`토큰 발급 완료: ${tokens.length}개`);
  return { tokens };
}

export default function (data) {
  const token = data.tokens[__VU % data.tokens.length];
  const headers = { Authorization: `Bearer ${token}` };

  // 전체 목록
  const listRes = http.get(`${BASE_URL}/api/problem-bank?page=1&limit=20`, { headers });
  problemBankDuration.add(listRes.timings.duration);
  requestCount.add(1);
  errorRate.add(!check(listRes, { 'problem-bank list 200': (r) => r.status === 200 }));

  // 필터 (incorrect)
  const filterRes = http.get(
    `${BASE_URL}/api/problem-bank?page=1&limit=20&result=incorrect`,
    { headers },
  );
  problemBankDuration.add(filterRes.timings.duration);
  requestCount.add(1);
  errorRate.add(!check(filterRes, { 'problem-bank filter 200': (r) => r.status === 200 }));
}

export function teardown(data) {
  console.log(`문제은행 부하테스트 완료 (유저 ${data.tokens.length}명)`);
}
