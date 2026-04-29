import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { IMatchQueue, Match } from '../interfaces/matchmaking.interface';
import { randomUUID } from 'crypto';
import { MATCH_RANGES } from '../constants/matchmaking.constants';
import { REDIS_CLIENT } from '../../common/redis.module';
import Redis from 'ioredis';

const QUEUE_KEY = 'matchmaking:queue';
const PLAYER_DATA_PREFIX = 'matchmaking:player:';

/**
 * Redis 기반 ELO 매칭 큐
 *
 * Sorted Set을 사용하여 ELO 레이팅 기반 매칭을 수행합니다.
 * - Score: ELO 레이팅
 * - Member: userId
 * - 별도 Hash에 플레이어 메타데이터 저장 (queuedAt 등)
 *
 * 여러 인스턴스에서 동시 접근해도 Lua 스크립트로 원자적 매칭을 보장합니다.
 */
@Injectable()
export class RedisMatchQueue implements IMatchQueue, OnModuleDestroy {
  private readonly logger = new Logger(RedisMatchQueue.name);

  /**
   * Lua 스크립트: 큐에 추가하면서 동시에 매칭 가능한 상대를 찾아 원자적으로 매칭
   *
   * KEYS[1] = matchmaking:queue (Sorted Set)
   * ARGV[1] = userId
   * ARGV[2] = eloRating
   * ARGV[3] = queuedAt (timestamp)
   * ARGV[4] = 허용 ELO 범위
   *
   * 반환: 매칭된 상대 userId 또는 nil
   */
  private readonly addAndMatchScript = `
    local queueKey = KEYS[1]
    local userId = ARGV[1]
    local eloRating = tonumber(ARGV[2])
    local queuedAt = ARGV[3]
    local allowedRange = tonumber(ARGV[4])

    -- 중복 체크 — 메타데이터(${PLAYER_DATA_PREFIX}) TTL은 300s인데
    -- ZSET 멤버는 자동 만료되지 않아 stale 항목이 남을 수 있음.
    -- 메타데이터가 살아있을 때만 "이미 큐에 있음"으로 판단하고,
    -- 없으면 stale로 간주해 ZREM 후 신규 추가 절차를 그대로 진행.
    local existingScore = redis.call('ZSCORE', queueKey, userId)
    if existingScore then
      local existingData = redis.call('GET', '${PLAYER_DATA_PREFIX}' .. userId)
      if existingData then
        return nil
      end
      redis.call('ZREM', queueKey, userId)
    end

    -- 허용 범위 내 후보 탐색
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
        -- 상대의 대기 시간에 따른 허용 범위 확인
        local candidateData = redis.call('GET', '${PLAYER_DATA_PREFIX}' .. candidateId)
        if candidateData then
          local candidateQueuedAt = tonumber(candidateData)
          local candidateWaitMs = now - candidateQueuedAt

          -- 상대의 허용 범위 계산 (matchmaking constants와 동일 로직)
          local candidateRange = 500
          if candidateWaitMs < 10000 then
            candidateRange = 100
          elseif candidateWaitMs < 30000 then
            candidateRange = 200
          end

          local diff = math.abs(eloRating - candidateElo)
          if diff <= candidateRange and diff < bestDiff then
            bestMatch = candidateId
            bestDiff = diff
          end
        end
      end
    end

    if bestMatch then
      -- 매칭 성공: 상대를 큐에서 제거
      local bestMatchQueuedAt = redis.call('GET', '${PLAYER_DATA_PREFIX}' .. bestMatch)
      redis.call('ZREM', queueKey, bestMatch)
      redis.call('DEL', '${PLAYER_DATA_PREFIX}' .. bestMatch)
      return {bestMatch, bestMatchQueuedAt or '0'}
    else
      -- 매칭 실패: 큐에 추가
      redis.call('ZADD', queueKey, eloRating, userId)
      redis.call('SET', '${PLAYER_DATA_PREFIX}' .. userId, queuedAt, 'EX', 300)
      return nil
    end
  `;

