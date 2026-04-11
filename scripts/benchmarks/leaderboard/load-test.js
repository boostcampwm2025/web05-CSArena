/**
 * 리더보드 단독 부하테스트
 *
 * 실행:
 *   k6 run scripts/benchmarks/leaderboard/load-test.js
 *
 * 환경변수:
 *   BASE_URL      (기본값: http://localhost:4000)
 *   USER_COUNT    (기본값: 100)
 *   USER_ID_START (기본값: 13)
 */
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const leaderboardDuration = new Trend('leaderboard_duration', true);
const errorRate = new Rate('errors');
const requestCount = new Counter('total_requests');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const USER_COUNT = parseInt(__ENV.USER_COUNT || '100');
const USER_ID_START = parseInt(__ENV.USER_ID_START || '13');

export const options = {
  scenarios: {
    leaderboard_test: {
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
    leaderboard_duration: ['p(95)<200'],
    errors: ['rate<0.01'],
  },
};

export function setup() {
  const tokens = [];

  for (let i = 0; i < USER_COUNT; i++) {
    const userId = USER_ID_START + i;
    const res = http.get(
      `${BASE_URL}/api/auth/dev-login?name=testuser_${userId}`,
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

  // 멀티 리더보드
  const multiRes = http.get(`${BASE_URL}/api/leaderboard?type=multi`, { headers });
  leaderboardDuration.add(multiRes.timings.duration);
  requestCount.add(1);
  errorRate.add(!check(multiRes, { 'leaderboard multi 200': (r) => r.status === 200 }));

  // 싱글 리더보드
  const singleRes = http.get(`${BASE_URL}/api/leaderboard?type=single`, { headers });
  leaderboardDuration.add(singleRes.timings.duration);
  requestCount.add(1);
  errorRate.add(!check(singleRes, { 'leaderboard single 200': (r) => r.status === 200 }));
}

export function teardown(data) {
  console.log(`리더보드 부하테스트 완료 (유저 ${data.tokens.length}명)`);
}
