/**
 * 부하 한계 측정 — 동시 활성 룸 수를 단계적으로 올리며 한계점 탐색
 *
 * 시나리오 (옵션 ① — 단일 라운드 단축):
 *   connect → CONNECT(/ws,token) → connect:completed → match:enqueue
 *     → match:found → round:ready → round:start → submit:answer
 *     → round:result → close
 *
 * 한 게임의 활성 시간 ≈ 5s(ready) + 10s(question) ≈ 15~16s.
 * `vus = 2 × ROOMS` 로 정상상태 ~ROOMS개 룸을 유지한다.
 *
 * 한계 정의 (사후 분석 시 확인):
 *   - match_to_round_start_duration p99 > 200ms
 *   - process_event_loop_utilization > 0.85 (사이드카에서 별도 수집)
 *   - 컨테이너 OOM (docker stats / kernel log)
 *
 * 실행:
 *   cd scripts/benchmarks/load-limit
 *   k6 run -e ROOMS=50  load-test-rooms.js   # 1단계
 *   k6 run -e ROOMS=100 load-test-rooms.js   # 2단계
 *   k6 run -e ROOMS=200 load-test-rooms.js   # 3단계
 *   k6 run -e ROOMS=500 load-test-rooms.js   # 4단계
 *
 * 주의:
 *   - tokens.json은 scripts/benchmarks/websocket-multi-instance/sign-bench-tokens.mjs로
 *     선행 생성. ROOMS=500이면 1000명 이상의 시드 유저 필요.
 *   - BENCH_GRADING_BYPASS=true 가 backend에 설정돼 있어야 함
 *     (scripts/benchmarks/load-limit/docker-compose.*.yml 가 자동 주입).
 */
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// ============================================================
// 설정
// ============================================================
const NGINX_URL = __ENV.NGINX_URL || 'ws://localhost:8080';
const SOCKETIO_PATH = '/socket.io';
const SOCKETIO_NS = '/ws';

const ROOMS = Number(__ENV.ROOMS || 50);
const VUS = ROOMS * 2; // 한 룸 = 2 플레이어
const DURATION = __ENV.DURATION || '2m';

// tokens.json 은 websocket-multi-instance와 공유
const tokens = new SharedArray('bench-tokens', () =>
  JSON.parse(open('../websocket-multi-instance/tokens.json')),
);

// ============================================================
// k6 메트릭 — 한계 정의에 사용되는 핵심 latency 위주
// ============================================================
const matchToRoundStartDuration = new Trend('match_to_round_start_duration', true);
const enqueueToMatchFoundDuration = new Trend('enqueue_to_match_found_duration', true);
const submitAckDuration = new Trend('submit_ack_duration', true);
const roundResultDuration = new Trend('round_result_duration', true);

const roomsEstablished = new Counter('rooms_established');
const roundsReached = new Counter('rounds_reached');
const submitsCompleted = new Counter('submits_completed');
const lifecycleErrors = new Counter('lifecycle_errors');
const errorRate = new Rate('errors');

// ============================================================
// k6 옵션 — constant-vus로 정상상태 유지
// ============================================================
export const options = {
  scenarios: {
    rooms_steady: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
      gracefulStop: '30s',
    },
  },
  thresholds: {
    // 한계 정의: round 진입 p99 200ms 초과 시 fail 표시
    match_to_round_start_duration: ['p(99)<200', 'p(95)<150'],
    enqueue_to_match_found_duration: ['p(95)<500'],
    errors: ['rate<0.05'],
  },
};

// ============================================================
// Socket.IO v4 프로토콜 헬퍼
// ============================================================
function sioEvent(name, args, ackId) {
  const payload = JSON.stringify([name, ...args]);
  const ackStr = ackId !== undefined ? String(ackId) : '';
  return `42${SOCKETIO_NS},${ackStr}${payload}`;
}

function parseSioMessage(raw) {
  const m = raw.match(/^4(\d)(\/\w+)?,(\d+)?(.+)$/);
  if (!m) return null;
  const [, subtype, ns, ackIdStr, json] = m;
  try {
    return {
      subtype: Number(subtype),
      ns: ns || '/',
      ackId: ackIdStr ? Number(ackIdStr) : undefined,
      data: JSON.parse(json),
    };
  } catch (_e) {
    return null;
  }
}

// ============================================================
// 메인 VU 루프
// ============================================================
export default function () {
  const idx = (__VU - 1) % tokens.length;
  const { token } = tokens[idx];
  const url = `${NGINX_URL}${SOCKETIO_PATH}/?EIO=4&transport=websocket`;

  let enqueueSentAt = null;
  let matchFoundAt = null;
  let roundStartAt = null;
  let submitSentAt = null;
  let nextAckId = 1;
  let submitAckPending = false;

  ws.connect(url, null, function (socket) {
    socket.on('message', (raw) => {
      // Engine.IO open → Socket.IO CONNECT
      if (raw.startsWith('0')) {
        socket.send(`40${SOCKETIO_NS},${JSON.stringify({ token })}`);
        return;
      }

      // CONNECT 승인 — connect:completed 이벤트 대기
      if (raw.startsWith('40')) return;

      // ping → pong
      if (raw === '2') {
        socket.send('3');
        return;
      }

      const parsed = parseSioMessage(raw);
      if (!parsed) return;

      // EVENT
      if (parsed.subtype === 2 && Array.isArray(parsed.data)) {
        const [event, payload] = parsed.data;

        if (event === 'connect:completed' && enqueueSentAt === null) {
          enqueueSentAt = Date.now();
          socket.send(sioEvent('match:enqueue', [{}], nextAckId++));
          return;
        }

        if (event === 'match:found' && !matchFoundAt) {
          matchFoundAt = Date.now();
          enqueueToMatchFoundDuration.add(matchFoundAt - enqueueSentAt);
          roomsEstablished.add(1);
          return;
        }

        if (event === 'round:start' && !roundStartAt && matchFoundAt) {
          roundStartAt = Date.now();
          matchToRoundStartDuration.add(roundStartAt - matchFoundAt);
          roundsReached.add(1);
          // 짧은 사고 시간 후 답안 제출 (실유저 평균 ~3s 모사)
          submitSentAt = Date.now();
          submitAckPending = true;
          socket.send(sioEvent('submit:answer', [{ answer: 'A' }], nextAckId++));
          return;
        }

        if (event === 'round:result' && roundStartAt) {
          roundResultDuration.add(Date.now() - roundStartAt);
          submitsCompleted.add(1);
          // 한 라운드만 시뮬레이션 — 종료
          socket.close();
          return;
        }
      }

      // ACK — submit:answer 응답
      if (parsed.subtype === 3 && submitAckPending && submitSentAt) {
        submitAckDuration.add(Date.now() - submitSentAt);
        submitAckPending = false;
      }
    });

    socket.on('error', () => {
      lifecycleErrors.add(1);
      errorRate.add(1);
    });

    socket.on('close', () => {
      // round:start까지 도달 못 하면 라이프사이클 실패로 기록
      if (!roundStartAt) {
        lifecycleErrors.add(1);
        errorRate.add(1);
      }
    });

    // 안전 timeout — 30s (ready 5 + question 10 + 여유)
    socket.setTimeout(() => socket.close(), 30000);
  });

  check(null, { 'iteration completed': () => true });

  // VU 간 enqueue race 분산용 짧은 휴식 (정상상태 룸 수 안정화)
  sleep(1);
}
