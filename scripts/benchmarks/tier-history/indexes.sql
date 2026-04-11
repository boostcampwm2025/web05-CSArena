-- ============================================================
-- 티어 히스토리 인덱스
--
-- 대상 쿼리:
--   getTierHistory(): user_id 필터 + updated_at DESC 정렬
--
-- 적용 방법:
--   docker exec web05-postgres psql -U postgres -d boostcamp -f /tmp/tier-history-indexes.sql
-- ============================================================

-- ============================================================
-- Section A: 적용 전 성능 측정
-- ============================================================

-- [Q1] 티어 히스토리 조회
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT uth.id, uth.tier_point, uth.tier_change, uth.updated_at, t.name
FROM user_tier_hisotries uth
LEFT JOIN tiers t ON t.id = uth.tier_id
WHERE uth.user_id = (SELECT id FROM users WHERE oauth_id = 'github_1' LIMIT 1)
ORDER BY uth.updated_at DESC;

-- ============================================================
-- Section B: 인덱스 생성
-- ============================================================

-- B-1. user_id + updated_at DESC (정렬 포함 복합 인덱스)
CREATE INDEX IF NOT EXISTS idx_tier_history_user
  ON user_tier_hisotries (user_id, updated_at DESC);

-- B-2. tiers 조회 보조 (tier_id는 FK지만 명시적 인덱스)
CREATE INDEX IF NOT EXISTS idx_tiers_points_range
  ON tiers (min_points, max_points);

ANALYZE user_tier_hisotries;
ANALYZE tiers;

-- ============================================================
-- Section C: 롤백
-- ============================================================
-- DROP INDEX IF EXISTS idx_tier_history_user;
-- DROP INDEX IF EXISTS idx_tiers_points_range;
-- ANALYZE user_tier_hisotries; ANALYZE tiers;
