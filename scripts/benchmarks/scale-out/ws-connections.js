/**
 * Phase 1-2: WebSocket 연결 한계 측정
 *
 * Socket.IO WebSocket 연결만 유지하면서 연결 수 한계를 확인한다.
 * 게임 진행 없이 CONNECT만 유지하여 연결 수 대비 메모리 증가를 측정한다.
 *
 * 실행:
 *   # tokens.json 사전 생성 필요 (scripts/benchmarks/scale-out/README.md 참고)
 *   k6 run -e BASE_URL=ws://csarena-alb-330901287.ap-northeast-2.elb.amazonaws.com \
 *           scripts/benchmarks/scale-out/ws-connections.js
 *
 *   # 최대 연결 수 지정 (기본 500)
 *   k6 run -e MAX_VUS=300 scripts/benchmarks/scale-out/ws-connections.js
 *
 * 사전 조건:
 *   - tokens.json 이 scripts/benchmarks/scale-out/ 에 존재해야 함 (sign-bench-tokens.mjs 생성)
 *
 * 관찰 지표:
 *   - websocket_connections_active (Grafana game-server 대시보드)
 *   - nodejs_heap_used_bytes 증가 추이
 *   - 연결 실패율 (connected_rate)
 */
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';

const BASE_URL = __ENV.BASE_URL || 'ws://csarena-alb-330901287.ap-northeast-2.elb.amazonaws.com';
const SOCKETIO_PATH = '/socket.io';
const SOCKETIO_NS = '/ws';
const MAX_VUS = Number(__ENV.MAX_VUS || 500);
const HOLD_DURATION_S = Number(__ENV.HOLD_DURATION_S || 60);

const tokens = new SharedArray('bench-tokens', () =>
  JSON.parse(open('./tokens.json')),
);

const connectedCount = new Counter('ws_connected');
const connectedRate = new Rate('ws_connect_rate');
const connectDuration = new Trend('ws_connect_duration_ms', true);

export const options = {
  scenarios: {
    ws_ramp: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '2m', target: Math.floor(MAX_VUS * 0.2) },
        { duration: '3m', target: Math.floor(MAX_VUS * 0.6) },
        { duration: '3m', target: MAX_VUS },
        { duration: '2m', target: 0 },
      ],
      gracefulStop: '30s',
    },
  },
  thresholds: {
    ws_connect_rate: ['rate>0.95'],
  },
};

export default function () {
  const idx = (__VU - 1) % tokens.length;
  const { token } = tokens[idx];
  const url = `${BASE_URL}${SOCKETIO_PATH}/?EIO=4&transport=websocket`;

  const connectStart = Date.now();
  let connected = false;

  ws.connect(url, null, function (socket) {
    socket.on('message', (raw) => {
      if (raw.startsWith('0')) {
        socket.send(`40${SOCKETIO_NS},${JSON.stringify({ token })}`);
        return;
      }

      if (raw.startsWith(`40${SOCKETIO_NS}`)) {
        connected = true;
        connectDuration.add(Date.now() - connectStart);
        connectedCount.add(1);
        connectedRate.add(1);
        return;
      }

      if (raw === '2') {
        socket.send('3');
        return;
      }
    });

    socket.on('error', () => {
      connectedRate.add(0);
    });

    // HOLD_DURATION_S 동안 연결 유지 후 종료
    socket.setTimeout(() => socket.close(), HOLD_DURATION_S * 1000);
  });

  check(null, { 'connected': () => connected });
}
