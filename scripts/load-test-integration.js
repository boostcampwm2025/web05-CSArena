import http from 'k6/http';
import { check, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// ============================================================
// 커스텀 메트릭
// ============================================================
const leaderboardDuration = new Trend('leaderboard_duration', true);
const problemBankDuration = new Trend('problem_bank_duration', true);
const profileDuration = new Trend('profile_duration', true);
const matchHistoryDuration = new Trend('match_history_duration', true);
const tierHistoryDuration = new Trend('tier_history_duration', true);
const errorRate = new Rate('errors');
const requestCount = new Counter('total_requests');

// ============================================================
// 테스트 설정
// ============================================================
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const USER_COUNT = parseInt(__ENV.USER_COUNT || '100');
const USER_ID_START = parseInt(__ENV.USER_ID_START || '13');

export const options = {
  scenarios: {
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },  // Warm-up
        { duration: '1m', target: 30 },   // Normal load
        { duration: '1m', target: 50 },   // Peak load
        { duration: '1m', target: 50 },   // Sustain peak
        { duration: '30s', target: 0 },   // Ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
    leaderboard_duration: ['p(95)<200'],
    problem_bank_duration: ['p(95)<200'],
    profile_duration: ['p(95)<200'],
    match_history_duration: ['p(95)<200'],
    tier_history_duration: ['p(95)<200'],
    errors: ['rate<0.01'],
  },
};

// ============================================================
// Setup: 여러 유저의 토큰을 미리 발급
// ============================================================
export function setup() {
  const tokens = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < USER_COUNT; i++) {
    const userId = USER_ID_START + i;
    const loginRes = http.get(
      `${BASE_URL}/api/auth/dev-login?name=testuser_${userId}`,
      { redirects: 0 },
    );

    const location = loginRes.headers['Location'] || '';
    const tokenMatch = location.match(/access_token=([^&]+)/);

    if (tokenMatch) {
      tokens.push(tokenMatch[1]);
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`토큰 발급 완료: 성공 ${successCount}, 실패 ${failCount}`);

  if (tokens.length === 0) {
    throw new Error('토큰을 하나도 발급받지 못했습니다.');
  }

  // 첫 번째 토큰으로 프로필 조회 검증
  const profileRes = http.get(`${BASE_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${tokens[0]}` },
  });

  if (profileRes.status !== 200) {
    throw new Error(`토큰 검증 실패: status ${profileRes.status}`);
  }

  console.log('토큰 검증 완료');

  return { tokens };
}

// ============================================================
// 메인 테스트 시나리오
// ============================================================
export default function (data) {
  // VU마다 다른 토큰 사용 (유저 분산)
  const tokenIndex = __VU % data.tokens.length;
  const headers = {
    Authorization: `Bearer ${data.tokens[tokenIndex]}`,
    'Content-Type': 'application/json',
  };

  const rand = Math.random();

  if (rand < 0.30) {
    testLeaderboard(headers);
  } else if (rand < 0.55) {
    testProblemBank(headers);
  } else if (rand < 0.75) {
    testProfile(headers);
  } else if (rand < 0.90) {
    testMatchHistory(headers);
  } else {
    testTierHistory(headers);
  }
}

// ============================================================
// 개별 테스트 함수
// ============================================================

function testLeaderboard(headers) {
  group('리더보드 조회', () => {
    const multiRes = http.get(`${BASE_URL}/api/leaderboard?type=multi`, { headers });
    leaderboardDuration.add(multiRes.timings.duration);
    requestCount.add(1);
    const multiOk = check(multiRes, {
      'leaderboard multi 200': (r) => r.status === 200,
    });
    errorRate.add(!multiOk);

    const singleRes = http.get(`${BASE_URL}/api/leaderboard?type=single`, { headers });
    leaderboardDuration.add(singleRes.timings.duration);
    requestCount.add(1);
    const singleOk = check(singleRes, {
      'leaderboard single 200': (r) => r.status === 200,
    });
    errorRate.add(!singleOk);
  });
}

function testProblemBank(headers) {
  group('문제은행 조회', () => {
    const listRes = http.get(`${BASE_URL}/api/problem-bank?page=1&limit=20`, { headers });
    problemBankDuration.add(listRes.timings.duration);
    requestCount.add(1);
    const listOk = check(listRes, {
      'problem-bank list 200': (r) => r.status === 200,
    });
    errorRate.add(!listOk);

    const filterRes = http.get(
      `${BASE_URL}/api/problem-bank?page=1&limit=20&result=incorrect`,
      { headers },
    );
    problemBankDuration.add(filterRes.timings.duration);
    requestCount.add(1);
    const filterOk = check(filterRes, {
      'problem-bank filter 200': (r) => r.status === 200,
    });
    errorRate.add(!filterOk);
  });
}

function testProfile(headers) {
  group('유저 프로필', () => {
    const res = http.get(`${BASE_URL}/api/users/me`, { headers });
    profileDuration.add(res.timings.duration);
    requestCount.add(1);
    const ok = check(res, {
      'profile 200': (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });
}

function testMatchHistory(headers) {
  group('매치 히스토리', () => {
    const res = http.get(`${BASE_URL}/api/users/me/match-history`, { headers });
    matchHistoryDuration.add(res.timings.duration);
    requestCount.add(1);
    const ok = check(res, {
      'match-history 200': (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });
}

function testTierHistory(headers) {
  group('티어 히스토리', () => {
    const res = http.get(`${BASE_URL}/api/users/me/tier-history`, { headers });
    tierHistoryDuration.add(res.timings.duration);
    requestCount.add(1);
    const ok = check(res, {
      'tier-history 200': (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });
}

export function teardown(data) {
  console.log('========================================');
  console.log(`부하테스트 완료 (유저 ${data.tokens.length}명 사용)`);
  console.log('========================================');
}
