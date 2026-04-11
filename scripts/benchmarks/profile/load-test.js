/**
 * 프로필(마이페이지) 단독 부하테스트
 *
 * 실행:
 *   k6 run scripts/benchmarks/profile/load-test.js
 */
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const profileDuration = new Trend('profile_duration', true);
const errorRate = new Rate('errors');
const requestCount = new Counter('total_requests');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const USER_COUNT = parseInt(__ENV.USER_COUNT || '100');
const USER_ID_START = parseInt(__ENV.USER_ID_START || '13');

export const options = {
  scenarios: {
    profile_test: {
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
    profile_duration: ['p(95)<200'],
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

  const res = http.get(`${BASE_URL}/api/users/me`, { headers });
  profileDuration.add(res.timings.duration);
  requestCount.add(1);
  errorRate.add(!check(res, { 'profile 200': (r) => r.status === 200 }));
}

export function teardown(data) {
  console.log(`프로필 부하테스트 완료 (유저 ${data.tokens.length}명)`);
}
