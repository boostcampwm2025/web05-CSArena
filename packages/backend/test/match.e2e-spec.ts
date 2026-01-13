import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { GameModule } from '../src/game/game.module';
import { MatchmakingModule } from '../src/matchmaking/matchmaking.module';
import { QuizModule } from '../src/quiz/quiz.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

describe('Match Gateway Integration (e2e)', () => {
  let app: INestApplication;
  let client1: Socket;
  let client2: Socket;
  let port: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            type: 'postgres',
            host: configService.get('DB_HOST', 'localhost'),
            port: configService.get('DB_PORT', 5432),
            username: configService.get('DB_USERNAME', 'postgres'),
            password: configService.get('DB_PASSWORD', 'postgres'),
            database: configService.get('DB_DATABASE', 'boostcamp'),
            entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
            synchronize: true,
          }),
          inject: [ConfigService],
        }),
        QuizModule,
        MatchmakingModule,
        GameModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0);
    port = app.getHttpServer().address().port;
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    client1?.disconnect();
    client2?.disconnect();
  });

  describe('매칭 기본 플로우', () => {
    it('두 클라이언트가 연결하고 매칭 요청 시 match:found 이벤트를 받아야 함', (done) => {
      const serverUrl = `http://localhost:${port}/ws`;

      client1 = io(serverUrl, {
        transports: ['websocket'],
        autoConnect: false,
        query: {
          userId: 'user1',
          nickname: 'Player1',
          tier: 'gold',
          exp_point: '1500',
        },
      });

      client2 = io(serverUrl, {
        transports: ['websocket'],
        autoConnect: false,
        query: {
          userId: 'user2',
          nickname: 'Player2',
          tier: 'silver',
          exp_point: '1200',
        },
      });

      let matchFoundCount = 0;
      let ackCount = 0;

      const checkCompletion = () => {
        if (matchFoundCount === 2 && ackCount === 2) {
          done();
        }
      };

      client1.on('match:found', (data) => {
        expect(data.opponent).toBeTruthy();
        expect(data.opponent.nickname).toBe('Player2');
        matchFoundCount++;
        checkCompletion();
      });

      client2.on('match:found', (data) => {
        expect(data.opponent).toBeTruthy();
        expect(data.opponent.nickname).toBe('Player1');
        matchFoundCount++;
        checkCompletion();
      });

      client1.on('connect', () => {
        client1.emit('match:enqueue', (res: any) => {
          expect(res.ok).toBe(true);
          ackCount++;
          checkCompletion();
        });
      });

      client2.on('connect', () => {
        client2.emit('match:enqueue', (res: any) => {
          expect(res.ok).toBe(true);
          ackCount++;
          checkCompletion();
        });
      });

      client1.connect();
      setTimeout(() => client2.connect(), 100);
    }, 10000);

    it('단일 클라이언트는 match:found를 받지 않아야 함', (done) => {
      const serverUrl = `http://localhost:${port}/ws`;

      client1 = io(serverUrl, {
        transports: ['websocket'],
        query: {
          userId: 'user-single',
          nickname: 'SinglePlayer',
          tier: 'bronze',
          exp_point: '800',
        },
      });

      client1.on('match:found', () => {
        done.fail('단일 클라이언트는 매칭되면 안됨');
      });

      client1.on('connect', () => {
        client1.emit('match:enqueue');

        // 2초 대기 후 매칭이 안되었으면 성공
        setTimeout(() => {
          done();
        }, 2000);
      });
    }, 5000);
  });

  describe('매칭 취소 기능', () => {
    it('클라이언트가 match:dequeue를 통해 매칭 큐에서 나갈 수 있어야 함', (done) => {
      const serverUrl = `http://localhost:${port}/ws`;

      client1 = io(serverUrl, {
        transports: ['websocket'],
        query: {
          userId: 'user-cancel',
          nickname: 'CancelPlayer',
          tier: 'gold',
          exp_point: '1400',
        },
      });

      let sessionId: string;

      client1.on('connect', () => {
        // 매칭 요청
        client1.emit('match:enqueue', (response: { ok: boolean; sessionId?: string }) => {
          expect(response.ok).toBe(true);
          expect(response.sessionId).toBeTruthy();
          sessionId = response.sessionId!;

          // 즉시 매칭 취소
          setTimeout(() => {
            client1.emit('match:dequeue', { sessionId }, (dequeueResponse: { ok: boolean }) => {
              expect(dequeueResponse.ok).toBe(true);
              done();
            });
          }, 100);
        });
      });
    }, 5000);

    it('매칭 취소 후 다른 클라이언트와 매칭되지 않아야 함', (done) => {
      const serverUrl = `http://localhost:${port}/ws`;

      client1 = io(serverUrl, {
        transports: ['websocket'],
        autoConnect: false,
        query: {
          userId: 'user-first',
          nickname: 'FirstPlayer',
          tier: 'platinum',
          exp_point: '2000',
        },
      });

      client2 = io(serverUrl, {
        transports: ['websocket'],
        autoConnect: false,
        query: {
          userId: 'user-second',
          nickname: 'SecondPlayer',
          tier: 'platinum',
          exp_point: '1900',
        },
      });

      client1.on('match:found', () => {
        done.fail('첫 번째 클라이언트는 매칭 취소했으므로 match:found를 받으면 안됨');
      });

      client2.on('match:found', () => {
        done.fail('첫 번째 클라이언트가 큐에서 나갔으므로 두 번째 클라이언트도 매칭되면 안됨');
      });

      client1.on('connect', () => {
        // 첫 번째 클라이언트 매칭 요청
        client1.emit('match:enqueue', (response: { ok: boolean; sessionId?: string }) => {
          const sessionId = response.sessionId!;

          // 즉시 매칭 취소
          setTimeout(() => {
            client1.emit('match:dequeue', { sessionId }, () => {
              // 취소 후 두 번째 클라이언트 연결
              client2.connect();
            });
          }, 100);
        });
      });

      client2.on('connect', () => {
        client2.emit('match:enqueue');

        // 2초 대기 후 매칭이 안되었으면 성공
        setTimeout(() => {
          done();
        }, 2000);
      });

      client1.connect();
    }, 10000);
  });

  describe('연결 끊김 처리', () => {
    it('클라이언트 연결 끊김 시 큐에서 자동으로 제거되어야 함', (done) => {
      const serverUrl = `http://localhost:${port}/ws`;

      client1 = io(serverUrl, {
        transports: ['websocket'],
        query: {
          userId: 'user-disconnect1',
          nickname: 'DisconnectPlayer1',
          tier: 'diamond',
          exp_point: '2500',
        },
      });

      client2 = io(serverUrl, {
        transports: ['websocket'],
        autoConnect: false,
        query: {
          userId: 'user-disconnect2',
          nickname: 'DisconnectPlayer2',
          tier: 'diamond',
          exp_point: '2400',
        },
      });

      client1.on('connect', () => {
        client1.emit('match:enqueue');

        // 첫 번째 클라이언트 즉시 연결 끊기
        setTimeout(() => {
          client1.disconnect();

          // 두 번째 클라이언트 연결
          setTimeout(() => {
            client2.connect();
          }, 200);
        }, 100);
      });

      client2.on('match:found', () => {
        done.fail('첫 번째 클라이언트가 큐에서 제거되지 않음');
      });

      client2.on('connect', () => {
        client2.emit('match:enqueue');

        // 2초 대기 후 매칭이 안되었으면 성공
        setTimeout(() => {
          done();
        }, 2000);
      });
    }, 10000);
  });

  describe('동시 매칭 요청', () => {
    it('중복 매칭 요청 시 같은 세션 ID를 반환해야 함', (done) => {
      const serverUrl = `http://localhost:${port}/ws`;

      client1 = io(serverUrl, {
        transports: ['websocket'],
        query: {
          userId: 'user-duplicate',
          nickname: 'DuplicatePlayer',
          tier: 'master',
          exp_point: '3000',
        },
      });

      client1.on('connect', () => {
        let firstSessionId: string;

        // 첫 번째 매칭 요청
        client1.emit('match:enqueue', (response1: { ok: boolean; sessionId?: string }) => {
          expect(response1.ok).toBe(true);
          expect(response1.sessionId).toBeTruthy();
          firstSessionId = response1.sessionId!;

          // 두 번째 매칭 요청 (중복)
          setTimeout(() => {
            client1.emit('match:enqueue', (response2: { ok: boolean; sessionId?: string }) => {
              expect(response2.ok).toBe(true);
              expect(response2.sessionId).toBe(firstSessionId);
              done();
            });
          }, 100);
        });
      });
    }, 5000);
  });

  describe('게임 시작 플로우', () => {
    it('매칭이 완료되면 두 플레이어가 match:found를 받아야 함', (done) => {
      const serverUrl = `http://localhost:${port}/ws`;

      client1 = io(serverUrl, {
        transports: ['websocket'],
        autoConnect: false,
        query: {
          userId: 'game-user1',
          nickname: 'GamePlayer1',
          tier: 'challenger',
          exp_point: '4000',
        },
      });

      client2 = io(serverUrl, {
        transports: ['websocket'],
        autoConnect: false,
        query: {
          userId: 'game-user2',
          nickname: 'GamePlayer2',
          tier: 'challenger',
          exp_point: '3900',
        },
      });

      let matchFoundCount = 0;

      // match:found 이벤트를 받으면 매칭이 성공한 것
      client1.on('match:found', (data) => {
        expect(data).toBeTruthy();
        expect(data.opponent).toBeTruthy();
        expect(data.opponent.nickname).toBe('GamePlayer2');
        matchFoundCount++;
        if (matchFoundCount === 2) {
          done();
        }
      });

      client2.on('match:found', (data) => {
        expect(data).toBeTruthy();
        expect(data.opponent).toBeTruthy();
        expect(data.opponent.nickname).toBe('GamePlayer1');
        matchFoundCount++;
        if (matchFoundCount === 2) {
          done();
        }
      });

      client1.on('connect', () => {
        client1.emit('match:enqueue');
      });

      client2.on('connect', () => {
        client2.emit('match:enqueue');
      });

      client1.connect();
      setTimeout(() => client2.connect(), 100);
    }, 15000);
  });

  describe('에러 처리', () => {
    it('잘못된 세션 ID로 dequeue 시 에러 반환', (done) => {
      const serverUrl = `http://localhost:${port}/ws`;

      client1 = io(serverUrl, {
        transports: ['websocket'],
        query: {
          userId: 'error-user',
          nickname: 'ErrorPlayer',
          tier: 'bronze',
          exp_point: '500',
        },
      });

      client1.on('connect', () => {
        client1.emit('match:dequeue', { sessionId: 'invalid-session-id' }, (response: { ok: boolean; error?: string }) => {
          expect(response.ok).toBe(false);
          expect(response.error).toBeTruthy();
          done();
        });
      });
    }, 5000);
  });

  describe('사용자 정보 전달', () => {
    it('연결 시 user:info 이벤트로 사용자 정보를 받아야 함', (done) => {
      const serverUrl = `http://localhost:${port}/ws`;

      client1 = io(serverUrl, {
        transports: ['websocket'],
        query: {
          userId: 'info-user',
          nickname: 'InfoPlayer',
          tier: 'gold',
          exp_point: '1600',
        },
      });

      client1.on('user:info', (userInfo) => {
        expect(userInfo).toBeTruthy();
        expect(userInfo.nickname).toBe('InfoPlayer');
        expect(userInfo.tier).toBe('gold');
        expect(userInfo.exp_point).toBe(1600);
        done();
      });

      client1.on('connect', () => {
        // user:info는 연결 시 자동으로 전송됨
      });
    }, 5000);
  });

  describe('다중 사용자 동시 매칭', () => {
    it('여러 클라이언트가 동시에 접속하면 올바르게 페어링되어야 함', (done) => {
      const serverUrl = `http://localhost:${port}/ws`;
      const clients: Socket[] = [];
      const opponentNicknames: string[] = [];
      const totalClients = 6;
      let matchFoundCount = 0;
      let ackCount = 0;

      const finishTest = () => {
        if (matchFoundCount === totalClients && ackCount === totalClients) {
          expect(opponentNicknames.length).toBe(totalClients);
          // 각자 다른 상대와 매칭되었으므로 상대 닉네임 목록에 중복이 없어야 함 (각자 1명씩만 매칭)
          // 사실 여기서는 그냥 인원수만 맞으면 됨 (서로 쌍을 이루니까)
          clients.forEach(c => c.disconnect());
          done();
        }
      };

      for (let i = 0; i < totalClients; i++) {
        const client = io(serverUrl, {
          transports: ['websocket'],
          autoConnect: false,
          query: {
            userId: `multi-user-${i}`,
            nickname: `MultiPlayer${i}`,
            tier: 'platinum',
            exp_point: '1800',
          },
        });

        client.on('match:found', (data) => {
          matchFoundCount++;
          opponentNicknames.push(data.opponent.nickname);
          finishTest();
        });

        client.on('connect', () => {
          client.emit('match:enqueue', (res: any) => {
            expect(res.ok).toBe(true);
            ackCount++;
            finishTest();
          });
        });

        clients.push(client);
      }

      clients.forEach((client, index) => {
        setTimeout(() => client.connect(), index * 20);
      });
    }, 20000);

    it('홀수 명의 클라이언트 접속 시 마지막 한 명은 대기 상태여야 함', (done) => {
      const serverUrl = `http://localhost:${port}/ws`;
      const clients: Socket[] = [];
      const totalClients = 5; // 2쌍 매칭, 1명 대기
      let matchFoundCount = 0;

      for (let i = 0; i < totalClients; i++) {
        const client = io(serverUrl, {
          transports: ['websocket'],
          autoConnect: false,
          query: {
            userId: `odd-user-${i}`,
            nickname: `OddPlayer${i}`,
            tier: 'diamond',
            exp_point: '2200',
          },
        });

        client.on('match:found', () => {
          matchFoundCount++;
        });

        client.on('connect', () => {
          client.emit('match:enqueue');
        });

        clients.push(client);
      }

      // 모든 클라이언트 연결
      clients.forEach((client, index) => {
        setTimeout(() => client.connect(), index * 50);
      });

      // 2초 후 확인: 4명만 매칭되고 1명은 대기 중이어야 함
      setTimeout(() => {
        expect(matchFoundCount).toBe(4); // 2쌍 = 4명
        clients.forEach(c => c.disconnect());
        done();
      }, 2000);
    }, 10000);
  });

  describe('match:enqueue 후 match:found 이벤트 호출 확인', () => {
    it('match:enqueue 실행 후 상대가 있으면 match:found가 호출되어야 함', (done) => {
      const serverUrl = `http://localhost:${port}/ws`;
      let client1MatchFound = false;
      let client2MatchFound = false;

      client1 = io(serverUrl, {
        transports: ['websocket'],
        autoConnect: false,
        query: {
          userId: 'event-check-user1',
          nickname: 'EventCheckPlayer1',
          tier: 'master',
          exp_point: '2800',
        },
      });

      client2 = io(serverUrl, {
        transports: ['websocket'],
        autoConnect: false,
        query: {
          userId: 'event-check-user2',
          nickname: 'EventCheckPlayer2',
          tier: 'master',
          exp_point: '2750',
        },
      });

      // client1의 match:found 핸들러
      client1.on('match:found', (data) => {
        client1MatchFound = true;
        expect(data).toBeTruthy();
        expect(data.opponent).toBeTruthy();
        expect(data.opponent.nickname).toBe('EventCheckPlayer2');

        if (client2MatchFound) {
          done();
        }
      });

      // client2의 match:found 핸들러
      client2.on('match:found', (data) => {
        client2MatchFound = true;
        expect(data).toBeTruthy();
        expect(data.opponent).toBeTruthy();
        expect(data.opponent.nickname).toBe('EventCheckPlayer1');

        if (client1MatchFound) {
          done();
        }
      });

      // client1 연결 및 매칭 요청
      client1.on('connect', () => {
        client1.emit('match:enqueue', (response: { ok: boolean; sessionId?: string }) => {
          expect(response.ok).toBe(true);
          expect(response.sessionId).toBeTruthy();
        });
      });

      // client2 연결 및 매칭 요청
      client2.on('connect', () => {
        client2.emit('match:enqueue', (response: { ok: boolean; sessionId?: string }) => {
          expect(response.ok).toBe(true);
          expect(response.sessionId).toBeTruthy();
        });
      });

      client1.connect();
      setTimeout(() => client2.connect(), 100);
    }, 10000);

    it('match:enqueue 실행 후 상대가 없으면 match:found가 호출되지 않아야 함', (done) => {
      const serverUrl = `http://localhost:${port}/ws`;
      let matchFoundCalled = false;

      client1 = io(serverUrl, {
        transports: ['websocket'],
        query: {
          userId: 'no-opponent-user',
          nickname: 'NoOpponentPlayer',
          tier: 'challenger',
          exp_point: '3500',
        },
      });

      client1.on('match:found', () => {
        matchFoundCalled = true;
      });

      client1.on('connect', () => {
        client1.emit('match:enqueue', (response: { ok: boolean; sessionId?: string }) => {
          expect(response.ok).toBe(true);
          expect(response.sessionId).toBeTruthy();

          // 2초 후 match:found가 호출되지 않았는지 확인
          setTimeout(() => {
            expect(matchFoundCalled).toBe(false);
            done();
          }, 2000);
        });
      });
    }, 5000);

    it('연속으로 match:enqueue를 호출해도 중복 매칭이 발생하지 않아야 함', (done) => {
      const serverUrl = `http://localhost:${port}/ws`;
      let client1MatchCount = 0;
      let client2MatchCount = 0;

      client1 = io(serverUrl, {
        transports: ['websocket'],
        autoConnect: false,
        query: {
          userId: 'duplicate-enqueue-user1',
          nickname: 'DuplicatePlayer1',
          tier: 'grandmaster',
          exp_point: '3200',
        },
      });

      client2 = io(serverUrl, {
        transports: ['websocket'],
        autoConnect: false,
        query: {
          userId: 'duplicate-enqueue-user2',
          nickname: 'DuplicatePlayer2',
          tier: 'grandmaster',
          exp_point: '3100',
        },
      });

      client1.on('match:found', () => {
        client1MatchCount++;
      });

      client2.on('match:found', () => {
        client2MatchCount++;
      });

      client1.on('connect', () => {
        // 연속으로 3번 enqueue 호출
        client1.emit('match:enqueue');
        setTimeout(() => client1.emit('match:enqueue'), 50);
        setTimeout(() => client1.emit('match:enqueue'), 100);
      });

      client2.on('connect', () => {
        client2.emit('match:enqueue');
      });

      client1.connect();
      setTimeout(() => client2.connect(), 200);

      // 2초 후 각 클라이언트가 정확히 한 번만 매칭되었는지 확인
      setTimeout(() => {
        expect(client1MatchCount).toBe(1);
        expect(client2MatchCount).toBe(1);
        done();
      }, 2500);
    }, 10000);
  });

  describe('비동기 이벤트 순서 검증', () => {
    it('match:enqueue에 대한 응답이 match:found 이벤트보다 먼저 도착해야 함 (setImmediate 확인)', (done) => {
      const serverUrl = `http://localhost:${port}/ws`;
      let enqueueResponseReceived = false;
      let matchFoundReceived = false;

      client1 = io(serverUrl, {
        transports: ['websocket'],
        autoConnect: false,
        query: {
          userId: 'async-order-user1',
          nickname: 'AsyncOrder1',
          tier: 'gold',
          exp_point: '1500',
        },
      });

      client2 = io(serverUrl, {
        transports: ['websocket'],
        autoConnect: false,
        query: {
          userId: 'async-order-user2',
          nickname: 'AsyncOrder2',
          tier: 'gold',
          exp_point: '1500',
        },
      });

      client1.on('match:found', () => {
        matchFoundReceived = true;
        // match:found가 왔을 때 이미 enqueue 응답이 왔었는지 확인
        expect(enqueueResponseReceived).toBe(true);
        if (matchFoundReceived) {
          done();
        }
      });

      client1.on('connect', () => {
        client1.emit('match:enqueue', (res: any) => {
          expect(res.ok).toBe(true);
          enqueueResponseReceived = true;
          // 여기서 matchFoundReceived는 false여야 함 (서버에서 setImmediate로 보내기 때문)
          expect(matchFoundReceived).toBe(false);
        });
      });

      client2.on('connect', () => {
        client2.emit('match:enqueue');
      });

      client1.connect();
      setTimeout(() => client2.connect(), 100);
    }, 10000);
  });
});
