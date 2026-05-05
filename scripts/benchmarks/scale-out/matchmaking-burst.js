/**
 * Phase 4-5: 다중 인스턴스 매칭 Race Condition 부하 테스트
 *
 * N명이 동시에 매칭 큐에 진입하여 중복 매칭이 없는지 확인한다.
 * Redis Lua 원자 스크립트가 다중 인스턴스 환경에서도 정확히 동작해야 한다.
 *
 * 성공 기준:
 *   - 매칭된 쌍의 수 = N / 2 (100명 → 50쌍)
 *   - 한 명이 두 게임에 동시에 배치되는 케이스 없음 (duplicate_match_count = 0)
 *   - 테스트 종료 후 matchmaking_queue_size = 0 (고립 없음)
 *
 * 실행:
 *   # ECS desired-count 2 이상 상태에서 실행
 *   k6 run -e PLAYERS=100 -e BASE_URL=ws://... \
 *           scripts/benchmarks/scale-out/matchmaking-burst.js
 *
 * 사전 조건:
 *   - ECS desired-count 2 이상
 *   - BENCH_GRADING_BYPASS=true
 *   - tokens.json (PLAYERS 수 이상의 항목 필요)
 */
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';

const BASE_URL = __ENV.BASE_URL || 'ws://csarena-alb-330901287.ap-northeast-2.elb.amazonaws.com';
const SOCKETIO_PATH = '/socket.io';
const SOCKETIO_NS = '/ws';
const PLAYERS = Number(__ENV.PLAYERS || 100);

const tokens = new SharedArray('bench-tokens', () =>
  JSON.parse(open('./tokens.json')),
);

// 핵심 지표
const matchedCount = new Counter('matched_count');
const unmatchedCount = new Counter('unmatched_count');
const matchSuccessRate = new Rate('burst_match_success_rate');
const matchWaitDuration = new Trend('burst_match_wait_ms', true);
const gameCompleteCount = new Counter('burst_game_complete_count');
const gameErrorCount = new Counter('burst_game_error_count');

export const options = {
  scenarios: {
    burst: {
      executor: 'shared-iterations',
      vus: PLAYERS,
      iterations: PLAYERS,
      maxDuration: '3m',
    },
  },
  thresholds: {
    burst_match_success_rate: ['rate>0.98'],
    burst_match_wait_ms: ['p(99)<20000'],
  },
};

function sioEvent(name, args, ackId) {
  const payload = JSON.stringify([name, ...args]);
  const ackStr = ackId !== undefined ? String(ackId) : '';
  return `42${SOCKETIO_NS},${ackStr}${payload}`;
}

function parseSioMessage(raw) {
  const m = raw.match(/^4(\d)(\/\w+)?,(\d+)?(.+)$/);
  if (!m) return null;
  const [, subtype, , ackIdStr, json] = m;
  try {
    return { subtype: Number(subtype), ackId: ackIdStr ? Number(ackIdStr) : undefined, data: JSON.parse(json) };
  } catch (_e) {
    return null;
  }
}

export default function () {
  const idx = (__VU - 1) % tokens.length;
  const { token } = tokens[idx];
  const url = `${BASE_URL}${SOCKETIO_PATH}/?EIO=4&transport=websocket`;

  let enqueueSentAt = null;
  let matched = false;
  let gameEnded = false;
  let nextAckId = 1;
  let submitSentAt = null;

  ws.connect(url, null, function (socket) {
    socket.on('message', (raw) => {
      if (raw.startsWith('0')) {
        socket.send(`40${SOCKETIO_NS},${JSON.stringify({ token })}`);
        return;
      }
      if (raw === '2') { socket.send('3'); return; }

      const parsed = parseSioMessage(raw);
      if (!parsed || parsed.subtype !== 2 || !Array.isArray(parsed.data)) return;

      const [event] = parsed.data;

      if (event === 'connect:completed') {
        // 모든 VU가 거의 동시에 enqueue하여 burst 시뮬레이션
        enqueueSentAt = Date.now();
        socket.send(sioEvent('match:enqueue', [{}], nextAckId++));
        return;
      }

      if (event === 'match:found' && !matched) {
        matched = true;
        matchedCount.add(1);
        matchSuccessRate.add(1);
        matchWaitDuration.add(Date.now() - enqueueSentAt);
        return;
      }

      if (event === 'match:found' && matched) {
        // 이미 매칭된 상태에서 또 match:found가 온다면 중복 매칭 버그
        gameErrorCount.add(1);
        socket.close();
        return;
      }

      if (event === 'round:start') {
        // 빠르게 답안 제출하여 라운드 진행
        submitSentAt = Date.now();
        socket.setTimeout(() => {
          socket.send(sioEvent('submit:answer', [{ answer: 'A' }], nextAckId++));
        }, 500);
        return;
      }

      if (event === 'match:end') {
        gameEnded = true;
        gameCompleteCount.add(1);
        socket.close();
        return;
      }

      if (event === 'error') {
        gameErrorCount.add(1);
        socket.close();
        return;
      }
    });

    socket.on('error', () => {
      matchSuccessRate.add(0);
      gameErrorCount.add(1);
    });

    socket.on('close', () => {
      if (!matched) {
        unmatchedCount.add(1);
        matchSuccessRate.add(0);
      }
    });

    // 최대 2분 대기 (매칭 대기 + 게임 진행)
    socket.setTimeout(() => socket.close(), 120000);
  });

  check(null, {
    'burst: matched': () => matched,
    'burst: game ended': () => gameEnded,
  });
}

export function handleSummary(data) {
  const matched = data.metrics.matched_count?.values?.count || 0;
  const unmatched = data.metrics.unmatched_count?.values?.count || 0;
  const gamesComplete = data.metrics.burst_game_complete_count?.values?.count || 0;
  const errors = data.metrics.burst_game_error_count?.values?.count || 0;
  const expectedPairs = Math.floor(PLAYERS / 2);

  return {
    stdout: JSON.stringify({
      players: PLAYERS,
      matched,
      unmatched,
      expected_pairs: expectedPairs,
      actual_pairs: Math.floor(matched / 2),
      pair_mismatch: Math.floor(matched / 2) !== expectedPairs,
      games_complete: gamesComplete,
      errors,
      match_success_rate: data.metrics.burst_match_success_rate?.values?.rate,
      match_wait_p99_ms: data.metrics.burst_match_wait_ms?.values?.['p(99)'],
    }, null, 2),
  };
}
