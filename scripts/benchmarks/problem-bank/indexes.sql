-- ============================================================
-- 문제은행 인덱스
--
-- 대상 쿼리:
--   getProblemBankList() : user_id + answer_status 필터 + 페이지네이션
--   getProblemBankCount(): user_id + answer_status COUNT
--   getProblemStats()    : user_id 기준 answer_status 집계
--
-- 적용 방법:
--   docker exec web05-postgres psql -U postgres -d boostcamp -f /tmp/problem-bank-indexes.sql
-- ============================================================

-- ============================================================
-- Section A: 적용 전 성능 측정
-- ============================================================

-- [Q1] 문제은행 목록 (필터 있음)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT pb.id, pb.answer_status, pb.is_bookmarked
FROM user_problem_banks pb
WHERE pb.user_id = (SELECT id FROM users WHERE oauth_id = 'github_1' LIMIT 1)
  AND pb.answer_status = 'incorrect'
ORDER BY pb.id DESC
LIMIT 20 OFFSET 0;

-- [Q2] 문제은행 COUNT (필터 있음)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT COUNT(*)
FROM user_problem_banks pb
WHERE pb.user_id = (SELECT id FROM users WHERE oauth_id = 'github_1' LIMIT 1)
  AND pb.answer_status = 'incorrect';

-- [Q3] 문제은행 목록 (필터 없음)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT pb.id, pb.answer_status, pb.is_bookmarked
FROM user_problem_banks pb
WHERE pb.user_id = (SELECT id FROM users WHERE oauth_id = 'github_1' LIMIT 1)
ORDER BY pb.id DESC
LIMIT 20 OFFSET 0;

-- [Q4] 문제은행 통계 (프로필 페이지)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN answer_status = 'correct'   THEN 1 ELSE 0 END) AS correct,
  SUM(CASE WHEN answer_status = 'incorrect' THEN 1 ELSE 0 END) AS incorrect,
  SUM(CASE WHEN answer_status = 'partial'   THEN 1 ELSE 0 END) AS partial
FROM user_problem_banks
WHERE user_id = (SELECT id FROM users WHERE oauth_id = 'github_1' LIMIT 1);

-- ============================================================
-- Section B: 인덱스 생성
-- ============================================================

-- B-1. (user_id, answer_status) 복합 인덱스
--   필터링 + 정렬 모두 커버. user_id 단독 조회도 leftmost prefix로 처리
CREATE INDEX IF NOT EXISTS idx_problem_bank_user_status
  ON user_problem_banks (user_id, answer_status);

-- B-2. 북마크 조회용 (is_bookmarked = true 부분 인덱스)
CREATE INDEX IF NOT EXISTS idx_problem_bank_user_bookmark
  ON user_problem_banks (user_id, is_bookmarked)
  WHERE is_bookmarked = true;

-- B-3. users oauth 조회 (토큰 인증 경로 최적화)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth
  ON users (oauth_provider, oauth_id);

ANALYZE user_problem_banks;
ANALYZE users;

-- ============================================================
-- Section C: 롤백
-- ============================================================
-- DROP INDEX IF EXISTS idx_problem_bank_user_status;
-- DROP INDEX IF EXISTS idx_problem_bank_user_bookmark;
-- DROP INDEX IF EXISTS idx_users_oauth;
-- ANALYZE user_problem_banks;
