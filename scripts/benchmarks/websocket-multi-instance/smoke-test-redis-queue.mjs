/**
 * RedisMatchQueue Lua 스크립트 스모크 테스트
 *
 * 실제 코드(packages/backend/src/matchmaking/queue/redis-match-queue.ts)에서
 * Lua 스크립트 문자열을 그대로 가져와 실행 → 원자성 + 매칭 로직 검증.
 *
 * 사용 (scripts/benchmarks 디렉터리는 pnpm workspace에 포함되지 않은
 * 독립 패키지 — 루트 pnpm install로는 설치되지 않음):
 *
 *   cd scripts/benchmarks
 *   pnpm install --ignore-workspace
 *   pnpm smoke:queue
 */
import Redis from 'ioredis';

const redis = new Redis({ host: 'localhost', port: 6379 });

const QUEUE_KEY = 'smoke:matchmaking:queue';
const PLAYER_DATA_PREFIX = 'smoke:matchmaking:player:';

const addAndMatchScript = `
  local queueKey = KEYS[1]
  local userId = ARGV[1]
  local eloRating = tonumber(ARGV[2])
  local queuedAt = ARGV[3]
  local allowedRange = tonumber(ARGV[4])

  local existingScore = redis.call('ZSCORE', queueKey, userId)
  if existingScore then return nil end

  local minElo = eloRating - allowedRange
  local maxElo = eloRating + allowedRange
  local candidates = redis.call('ZRANGEBYSCORE', queueKey, minElo, maxElo, 'WITHSCORES')

  local bestMatch = nil
  local bestDiff = allowedRange + 1
  local now = tonumber(ARGV[3])

  for i = 1, #candidates, 2 do
    local candidateId = candidates[i]
    local candidateElo = tonumber(candidates[i + 1])
    if candidateId ~= userId then
      local candidateData = redis.call('GET', '${PLAYER_DATA_PREFIX}' .. candidateId)
      if candidateData then
        local candidateQueuedAt = tonumber(candidateData)
        local candidateWaitMs = now - candidateQueuedAt
        local candidateRange = 500
        if candidateWaitMs < 10000 then candidateRange = 100
        elseif candidateWaitMs < 30000 then candidateRange = 200 end
        local diff = math.abs(eloRating - candidateElo)
        if diff <= candidateRange and diff < bestDiff then
          bestMatch = candidateId
          bestDiff = diff
        end
      end
    end
  end

  if bestMatch then
    redis.call('ZREM', queueKey, bestMatch)
    redis.call('DEL', '${PLAYER_DATA_PREFIX}' .. bestMatch)
    return bestMatch
  else
    redis.call('ZADD', queueKey, eloRating, userId)
    redis.call('SET', '${PLAYER_DATA_PREFIX}' .. userId, queuedAt, 'EX', 300)
    return nil
  end
`;

async function cleanup() {
  await redis.del(QUEUE_KEY);
  const keys = await redis.keys(`${PLAYER_DATA_PREFIX}*`);
  if (keys.length > 0) await redis.del(...keys);
}

async function addAndMatch(userId, elo, range = 100) {
  const now = Date.now();
  return redis.eval(addAndMatchScript, 1, QUEUE_KEY, userId, elo.toString(), now.toString(), range.toString());
}

