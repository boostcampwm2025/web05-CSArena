/**
 * ELO 매칭 관련 상수
 */

/**
 * 대기 시간에 따른 ELO 매칭 범위 설정
 * - 0-10초: ±100 ELO
 * - 10-30초: ±200 ELO
 * - 30초+: ±500 ELO
 */
export const MATCH_RANGES = [
  { maxWaitTime: 10000, eloRange: 100 }, // 0-10초: ±100 ELO
  { maxWaitTime: 30000, eloRange: 200 }, // 10-30초: ±200 ELO
  { maxWaitTime: Infinity, eloRange: 500 }, // 30초+: ±500 ELO
] as const;

/**
 * Polling 재매칭 간격 (밀리초)
 * 5초마다 큐에 있는 플레이어들끼리 재매칭 시도
 */
export const POLLING_INTERVAL_MS = 5000;

/**
 * 기본 ELO 레이팅
 * 신규 유저 또는 레이팅 정보가 없는 경우 사용
 */
export const DEFAULT_ELO_RATING = 1000;