  /**
   * Lua 스크립트: 큐에 있는 플레이어들끼리 재매칭 시도 (폴링용)
   *
   * KEYS[1] = matchmaking:queue
   * ARGV[1] = 현재 timestamp
   *
   * 반환: 매칭된 쌍들의 배열 [player1, player2, player1, player2, ...]
   */
  private readonly rematchScript = `
    local queueKey = KEYS[1]
    local now = tonumber(ARGV[1])
    local matches = {}
    local processed = {}

    local members = redis.call('ZRANGEBYSCORE', queueKey, '-inf', '+inf', 'WITHSCORES')

    for i = 1, #members, 2 do
      local playerId = members[i]
      local playerElo = tonumber(members[i + 1])

      if not processed[playerId] then
        local playerData = redis.call('GET', '${PLAYER_DATA_PREFIX}' .. playerId)
        if playerData then
          local playerQueuedAt = tonumber(playerData)
          local playerWaitMs = now - playerQueuedAt

          -- 플레이어의 허용 범위
          local playerRange = 500
          if playerWaitMs < 10000 then
            playerRange = 100
          elseif playerWaitMs < 30000 then
            playerRange = 200
          end

          local bestMatch = nil
          local bestDiff = playerRange + 1

          -- 다른 후보들과 비교
          for j = i + 2, #members, 2 do
            local candidateId = members[j]
            local candidateElo = tonumber(members[j + 1])

            if not processed[candidateId] then
              local candidateData = redis.call('GET', '${PLAYER_DATA_PREFIX}' .. candidateId)
              if candidateData then
                local candidateQueuedAt = tonumber(candidateData)
                local candidateWaitMs = now - candidateQueuedAt

                local candidateRange = 500
                if candidateWaitMs < 10000 then
                  candidateRange = 100
                elseif candidateWaitMs < 30000 then
                  candidateRange = 200
                end

                local diff = math.abs(playerElo - candidateElo)
                if diff <= playerRange and diff <= candidateRange and diff < bestDiff then
                  bestMatch = candidateId
                  bestDiff = diff
                end
              end
            end
          end

          if bestMatch then
            local bestMatchData = redis.call('GET', '${PLAYER_DATA_PREFIX}' .. bestMatch)
            table.insert(matches, playerId)
            table.insert(matches, tostring(playerQueuedAt))
            table.insert(matches, bestMatch)
            table.insert(matches, bestMatchData or '0')
            processed[playerId] = true
            processed[bestMatch] = true
          end
        end
      end
    end

    -- 매칭된 플레이어들을 큐에서 제거
    for id, _ in pairs(processed) do
      redis.call('ZREM', queueKey, id)
      redis.call('DEL', '${PLAYER_DATA_PREFIX}' .. id)
    end

    return matches
  `;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  onModuleDestroy(): void {
    // 모듈 종료 시 큐 정리하지 않음 (다른 인스턴스가 사용 중일 수 있음)
    this.logger.log('RedisMatchQueue shutting down');
  }

  add(_userId: string, _eloRating: number): Match | null {
    // IMatchQueue 인터페이스 호환용 — 실제로는 addAsync를 사용해야 함
    this.logger.warn('Sync add() called — use addAsync() for Redis-backed queue');

    return null;
  }

  /**
   * 비동기 매칭 큐 추가 + 즉시 매칭 시도
   */
  async addAsync(userId: string, eloRating: number): Promise<Match | null> {
    const now = Date.now();
    const allowedRange = this.getEloRangeForWaitTime(0); // 방금 들어온 플레이어

    // Redis 오류는 throw — null은 "큐 추가만 됨, 매칭 없음"의 정상 결과와
    // 구분되어야 하므로 실패를 숨기지 않는다.
    let result: [string, string] | null;

    try {
      result = (await this.redis.eval(
        this.addAndMatchScript,
        1,
        QUEUE_KEY,
        userId,
        eloRating.toString(),
        now.toString(),
        allowedRange.toString(),
      )) as [string, string] | null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Failed to add to queue: ${message}`);
      throw error;
    }

    if (result) {
      const [matchedUserId, opponentQueuedAt] = result;
      const roomId = randomUUID();
      this.logger.log(`Match found: ${userId} (${eloRating}) vs ${matchedUserId}`);

      return {
        player1: userId,
        player2: matchedUserId,
        roomId,
        player1QueuedAt: now,
        player2QueuedAt: Number(opponentQueuedAt),
      };
    }

    this.logger.log(`User ${userId} added to Redis queue (ELO: ${eloRating})`);

    return null;
  }

  remove(userId: string): void {
    this.removeAsync(userId).catch((err) => {
      this.logger.error(`Failed to remove from queue: ${err}`);
    });
  }

  async removeAsync(userId: string): Promise<void> {
    await this.redis.zrem(QUEUE_KEY, userId);
    await this.redis.del(`${PLAYER_DATA_PREFIX}${userId}`);
    this.logger.log(`User ${userId} removed from Redis queue`);
  }

  getQueueSize(): number {
    // 동기 인터페이스 — 캐시된 값 반환 (정확하지 않을 수 있음)
    return 0;
  }

  async getQueueSizeAsync(): Promise<number> {
    return this.redis.zcard(QUEUE_KEY);
  }

  /**
   * 큐에 있는 플레이어들끼리 재매칭 시도 (폴링)
   * Lua 스크립트로 원자적 실행 — 여러 인스턴스가 동시에 호출해도 안전
   */
  async getAndClearPendingMatchesAsync(): Promise<Match[]> {
    try {
      const now = Date.now();
      const result = await this.redis.eval(this.rematchScript, 1, QUEUE_KEY, now.toString());

      const matched = result as string[];
      const matches: Match[] = [];

      for (let i = 0; i < matched.length; i += 4) {
        matches.push({
          player1: matched[i],
          player2: matched[i + 2],
          roomId: randomUUID(),
          player1QueuedAt: Number(matched[i + 1]),
          player2QueuedAt: Number(matched[i + 3]),
        });
      }

      if (matches.length > 0) {
        this.logger.log(`Polling found ${matches.length} matches via Redis`);
      }

      return matches;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Rematch polling failed: ${message}`);

      return [];
    }
  }

  private getEloRangeForWaitTime(waitTime: number): number {
    for (const range of MATCH_RANGES) {
      if (waitTime < range.maxWaitTime) {
        return range.eloRange;
      }
    }

    return MATCH_RANGES[MATCH_RANGES.length - 1].eloRange;
  }
}
