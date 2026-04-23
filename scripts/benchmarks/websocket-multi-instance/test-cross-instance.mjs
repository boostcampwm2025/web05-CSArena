/**
 * WebSocket 크로스 인스턴스 테스트
 *
 * 사용법:
 *   1. docker compose -f docker-compose-multi.yml up --build
 *   2. node scripts/benchmarks/websocket-multi-instance/test-cross-instance.mjs
 *
 * 또는 로컬 단일 인스턴스 테스트:
 *   1. Redis 실행: docker run -d -p 6379:6379 redis:7-alpine
 *   2. REDIS_HOST=localhost pnpm --filter backend run start:dev
 *   3. node scripts/benchmarks/websocket-multi-instance/test-cross-instance.mjs --single
 *
 * 필요 환경변수:
 *   TOKEN_1 - Player 1 JWT 토큰
 *   TOKEN_2 - Player 2 JWT 토큰
 *   (토큰이 없으면 더미 토큰으로 연결 시도합니다)
 */

import { io } from 'socket.io-client';

// ============================================================
// 설정
// ============================================================
const isSingle = process.argv.includes('--single');

// 멀티 인스턴스: nginx 라운드로빈 (80) 또는 직접 각 인스턴스에 연결
const INSTANCE_1_URL = process.env.INSTANCE_1_URL || (isSingle ? 'http://localhost:4000' : 'http://localhost:4001');
const INSTANCE_2_URL = process.env.INSTANCE_2_URL || (isSingle ? 'http://localhost:4000' : 'http://localhost:4002');
const NGINX_URL = process.env.NGINX_URL || 'http://localhost:80';

const TOKEN_1 = process.env.TOKEN_1 || 'test-token-player1';
const TOKEN_2 = process.env.TOKEN_2 || 'test-token-player2';

const TIMEOUT = 30000; // 30초 타임아웃

// ============================================================
// 유틸리티
// ============================================================
const log = (tag, msg) => console.log(`[${new Date().toISOString()}] [${tag}] ${msg}`);
const pass = (name) => console.log(`  ✅ ${name}`);
const fail = (name, err) => console.log(`  ❌ ${name}: ${err}`);
const section = (name) => console.log(`\n${'='.repeat(60)}\n  ${name}\n${'='.repeat(60)}`);

function createSocket(url, token) {
  return io(`${url}/ws`, {
    transports: ['websocket'],
    auth: { token },
    autoConnect: false,
    reconnection: false,
    timeout: 10000,
  });
}

function waitForEvent(socket, event, timeoutMs = TIMEOUT) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for '${event}' (${timeoutMs}ms)`));
    }, timeoutMs);

    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });

    socket.once('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Socket error: ${JSON.stringify(err)}`));
    });
  });
}

function waitForConnect(socket, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    if (socket.connected) {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      reject(new Error(`Connection timeout (${timeoutMs}ms)`));
    }, timeoutMs);

    socket.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });

    socket.once('connect_error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Connection error: ${err.message}`));
    });

    socket.connect();
  });
}

// ============================================================
// 테스트 1: 연결 테스트
// ============================================================
async function testConnection() {
  section('Test 1: 인스턴스 연결 테스트');

  const socket1 = createSocket(INSTANCE_1_URL, TOKEN_1);
  const socket2 = createSocket(INSTANCE_2_URL, TOKEN_2);

  try {
    // Player 1 → Instance 1
    await waitForConnect(socket1);
    pass(`Player 1 connected to ${INSTANCE_1_URL}`);

    const completed1 = await waitForEvent(socket1, 'connect:completed', 5000);
    pass('Player 1 received connect:completed');

    // Player 2 → Instance 2
    await waitForConnect(socket2);
    pass(`Player 2 connected to ${INSTANCE_2_URL}`);

    const completed2 = await waitForEvent(socket2, 'connect:completed', 5000);
    pass('Player 2 received connect:completed');

    // 디버그: 모든 이벤트 로깅
    socket1.onAny((event, ...args) => {
      log('P1:EVENT', `${event} ${JSON.stringify(args).slice(0, 100)}`);
    });
    socket2.onAny((event, ...args) => {
      log('P2:EVENT', `${event} ${JSON.stringify(args).slice(0, 100)}`);
    });

    return { socket1, socket2 };
  } catch (err) {
    fail('Connection', err.message);
    socket1.disconnect();
    socket2.disconnect();
    return null;
  }
}

