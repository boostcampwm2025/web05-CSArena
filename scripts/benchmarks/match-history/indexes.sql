-- ============================================================
-- 매치 히스토리 인덱스
--
-- 대상 쿼리:
--   getMatchHistory(): player1_id OR player2_id 조건 + created_at DESC 정렬
--                      + 13개 테이블 LEFT JOIN (rounds, round_answers 등)
--
-- 적용 방법:
--   docker exec web05-postgres psql -U postgres -d boostcamp -f /tmp/match-history-indexes.sql
-- ============================================================

-- ============================================================
-- Section A: 적용 전 성능 측정
-- ============================================================

-- [Q1] 매치 히스토리 기본 조회 (OR 조건 + 정렬)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT m.id, m.player1_id, m.player2_id, m.match_type, m.created_at
FROM matches m
WHERE m.player1_id = (SELECT id FROM users WHERE oauth_id = 'github_1' LIMIT 1)
   OR m.player2_id = (SELECT id FROM users WHERE oauth_id = 'github_1' LIMIT 1)
ORDER BY m.created_at DESC
LIMIT 10;

-- [Q2] 라운드 조회 (matches JOIN)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT r.id, r.match_id, r.round_number
FROM rounds r
WHERE r.match_id IN (
  SELECT id FROM matches
  WHERE player1_id = (SELECT id FROM users WHERE oauth_id = 'github_1' LIMIT 1)
     OR player2_id = (SELECT id FROM users WHERE oauth_id = 'github_1' LIMIT 1)
  ORDER BY created_at DESC
  LIMIT 10
);

-- [Q3] 티어 히스토리 per-match 조회 (N+1 패턴)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT uth.id, uth.tier_point, uth.tier_change, uth.match_id
FROM user_tier_hisotries uth
WHERE uth.user_id = (SELECT id FROM users WHERE oauth_id = 'github_1' LIMIT 1)
  AND uth.match_id = (SELECT id FROM matches LIMIT 1);

-- ============================================================
-- Section B: 인덱스 생성
-- ============================================================

-- B-1. player1_id 기준 최근 매치 조회
CREATE INDEX IF NOT EXISTS idx_matches_player1
  ON matches (player1_id, created_at DESC);

-- B-2. player2_id 기준 최근 매치 조회
CREATE INDEX IF NOT EXISTS idx_matches_player2
  ON matches (player2_id, created_at DESC);

-- B-3. rounds → match_id JOIN 최적화
CREATE INDEX IF NOT EXISTS idx_rounds_match
  ON rounds (match_id);

-- B-4. round_answers → round_id JOIN 최적화
CREATE INDEX IF NOT EXISTS idx_round_answers_round
  ON round_answers (round_id);

-- B-5. 매치히스토리 내 N+1 제거용 (user_id + match_id)
CREATE INDEX IF NOT EXISTS idx_tier_history_user_match
  ON user_tier_hisotries (user_id, match_id);

ANALYZE matches;
ANALYZE rounds;
ANALYZE round_answers;
ANALYZE user_tier_hisotries;

-- ============================================================
-- Section C: 롤백
-- ============================================================
-- DROP INDEX IF EXISTS idx_matches_player1;
-- DROP INDEX IF EXISTS idx_matches_player2;
-- DROP INDEX IF EXISTS idx_rounds_match;
-- DROP INDEX IF EXISTS idx_round_answers_round;
-- DROP INDEX IF EXISTS idx_tier_history_user_match;
-- ANALYZE matches; ANALYZE rounds; ANALYZE round_answers; ANALYZE user_tier_hisotries;