let passed = 0;
let failed = 0;
const assert = (cond, name, detail = '') => {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name} ${detail}`); }
};

async function runTests() {
  console.log('\n=== Redis Match Queue Lua Smoke Test ===\n');

  // 1) 빈 큐 — 매칭 없음 → 큐에 추가
  await cleanup();
  console.log('[Test 1] 빈 큐에 플레이어 추가');
  const r1 = await addAndMatch('alice', 1000);
  assert(r1 === null, '빈 큐에선 매칭 없이 큐 추가', `(returned ${r1})`);
  const size1 = await redis.zcard(QUEUE_KEY);
  assert(size1 === 1, '큐 크기 1');

  // 2) ELO 범위 내 두 번째 플레이어 → 매칭 성공
  console.log('\n[Test 2] ELO 근접 플레이어 매칭');
  const r2 = await addAndMatch('bob', 1050);
  assert(r2 === 'alice', 'bob이 alice와 매칭됨', `(returned ${r2})`);
  const size2 = await redis.zcard(QUEUE_KEY);
  assert(size2 === 0, '매칭 후 큐 비어있음', `(size=${size2})`);

  // 3) ELO 범위 밖 → 매칭 실패, 큐에 쌓임
  console.log('\n[Test 3] ELO 범위 밖 → 미매칭');
  await cleanup();
  await addAndMatch('a', 1000, 100);
  const r3 = await addAndMatch('b', 1500, 100);
  assert(r3 === null, '범위 밖이라 미매칭', `(returned ${r3})`);
  const size3 = await redis.zcard(QUEUE_KEY);
  assert(size3 === 2, '둘 다 큐에 남음', `(size=${size3})`);

  // 4) 중복 추가 방지
  console.log('\n[Test 4] 중복 userId 추가 방지');
  await cleanup();
  await addAndMatch('dup', 1000);
  const r4 = await addAndMatch('dup', 1000);
  assert(r4 === null, '중복 추가는 nil 반환');
  const size4 = await redis.zcard(QUEUE_KEY);
  assert(size4 === 1, '큐 크기 1 (중복 차단)', `(size=${size4})`);

  // 5) 베스트 매치 선택 — 서로 매칭 안 되도록 간격을 벌려서 큐에 쌓은 뒤 target 투입
  console.log('\n[Test 5] 베스트 매치 선택 (ELO 최근접)');
  await cleanup();
  // 간격을 250씩 벌려서 자기들끼리 range=100 안에서 매칭되지 않게 함
  await addAndMatch('far', 1280, 100);
  await addAndMatch('mid', 1530, 100);
  await addAndMatch('near', 1780, 100);
  const sizeBefore = await redis.zcard(QUEUE_KEY);
  assert(sizeBefore === 3, `3명 모두 큐에 쌓임 (자기들끼리 미매칭)`, `(size=${sizeBefore})`);
  // target=1820, range=500이면 near(1780), mid(1530) 둘 다 후보. 가장 가까운 near 선택
  const best = await addAndMatch('target', 1820, 500);
  assert(best === 'near', `ELO 1820과 가장 가까운 near(1780) 매칭`, `(returned ${best})`);

  // 6) 동시성 테스트 — 10명 rival이 동시에 host와 매칭 시도, host는 단 1명과만 매칭
  console.log('\n[Test 6] 동시 요청 원자성 (race condition)');
  await cleanup();
  await addAndMatch('host', 1000);
  // rival들은 서로 ELO 간격을 300씩 벌려 자기들끼리는 range=100 내 매칭 안 됨
  // 하지만 host와는 range=100+ 안에 들어오도록 배치
  const parallel = await Promise.all(
    Array.from({ length: 10 }, (_, i) => addAndMatch(`rival${i}`, 1000 + i * 300, 100))
  );
  const matchedHost = parallel.filter((r) => r === 'host').length;
  assert(matchedHost === 1, `host는 정확히 1명과만 매칭 (실제: ${matchedHost})`, `(matched=${matchedHost}/10)`);
  // 정확히 1명만 host와 매칭 → 9명 남음 (자기들끼리는 ±300이라 range=100 밖)
  const size6 = await redis.zcard(QUEUE_KEY);
  assert(size6 === 9, `자기들끼리 매칭 안 됨 + host 매칭 1명 제외한 9명 남음`, `(size=${size6})`);

  // 7) 100회 반복 race 재현
  console.log('\n[Test 7] 100회 race condition 스트레스');
  let raceFailures = 0;
  for (let trial = 0; trial < 100; trial++) {
    await cleanup();
    await addAndMatch('anchor', 1000);
    const results = await Promise.all([
      addAndMatch('p1', 1010),
      addAndMatch('p2', 1020),
      addAndMatch('p3', 1030),
    ]);
    const matches = results.filter((r) => r === 'anchor').length;
    if (matches !== 1) raceFailures++;
  }
  assert(raceFailures === 0, `100회 중 anchor 중복 매칭 0건`, `(failures=${raceFailures})`);

  // 정리
  await cleanup();
  console.log(`\n=== 결과: ${passed} passed, ${failed} failed ===`);
  await redis.quit();
  process.exit(failed === 0 ? 0 : 1);
}

runTests().catch((err) => {
  console.error('테스트 실패:', err);
  process.exit(1);
});