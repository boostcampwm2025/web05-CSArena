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

export const options = {
  scenarios: {
    // Baseline: 점진적 부하 증가
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
// Setup: 테스트 시작 전 토큰 발급
// ============================================================
export function setup() {
  // dev-login으로 토큰 발급 (redirect에서 추출)
  const loginRes = http.get(`${BASE_URL}/api/auth/dev-login?name=loadtest_user`, {
    redirects: 0, // redirect를 따라가지 않음
  });

  // 302 redirect의 Location 헤더에서 access_token 추출
  const location = loginRes.headers['Location'] || '';
  const tokenMatch = location.match(/access_token=([^&]+)/);

  if (!tokenMatch) {
    throw new Error(`토큰 발급 실패 (status: ${loginRes.status}, location: ${location})`);
  }

  const token = tokenMatch[1];
  console.log('토큰 발급 성공');

  // 발급된 토큰으로 프로필 조회 검증
  const profileRes = http.get(`${BASE_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (profileRes.status !== 200) {
    throw new Error(`토큰 검증 실패: 프로필 조회 status ${profileRes.status}`);
  }

  console.log('토큰 검증 완료');

  return { token };
}

// ============================================================
// 메인 테스트 시나리오
// ============================================================
export default function (data) {
  const headers = {
    Authorization: `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  // 시나리오 비중에 따라 랜덤 선택
  const rand = Math.random();

  if (rand < 0.30) {
    // 30% — 리더보드 조회
    testLeaderboard(headers);
  } else if (rand < 0.55) {
    // 25% — 문제은행 조회
    testProblemBank(headers);
  } else if (rand < 0.75) {
    // 20% — 유저 프로필
    testProfile(headers);
  } else if (rand < 0.90) {
    // 15% — 매치 히스토리
    testMatchHistory(headers);
  } else {
    // 10% — 티어 히스토리
    testTierHistory(headers);
  }
}

// ============================================================
// 개별 테스트 함수
// ============================================================

function testLeaderboard(headers) {
  group('리더보드 조회', () => {
    // 멀티 리더보드
    const multiRes = http.get(`${BASE_URL}/api/leaderboard?type=multi`, { headers });
    leaderboardDuration.add(multiRes.timings.duration);
    requestCount.add(1);
    const multiOk = check(multiRes, {
      'leaderboard multi 200': (r) => r.status === 200,
    });
    errorRate.add(!multiOk);

    // 싱글 리더보드
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
    // 기본 목록
    const listRes = http.get(`${BASE_URL}/api/problem-bank?page=1&limit=20`, { headers });
    problemBankDuration.add(listRes.timings.duration);
    requestCount.add(1);
    const listOk = check(listRes, {
      'problem-bank list 200': (r) => r.status === 200,
    });
    errorRate.add(!listOk);

    // 필터링 (오답만 + 북마크)
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

// ============================================================
// Teardown: 결과 요약
// ============================================================
export function teardown(data) {
  console.log('========================================');
  console.log('부하테스트 완료');
  console.log('========================================');
}
