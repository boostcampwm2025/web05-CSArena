/**
 * 프로필(마이페이지) 통합 부하테스트
 *
 * 이터레이션마다 프로필 페이지 진입 시 실제로 호출되는 세 엔드포인트를 순서대로 호출한다.
 *   1. GET /api/users/me          — 기본 프로필 + 문제 통계
 *   2. GET /api/users/me/tier-history  — 티어 히스토리
 *   3. GET /api/users/me/match-history — 최근 매치 히스토리
 *
 * 실행:
 *   k6 run scripts/benchmarks/profile/load-test.js
 */
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const profileDuration = new Trend('profile_duration', true);
const tierHistoryDuration = new Trend('tier_history_duration', true);
const matchHistoryDuration = new Trend('match_history_duration', true);
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
    tier_history_duration: ['p(95)<200'],
    match_history_duration: ['p(95)<500'],
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

  const profileRes = http.get(`${BASE_URL}/api/users/me`, { headers });
  profileDuration.add(profileRes.timings.duration);
  requestCount.add(1);
  errorRate.add(!check(profileRes, { 'profile 200': (r) => r.status === 200 }));

  const tierRes = http.get(`${BASE_URL}/api/users/me/tier-history`, { headers });
  tierHistoryDuration.add(tierRes.timings.duration);
  requestCount.add(1);
  errorRate.add(!check(tierRes, { 'tier-history 200': (r) => r.status === 200 }));

  const matchRes = http.get(`${BASE_URL}/api/users/me/match-history`, { headers });
  matchHistoryDuration.add(matchRes.timings.duration);
  requestCount.add(1);
  errorRate.add(!check(matchRes, { 'match-history 200': (r) => r.status === 200 }));
}

export function teardown(data) {
  console.log(`프로필 부하테스트 완료 (유저 ${data.tokens.length}명)`);
}