// ============================================================
// 테스트 2: 크로스 인스턴스 매칭
// ============================================================
async function testCrossInstanceMatching(socket1, socket2) {
  section('Test 2: 크로스 인스턴스 매칭 테스트');

  // ⚠️ 매칭 후 이어지는 게임 이벤트(round:ready/start)도 match:found 직후 즉시 도달하므로,
  //    Test 3에서 리스너를 등록하면 이미 발행된 이벤트를 놓친다.
  //    여기서 미리 Promise로 예약해 Test 3에게 전달한다.
  const gameEvents = {
    ready1: waitForEvent(socket1, 'round:ready', 15000),
    ready2: waitForEvent(socket2, 'round:ready', 15000),
    start1: waitForEvent(socket1, 'round:start', 15000),
    start2: waitForEvent(socket2, 'round:start', 15000),
  };

  try {
    // 이벤트 리스너를 먼저 등록 (매칭이 즉시 발생할 수 있으므로)
    const matchFoundPromise1 = waitForEvent(socket1, 'match:found', 15000);
    const matchFoundPromise2 = waitForEvent(socket2, 'match:found', 15000);

    // Player 1 enqueue
    socket1.emit('match:enqueue', {}, (response) => {
      if (response.ok) {
        log('P1', `Enqueued (sessionId: ${response.sessionId})`);
      } else {
        log('P1', `Enqueue failed: ${response.error}`);
      }
    });

    // Player 2 enqueue (약간의 딜레이로 Player 1이 큐에 먼저 들어가게)
    await new Promise(r => setTimeout(r, 1000));
    socket2.emit('match:enqueue', {}, (response) => {
      if (response.ok) {
        log('P2', `Enqueued (sessionId: ${response.sessionId})`);
      } else {
        log('P2', `Enqueue failed: ${response.error}`);
      }
    });

    // 매칭 대기 (폴링 간격 5초 + 여유)
    log('WAIT', 'Waiting for match (polling interval: 5s)...');

    const [match1, match2] = await Promise.all([matchFoundPromise1, matchFoundPromise2]);

    pass(`Player 1 matched! Opponent: ${match1.opponent?.nickname || 'unknown'}`);
    pass(`Player 2 matched! Opponent: ${match2.opponent?.nickname || 'unknown'}`);

    return { ok: true, gameEvents };
  } catch (err) {
    fail('Cross-instance matching', err.message);
    return { ok: false };
  }
}

// ============================================================
// 테스트 3: 게임 플레이 (이벤트 수신 확인)
// ============================================================
async function testGamePlay(socket1, socket2, gameEvents) {
  section('Test 3: 게임 이벤트 수신 테스트');

  try {
    // round:ready/start 리스너는 Test 2에서 미리 등록된 Promise를 재사용
    // (match:found 직후 이벤트가 즉시 발행되므로 이 시점에 등록하면 놓침)
    const [ready1] = await Promise.all([gameEvents.ready1, gameEvents.ready2]);
    pass(`Round ready received (duration: ${ready1.durationSec}s)`);

    const [start1] = await Promise.all([gameEvents.start1, gameEvents.start2]);
    pass(`Round started! Question type: ${start1.question?.type || 'unknown'}`);

    // ⚠️ 리스너를 emit 전에 먼저 등록 — 백엔드가 ack 반환 전에 opponent:submitted를 emit하므로
    //    리스너 등록이 emit 이후면 이벤트를 놓쳐 타임아웃으로 실패한다
    const opponentSubmittedPromise = waitForEvent(socket2, 'opponent:submitted', 10000);

    // Player 1 답안 제출 — Socket.IO의 .timeout()으로 CI hang 방지
    const submitPromise = new Promise((resolve, reject) => {
      socket1.timeout(5000).emit('submit:answer', { answer: 'test-answer' }, (err, response) => {
        if (err) {
          reject(new Error('submit:answer ack timeout (5s)'));
          return;
        }
        if (response?.ok) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'submit failed'));
        }
      });
    });

    const submitResult = await submitPromise;
    pass('Player 1 submitted answer');

    await opponentSubmittedPromise;
    pass('Player 2 received opponent:submitted (cross-instance event delivery confirmed!)');

    // Player 2도 답안 제출
    const submit2Promise = new Promise((resolve, reject) => {
      socket2.timeout(5000).emit('submit:answer', { answer: 'test-answer-2' }, (err, response) => {
        if (err) {
          reject(new Error('submit:answer ack timeout (5s)'));
          return;
        }
        if (response?.ok) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'submit failed'));
        }
      });
    });

    await submit2Promise;
    pass('Player 2 submitted answer');

    // round:end 수신 확인
    const end1Promise = waitForEvent(socket1, 'round:end', 15000);
    const end2Promise = waitForEvent(socket2, 'round:end', 15000);

    const [end1, end2] = await Promise.all([end1Promise, end2Promise]);
    pass(`Round ended! P1 score: ${end1.results?.my?.total}, P2 score: ${end2.results?.my?.total}`);

    return true;
  } catch (err) {
    fail('Game play', err.message);
    return false;
  }
}

