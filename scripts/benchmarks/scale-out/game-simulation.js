/**
 * Phase 1-3: 게임 시뮬레이션 한계 측정
 *
 * connect → enqueue → match:found → round:ready → round:start
 *   → submit:answer → round:end → [다음 라운드...] → match:end
 *
 * VUS는 항상 짝수여야 한다 (2명이 1게임). 내부적으로 홀수/짝수 VU가 같은
 * 시간대에 enqueue하여 서로 매칭되도록 설계되어 있다.
 *
 * 실행:
 *   k6 run -e ROOMS=30 -e BASE_URL=ws://... \
 *           scripts/benchmarks/scale-out/game-simulation.js
 *
 *   # 게임 수 단계적 측정
 *   k6 run -e ROOMS=10  scripts/benchmarks/scale-out/game-simulation.js
 *   k6 run -e ROOMS=30  scripts/benchmarks/scale-out/game-simulation.js
 *   k6 run -e ROOMS=50  scripts/benchmarks/scale-out/game-simulation.js
 *
 * 사전 조건:
 *   - BENCH_GRADING_BYPASS=true 가 ECS 태스크에 설정돼 있어야 함
 *   - tokens.json 이 scripts/benchmarks/scale-out/ 에 존재해야 함 (sign-bench-tokens.mjs 생성)
 *
 * 관찰 지표:
 *   - games_active_total (Grafana)
 *   - bullmq_jobs_waiting / bullmq_jobs_failed
 *   - grading_duration_seconds p95 (bypass 모드에서는 거의 0)
 *   - ECS 메모리 사용량 (GameSessionManager in-memory)
 */
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import { SharedArray } from 'k6/data';

const BASE_URL = __ENV.BASE_URL || 'ws://csarena-alb-330901287.ap-northeast-2.elb.amazonaws.com';
const SOCKETIO_PATH = '/socket.io';
const SOCKETIO_NS = '/ws';

const ROOMS = Number(__ENV.ROOMS || 30);
const VUS = ROOMS * 2;
const DURATION = __ENV.DURATION || '5m';

const tokens = new SharedArray('bench-tokens', () =>
  JSON.parse(open('./tokens.json')),
);

const enqueueToMatchDuration = new Trend('enqueue_to_match_duration_ms', true);
const matchToRoundStartDuration = new Trend('match_to_round_start_duration_ms', true);
const submitAckDuration = new Trend('submit_ack_duration_ms', true);
const roundEndDuration = new Trend('round_end_duration_ms', true);

const gamesCompleted = new Counter('games_completed');
const roundsCompleted = new Counter('rounds_completed');
const lifecycleErrors = new Counter('lifecycle_errors');
const errorRate = new Rate('error_rate');

export const options = {
  scenarios: {
    game_pairs: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
      gracefulStop: '60s',
    },
  },
  thresholds: {
    submit_ack_duration_ms: ['p(95)<500', 'p(99)<1000'],
    enqueue_to_match_duration_ms: ['p(95)<10000'],
    error_rate: ['rate<0.05'],
  },
};

// Socket.IO v4 프로토콜 헬퍼
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
    return {
      subtype: Number(subtype),
      ackId: ackIdStr ? Number(ackIdStr) : undefined,
      data: JSON.parse(json),
    };
  } catch (_e) {
    return null;
  }
}

export default function () {
  const idx = (__VU - 1) % tokens.length;
  const { token } = tokens[idx];
  const url = `${BASE_URL}${SOCKETIO_PATH}/?EIO=4&transport=websocket`;

  let enqueueSentAt = null;
  let matchFoundAt = null;
  let roundStartAt = null;
  let submitSentAt = null;
  let nextAckId = 1;
  let gameEnded = false;
  let roundCount = 0;
  let hasError = false;

  ws.connect(url, null, function (socket) {
    socket.on('message', (raw) => {
      // Engine.IO open
      if (raw.startsWith('0')) {
        socket.send(`40${SOCKETIO_NS},${JSON.stringify({ token })}`);
        return;
      }

      // ping → pong
      if (raw === '2') {
        socket.send('3');
        return;
      }

      const parsed = parseSioMessage(raw);
      if (!parsed) return;

      if (parsed.subtype === 2 && Array.isArray(parsed.data)) {
        const [event] = parsed.data;

        if (event === 'connect:completed' && !enqueueSentAt) {
          enqueueSentAt = Date.now();
          socket.send(sioEvent('match:enqueue', [{}], nextAckId++));
          return;
        }

        if (event === 'match:found' && !matchFoundAt) {
          matchFoundAt = Date.now();
          enqueueToMatchDuration.add(matchFoundAt - enqueueSentAt);
          return;
        }

        if (event === 'round:start' && matchFoundAt) {
          const now = Date.now();
          if (!roundStartAt) {
            matchToRoundStartDuration.add(now - matchFoundAt);
          }
          roundStartAt = now;
          roundCount++;

          // 실유저 평균 사고 시간 ~3s 모사 후 답안 제출
          socket.setTimeout(() => {
            submitSentAt = Date.now();
            socket.send(sioEvent('submit:answer', [{ answer: 'A' }], nextAckId++));
          }, 3000);
          return;
        }

        if (event === 'round:end' && roundStartAt) {
          roundEndDuration.add(Date.now() - roundStartAt);
          roundsCompleted.add(1);
          roundStartAt = null;
          return;
        }

        if (event === 'match:end') {
          gamesCompleted.add(1);
          gameEnded = true;
          socket.close();
          return;
        }

        if (event === 'error') {
          hasError = true;
          lifecycleErrors.add(1);
          errorRate.add(1);
          socket.close();
          return;
        }
      }

      // ACK — submit:answer 응답
      if (parsed.subtype === 3 && submitSentAt) {
        submitAckDuration.add(Date.now() - submitSentAt);
        submitSentAt = null;
      }
    });

    socket.on('error', () => {
      hasError = true;
      lifecycleErrors.add(1);
      errorRate.add(1);
    });

    socket.on('close', () => {
      if (!gameEnded && !hasError && matchFoundAt) {
        // 매칭은 됐는데 게임이 완료되지 않은 경우
        lifecycleErrors.add(1);
        errorRate.add(1);
      } else if (!hasError) {
        errorRate.add(0);
      }
    });

    // 최대 대기 시간 — 5라운드 × (ready 5s + question 15s) + 여유 = 120s
    socket.setTimeout(() => socket.close(), 120000);
  });

  check(null, { 'game completed': () => gameEnded });

  // VU 간 enqueue 분산 (짝수/홀수 VU가 비슷한 시간에 입장하도록)
  sleep(0.5);
}

export function handleSummary(data) {
  return {
    stdout: JSON.stringify({
      games_completed: data.metrics.games_completed?.values?.count,
      rounds_completed: data.metrics.rounds_completed?.values?.count,
      enqueue_to_match_p95_ms: data.metrics.enqueue_to_match_duration_ms?.values?.['p(95)'],
      submit_ack_p95_ms: data.metrics.submit_ack_duration_ms?.values?.['p(95)'],
      error_rate: data.metrics.error_rate?.values?.rate,
    }, null, 2),
  };
}
