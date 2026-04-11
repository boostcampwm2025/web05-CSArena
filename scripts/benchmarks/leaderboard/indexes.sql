-- ============================================================
-- 리더보드 인덱스
--
-- 대상 쿼리:
--   getMultiRankings()  : ORDER BY tier_point DESC, win_rate DESC, total_games DESC
--   getSingleRankings() : ORDER BY exp_point DESC, correct_rate DESC, solved_count DESC
--   getMultiMyRanking() : COUNT(*)+1 with OR 3 conditions
--   getSingleMyRanking(): COUNT(*)+1 with OR 3 conditions
--
-- 적용 방법:
--   docker exec web05-postgres psql -U postgres -d boostcamp -f /tmp/leaderboard-indexes.sql
--
-- 롤백 방법:
--   Section C 실행
-- ============================================================

-- ============================================================
-- Section A: 적용 전 성능 측정 (인덱스 생성 전 실행)
-- ============================================================

-- [Q1] 멀티 Top 100
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  u.nickname, u.user_profile, us.tier_point, us.win_count, us.lose_count, t.name
FROM user_statistics us
INNER JOIN users u ON u.id = us.user_id
INNER JOIN tiers t ON t.min_points <= us.tier_point
  AND (t.max_points >= us.tier_point OR t.max_points IS NULL)
ORDER BY
  us.tier_point DESC,
  CASE WHEN us.win_count + us.lose_count > 0
       THEN us.win_count * 1.0 / (us.win_count + us.lose_count)
       ELSE 0 END DESC,
  (us.win_count + us.lose_count) DESC
LIMIT 100;

-- [Q2] 싱글 Top 100
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  u.nickname, u.user_profile, us.exp_point, us.solved_count, us.correct_count
FROM user_statistics us
INNER JOIN users u ON u.id = us.user_id
ORDER BY
  us.exp_point DESC,
  CASE WHEN us.solved_count > 0
       THEN us.correct_count * 1.0 / us.solved_count
       ELSE 0 END DESC,
  us.solved_count DESC
LIMIT 100;

-- [Q3] 내 멀티 랭킹 (COUNT 방식)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT COUNT(*) + 1 AS rank
FROM user_statistics us
WHERE us.tier_point > 2500
   OR (us.tier_point = 2500
       AND CASE WHEN us.win_count + us.lose_count > 0
                THEN us.win_count * 1.0 / (us.win_count + us.lose_count)
                ELSE 0 END > 0.6)
   OR (us.tier_point = 2500
       AND CASE WHEN us.win_count + us.lose_count > 0
                THEN us.win_count * 1.0 / (us.win_count + us.lose_count)
                ELSE 0 END = 0.6
       AND us.win_count + us.lose_count > 50);

-- ============================================================
-- Section B: 인덱스 생성
-- ============================================================

-- B-1. 멀티 리더보드 Top 100 정렬 (Expression Index)
--   ORDER BY tier_point DESC, win_rate DESC, total_games DESC 를 Index Scan으로 대체
CREATE INDEX IF NOT EXISTS idx_multi_ranking ON user_statistics (
  tier_point DESC,
  (CASE WHEN win_count + lose_count > 0
        THEN win_count * 1.0 / (win_count + lose_count)
        ELSE 0 END) DESC,
  (win_count + lose_count) DESC
);

-- B-2. 싱글 리더보드 Top 100 정렬 (Expression Index)
--   ORDER BY exp_point DESC, correct_rate DESC, solved_count DESC 를 Index Scan으로 대체
CREATE INDEX IF NOT EXISTS idx_single_ranking ON user_statistics (
  exp_point DESC,
  (CASE WHEN solved_count > 0
        THEN correct_count * 1.0 / solved_count
        ELSE 0 END) DESC,
  solved_count DESC
);

-- B-3. 단순 tier_point 정렬 보조 (MY RANK COUNT 쿼리의 첫 번째 OR 조건)
CREATE INDEX IF NOT EXISTS idx_user_stats_tier_point
  ON user_statistics (tier_point DESC);

-- B-4. 단순 exp_point 정렬 보조
CREATE INDEX IF NOT EXISTS idx_user_stats_exp_point
  ON user_statistics (exp_point DESC);

ANALYZE user_statistics;

-- ============================================================
-- Section A 재실행: 인덱스 적용 후 동일 쿼리로 성능 비교
-- ============================================================

-- (Section A의 쿼리를 다시 실행하여 Execution Time 비교)

-- ============================================================
-- Section C: 롤백 (인덱스 삭제)
-- ============================================================
-- DROP INDEX IF EXISTS idx_multi_ranking;
-- DROP INDEX IF EXISTS idx_single_ranking;
-- DROP INDEX IF EXISTS idx_user_stats_tier_point;
-- DROP INDEX IF EXISTS idx_user_stats_exp_point;
-- ANALYZE user_statistics;