// ============================================================
// 테스트 4: 연결 끊김 시 상대방 알림
// ============================================================
async function testDisconnectNotification(socket1, socket2) {
  section('Test 4: 연결 끊김 알림 테스트');

  try {
    // 다음 라운드 대기
    const ready = await waitForEvent(socket1, 'round:ready', 20000).catch(() => null);

    if (!ready) {
      log('SKIP', 'No next round — game may have ended');
      return true;
    }

    // Player 1 강제 연결 해제
    const disconnectPromise = waitForEvent(socket2, 'opponent:disconnected', 10000);

    socket1.disconnect();
    log('P1', 'Disconnected forcefully');

    const disconnectEvent = await disconnectPromise;
    pass(`Player 2 received opponent:disconnected (winner: ${disconnectEvent.winnerId})`);

    // match:end 수신 확인
    const matchEnd = await waitForEvent(socket2, 'match:end', 10000);
    pass(`Player 2 received match:end (win: ${matchEnd.isWin}, tierChange: ${matchEnd.tierPointChange})`);

    return true;
  } catch (err) {
    fail('Disconnect notification', err.message);
    return false;
  }
}

// ============================================================
// 테스트 5: Redis 연결 확인 (직접 확인용)
// ============================================================
async function testRedisKeys() {
  section('Test 5: Redis 키 확인 가이드');

  console.log(`
  다음 명령어로 Redis 상태를 확인하세요:

  # Redis 컨테이너에 접속
  docker exec -it web05-redis-multi redis-cli

  # 매칭 큐 확인
  ZRANGEBYSCORE matchmaking:queue -inf +inf WITHSCORES

  # 매칭 세션 키 확인
  KEYS mm:*

  # 게임 커맨드 채널 구독 모니터링
  SUBSCRIBE game:commands

  # 매치 락 확인
  KEYS match:lock:*

  # 전체 키 목록
  KEYS *
  `);
}

// ============================================================
// 메인 실행
// ============================================================
async function main() {
  console.log(`
╔══════════════════════════════════════════════════╗
║  CSArena WebSocket 크로스 인스턴스 테스트        ║
╠══════════════════════════════════════════════════╣
║  Instance 1: ${INSTANCE_1_URL.padEnd(35)}║
║  Instance 2: ${INSTANCE_2_URL.padEnd(35)}║
║  Mode: ${(isSingle ? 'Single Instance' : 'Multi Instance').padEnd(42)}║
╚══════════════════════════════════════════════════╝
  `);

  let socket1, socket2;
  let results = { pass: 0, fail: 0 };

  try {
    // Test 1: 연결
    const connections = await testConnection();
    if (!connections) {
      console.log('\n⚠️  연결 실패 — 서버가 실행 중인지 확인하세요.');
      console.log('  docker compose -f docker-compose-multi.yml up --build');
      process.exit(1);
    }
    socket1 = connections.socket1;
    socket2 = connections.socket2;
    results.pass++;

    // Test 2: 크로스 인스턴스 매칭 — 이후 게임 이벤트 리스너를 미리 예약해 반환
    const matchResult = await testCrossInstanceMatching(socket1, socket2);
    matchResult.ok ? results.pass++ : results.fail++;

    if (matchResult.ok) {
      // Test 3: 게임 플레이 — Test 2에서 예약한 이벤트 Promise 재사용
      const played = await testGamePlay(socket1, socket2, matchResult.gameEvents);
      played ? results.pass++ : results.fail++;

      // Test 4: 연결 끊김
      if (played) {
        const disconnected = await testDisconnectNotification(socket1, socket2);
        disconnected ? results.pass++ : results.fail++;
      }
    }

    // Test 5: Redis 키 가이드
    await testRedisKeys();

  } catch (err) {
    console.error('\n💥 Unexpected error:', err);
    results.fail++;
  } finally {
    if (socket1?.connected) socket1.disconnect();
    if (socket2?.connected) socket2.disconnect();

    section('테스트 결과');
    console.log(`  통과: ${results.pass}`);
    console.log(`  실패: ${results.fail}`);
    console.log(`  총계: ${results.pass + results.fail}`);

    process.exit(results.fail > 0 ? 1 : 0);
  }
}

main();
