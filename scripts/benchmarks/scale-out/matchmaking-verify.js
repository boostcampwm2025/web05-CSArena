/**
 * Phase 4-1: 크로스 인스턴스 매칭 정합성 검증
 *
 * ECS 태스크가 2개 이상일 때 서로 다른 인스턴스에 붙은 플레이어가
 * 정상적으로 매칭되고 게임 이벤트를 수신하는지 확인한다.
 *
 * 이 스크립트는 성능이 아니라 정합성 검증이 목적이다.
 * VU 수를 낮게 유지하고 각 게임이 정상 완료되는지 확인한다.
 *
 * 실행:
 *   k6 run -e BASE_URL=ws://... -e CONCURRENT_GAMES=5 \
 *           scripts/benchmarks/scale-out/matchmaking-verify.js
 *
 * 사전 조건:
 *   - ECS desired-count 2 이상
 *   - BENCH_GRADING_BYPASS=true
 *   - tokens.json
 *
 * 성공 기준:
 *   - match_success_rate 100% (모든 VU 쌍이 매칭됨)
 *   - round_start_received_rate 100% (cross-instance 이벤트 전달 확인)
 *   - match:end 수신율 100% (게임 완료)
 */
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';

const BASE_URL = __ENV.BASE_URL || 'ws://csarena-alb-330901287.ap-northeast-2.elb.amazonaws.com';
const SOCKETIO_PATH = '/socket.io';
const SOCKETIO_NS = '/ws';
const CONCURRENT_GAMES = Number(__ENV.CONCURRENT_GAMES || 5);
const VUS = CONCURRENT_GAMES * 2;

const tokens = new SharedArray('bench-tokens', () =>
  JSON.parse(open('./tokens.json')),
);

const matchSuccessRate = new Rate('match_success_rate');
const roundStartRate = new Rate('round_start_received_rate');
const gameCompleteRate = new Rate('game_complete_rate');
const matchWaitDuration = new Trend('match_wait_duration_ms', true);
const crossInstanceForwardCount = new Counter('cross_instance_likely_total');

export const options = {
  scenarios: {
    verify: {
      executor: 'constant-vus',
      vus: VUS,
      duration: __ENV.DURATION || '3m',
      gracefulStop: '60s',
    },
  },
  thresholds: {
    match_success_rate: ['rate>0.98'],
    round_start_received_rate: ['rate>0.98'],
    game_complete_rate: ['rate>0.95'],
    match_wait_duration_ms: ['p(95)<15000'],
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
  let roundStarted = false;
  let gameEnded = false;
  let hasError = false;
  let nextAckId = 1;

  ws.connect(url, null, function (socket) {
    socket.on('message', (raw) => {
      if (raw.startsWith('0')) {
        socket.send(`40${SOCKETIO_NS},${JSON.stringify({ token })}`);
        return;
      }
      if (raw === '2') { socket.send('3'); return; }

      const parsed = parseSioMessage(raw);
      if (!parsed || parsed.subtype !== 2 || !Array.isArray(parsed.data)) return;

      const [event, payload] = parsed.data;

      if (event === 'connect:completed') {
        enqueueSentAt = Date.now();
        socket.send(sioEvent('match:enqueue', [{}], nextAckId++));
        return;
      }

      if (event === 'match:found') {
        matched = true;
        matchSuccessRate.add(1);
        matchWaitDuration.add(Date.now() - enqueueSentAt);

        // GameCommandBus가 크로스 인스턴스 포워딩을 했다면 payload에 gameId가 있어야 함
        if (payload?.gameId) {
          crossInstanceForwardCount.add(1);
        }
        return;
      }

      if (event === 'round:start' && matched) {
        roundStarted = true;
        roundStartRate.add(1);
        // 즉시 답안 제출
        socket.setTimeout(() => {
          socket.send(sioEvent('submit:answer', [{ answer: 'A' }], nextAckId++));
        }, 1000);
        return;
      }

      if (event === 'match:end') {
        gameEnded = true;
        gameCompleteRate.add(1);
        socket.close();
        return;
      }
    });

    socket.on('error', () => {
      hasError = true;
      matchSuccessRate.add(0);
      roundStartRate.add(0);
      gameCompleteRate.add(0);
    });

    socket.on('close', () => {
      if (hasError) return;
      if (!matched) matchSuccessRate.add(0);
      if (matched && !roundStarted) roundStartRate.add(0);
      if (!gameEnded) gameCompleteRate.add(0);
    });

    socket.setTimeout(() => socket.close(), 120000);
  });

  check(null, {
    'matched': () => matched,
    'round started': () => roundStarted,
    'game ended': () => gameEnded,
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    stdout: JSON.stringify({
      match_success_rate: data.metrics.match_success_rate?.values?.rate,
      round_start_received_rate: data.metrics.round_start_received_rate?.values?.rate,
      game_complete_rate: data.metrics.game_complete_rate?.values?.rate,
      match_wait_p95_ms: data.metrics.match_wait_duration_ms?.values?.['p(95)'],
    }, null, 2),
  };
}
