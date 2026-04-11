-- ============================================================
-- 프로필(마이페이지) 인덱스
--
-- 대상 쿼리:
--   getMyPageData(): users + user_statistics JOIN (user_id PK 조회)
--                    user_problem_banks 집계 (user_id 필터)
--
-- 적용 방법:
--   docker exec web05-postgres psql -U postgres -d boostcamp -f /tmp/profile-indexes.sql
-- ============================================================

-- ============================================================
-- Section A: 적용 전 성능 측정
-- ============================================================

-- [Q1] 사용자 + 통계 조회 (마이페이지 기본 데이터)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.id, u.nickname, u.user_profile, u.email, u.created_at,
       s.tier_point, s.exp_point, s.total_matches, s.win_count, s.lose_count,
       s.solved_count, s.correct_count
FROM users u
LEFT JOIN user_statistics s ON s.user_id = u.id
WHERE u.id = (SELECT id FROM users WHERE oauth_id = 'github_1' LIMIT 1);

-- [Q2] 문제 통계 집계 (마이페이지 문제은행 섹션)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  COUNT(*) AS total_solved,
  SUM(CASE WHEN answer_status = 'correct'   THEN 1 ELSE 0 END) AS correct_count,
  SUM(CASE WHEN answer_status = 'incorrect' THEN 1 ELSE 0 END) AS incorrect_count,
  SUM(CASE WHEN answer_status = 'partial'   THEN 1 ELSE 0 END) AS partial_count
FROM user_problem_banks
WHERE user_id = (SELECT id FROM users WHERE oauth_id = 'github_1' LIMIT 1);

-- ============================================================
-- Section B: 인덱스 생성
-- ============================================================

-- B-1. user_statistics → user_id (PK는 이미 인덱스지만 FK JOIN 최적화)
CREATE INDEX IF NOT EXISTS idx_user_statistics_user
  ON user_statistics (user_id);

-- B-2. user_problem_banks → user_id (집계 쿼리 최적화)
--   (user_id, answer_status) 복합 인덱스: answer_status 별 집계 커버
CREATE INDEX IF NOT EXISTS idx_problem_bank_user_status
  ON user_problem_banks (user_id, answer_status);

-- B-3. users oauth 조회 (토큰 인증 경로 최적화)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth
  ON users (oauth_provider, oauth_id);

ANALYZE users;
ANALYZE user_statistics;
ANALYZE user_problem_banks;

-- ============================================================
-- Section C: 롤백
-- ============================================================
-- DROP INDEX IF EXISTS idx_user_statistics_user;
-- DROP INDEX IF EXISTS idx_problem_bank_user_status;
-- DROP INDEX IF EXISTS idx_users_oauth;
-- ANALYZE users; ANALYZE user_statistics; ANALYZE user_problem_banks;
