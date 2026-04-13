/**
 * OAuth 로그인(dev-login) 부하테스트
 *
 * users 테이블 oauth_provider + oauth_id 조회 성능 측정.
 * 매 이터레이션마다 dev-login을 직접 호출해 로그인 쿼리 실행 경로를 부하 측정한다.
 *
 * 실행:
 *   k6 run scripts/benchmarks/auth/load-test.js
 */
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const loginDuration = new Trend('login_duration', true);
const errorRate = new Rate('errors');
const requestCount = new Counter('total_requests');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const USER_COUNT = parseInt(__ENV.USER_COUNT || '500');
const USER_ID_START = parseInt(__ENV.USER_ID_START || '13');

export const options = {
  scenarios: {
    auth_test: {
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
    login_duration: ['p(95)<200'],
    errors: ['rate<0.01'],
  },
};

export default function () {
  // VU와 반복 횟수를 조합해 다양한 유저를 분산 조회 (기존 유저 조회 경로)
  const idx = (__VU * 100 + __ITER) % USER_COUNT;
  const name = `testuser_${USER_ID_START + idx}`;

  const res = http.get(`${BASE_URL}/api/auth/dev-login?name=${name}`, { redirects: 0 });
  loginDuration.add(res.timings.duration);
  requestCount.add(1);
  errorRate.add(
    !check(res, {
      'login redirect or 200': (r) => r.status === 302 || r.status === 200,
    }),
  );
}
