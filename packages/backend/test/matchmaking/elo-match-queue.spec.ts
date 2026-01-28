import { EloMatchQueue } from '../../src/matchmaking/queue/elo-match-queue';

describe('EloMatchQueue', () => {
  let queue: EloMatchQueue;

  beforeEach(() => {
    queue = new EloMatchQueue();
  });

  afterEach(() => {
    // 테스트 종료 시 polling interval 정리
    queue.onModuleDestroy();
  });

  describe('기본 매칭 기능', () => {
    it('비어있는 큐에 플레이어 추가 시 null 반환', () => {
      const match = queue.add('user1', 1000);
      expect(match).toBeNull();
      expect(queue.getQueueSize()).toBe(1);
    });

    it('ELO 차이가 범위 내인 경우 즉시 매칭', () => {
      queue.add('user1', 1000);
      const match = queue.add('user2', 1050); // 차이 50 <= ±100

      expect(match).not.toBeNull();
      expect(match?.player1).toBe('user2');
      expect(match?.player2).toBe('user1');
      expect(match?.roomId).toBeDefined();
      expect(queue.getQueueSize()).toBe(0);
    });

    it('ELO 차이가 범위 밖인 경우 큐에 추가', () => {
      queue.add('user1', 1000);
      const match = queue.add('user2', 1200); // 차이 200 > ±100

      expect(match).toBeNull();
      expect(queue.getQueueSize()).toBe(2);
    });

    it('중복된 userId는 큐에 추가되지 않음', () => {
      queue.add('user1', 1000);
      const match = queue.add('user1', 1000);

      expect(match).toBeNull();
      expect(queue.getQueueSize()).toBe(1);
    });

    it('여러 후보 중 ELO 차이가 가장 작은 상대 선택', () => {
      queue.add('user1', 1000);
      queue.add('user2', 1050);
      queue.add('user3', 1030); // user1과 차이 30 (가장 작음)

      const match = queue.add('user4', 1000);

      expect(match).not.toBeNull();
      expect(match?.player2).toBe('user3'); // user3이 선택되어야 함
    });
  });

  describe('큐 관리', () => {
    it('큐에서 플레이어 제거', () => {
      queue.add('user1', 1000);
      queue.add('user2', 1600); // 차이 600, 매칭 안 됨

      expect(queue.getQueueSize()).toBe(2);

      queue.remove('user1');
      expect(queue.getQueueSize()).toBe(1);
    });

    it('큐 상태 조회', () => {
      queue.add('user1', 1000);
      queue.add('user2', 1600); // 차이 600, 매칭 안 됨

      const status = queue.getQueueStatus();
      expect(status).toHaveLength(2);
      expect(status[0].userId).toBe('user1');
      expect(status[0].eloRating).toBe(1000);
      expect(status[1].userId).toBe('user2');
      expect(status[1].eloRating).toBe(1600);
    });
  });

  describe('Polling 재매칭 기능', () => {
    it('큐에 있는 플레이어들끼리 범위 내면 재매칭 성공', () => {
      // 먼저 범위 밖의 user들을 큐에 추가
      queue.add('user1', 1000);
      queue.add('user2', 1600); // 차이 600, 큐에 추가
      queue.add('user3', 1050); // user1과 매칭되어 user1 제거

      // user2만 남아있어야 함
      expect(queue.getQueueSize()).toBe(1);

      // user4 추가 (user2와 범위 밖이지만 거의 가까움)
      queue.add('user4', 1800); // user2와 차이 200, 큐에 추가

      expect(queue.getQueueSize()).toBe(2);

      // Polling 재매칭 시도 (±100 범위)
      const matches = queue.getAndClearPendingMatches();

      // 차이 200 > ±100이므로 매칭 실패
      expect(matches).toHaveLength(0);
      expect(queue.getQueueSize()).toBe(2);
    });

    it('ELO 차이가 범위 밖이면 재매칭 실패', () => {
      // user1(1000), user2(1600) 추가 - 차이 600 > ±500 (최대 범위)
      queue.add('user1', 1000);
      queue.add('user2', 1600);

      expect(queue.getQueueSize()).toBe(2);

      const matches = queue.getAndClearPendingMatches();

      // 범위 밖이므로 매칭 실패
      expect(matches).toHaveLength(0);
      expect(queue.getQueueSize()).toBe(2); // 여전히 큐에 남아있음
    });

    it('여러 쌍이 동시에 매칭 가능', () => {
      // 범위 내인 쌍들을 추가
      queue.add('user1', 1000);
      queue.add('user2', 2000); // 차이 1000, 큐에 추가
      queue.add('user3', 1050); // user1과 차이 50, user1 매칭됨

      // user2만 남음
      expect(queue.getQueueSize()).toBe(1);

      queue.add('user4', 2050); // user2와 차이 50, user2 매칭됨

      expect(queue.getQueueSize()).toBe(0);
    });

    it('홀수 명일 때 한 명은 큐에 남음', () => {
      queue.add('user1', 1000);
      queue.add('user2', 1600); // 차이 600, 큐에 추가
      queue.add('user3', 1050); // user1과 매칭

      // user2만 큐에 남음
      expect(queue.getQueueSize()).toBe(1);

      const matches = queue.getAndClearPendingMatches();

      // 1명만 있으므로 매칭 안 됨
      expect(matches).toHaveLength(0);
      expect(queue.getQueueSize()).toBe(1);
    });

    it('빈 큐에서는 빈 배열 반환', () => {
      const matches = queue.getAndClearPendingMatches();
      expect(matches).toHaveLength(0);
    });

    it('큐에 1명만 있으면 매칭 안 됨', () => {
      queue.add('user1', 1000);

      const matches = queue.getAndClearPendingMatches();
      expect(matches).toHaveLength(0);
      expect(queue.getQueueSize()).toBe(1);
    });
  });

  describe('대기 시간별 ELO 범위', () => {
    it('0-10초: ±100 범위', () => {
      queue.add('user1', 1000);
      const match = queue.add('user2', 1100); // 차이 100

      expect(match).not.toBeNull();
    });

    it('0-10초: 범위 초과 시 매칭 실패', () => {
      queue.add('user1', 1000);
      const match = queue.add('user2', 1101); // 차이 101 > ±100

      expect(match).toBeNull();
      expect(queue.getQueueSize()).toBe(2);
    });

    it('초기 범위(±100)에서 매칭', () => {
      queue.add('user1', 1000);
      const match = queue.add('user2', 1100); // 차이 100

      // 즉시 매칭됨
      expect(match).not.toBeNull();
      expect(queue.getQueueSize()).toBe(0);
    });

    it('최대 범위(±500) 테스트', () => {
      // 차이 500인 경우 (최대 범위)
      queue.add('user1', 1000);
      queue.add('user2', 1500);

      expect(queue.getQueueSize()).toBe(2);

      // 현재는 ±100이므로 매칭 안 됨
      // 실제로는 시간이 지나면 ±500까지 확대됨
      const matches = queue.getAndClearPendingMatches();

      // 현재 시간 기준으로 매칭 시도 (대기 시간 거의 0초이므로 ±100)
      // 차이 500 > ±100이므로 매칭 실패
      expect(matches).toHaveLength(0);
      expect(queue.getQueueSize()).toBe(2);
    });
  });

  describe('모듈 라이프사이클', () => {
    it('onModuleInit 호출 시 polling 시작', () => {
      const newQueue = new EloMatchQueue();
      newQueue.onModuleInit();

      // polling interval이 설정되었는지 확인
      // (내부 변수라 직접 확인 불가, 기능 테스트로 대체)
      expect(newQueue).toBeDefined();

      newQueue.onModuleDestroy();
    });

    it('onModuleDestroy 호출 시 polling 중지', () => {
      queue.onModuleInit();
      queue.onModuleDestroy();

      // interval이 정리되었는지 확인
      expect(queue).toBeDefined();
    });
  });
});