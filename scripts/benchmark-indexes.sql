-- ============================================================
-- CSArena 인덱스 성능 벤치마크 스크립트
-- 사용법:
--   1. seed-dummy-data.sql 실행 후
--   2. 이 스크립트의 Section A 실행 (인덱스 없이 측정)
--   3. Section B 실행 (인덱스 생성)
--   4. Section A 다시 실행 (인덱스 있는 상태에서 측정)
--   5. 결과 비교
-- ============================================================

-- ============================================================
-- Section A: 벤치마크 쿼리 (인덱스 전후 각각 실행)
-- ============================================================

-- [Q1] 멀티 리더보드 — Top 100 랭킹
-- 예상 병목: user_statistics 풀스캔 + 정렬
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  u.nickname,
  u.user_profile,
  us.tier_point,
  us.win_count,
  us.lose_count,
  t.name AS tier
FROM user_statistics us
INNER JOIN users u ON u.id = us.user_id
INNER JOIN tiers t ON t.min_points <= us.tier_point
  AND (t.max_points >= us.tier_point OR t.max_points IS NULL)
ORDER BY us.tier_point DESC
LIMIT 100;

-- [Q2] 싱글 리더보드 — Top 100
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  u.nickname,
  u.user_profile,
  us.exp_point,
  us.solved_count,
  us.correct_count
FROM user_statistics us
INNER JOIN users u ON u.id = us.user_id
ORDER BY us.exp_point DESC
LIMIT 100;

-- [Q3] 내 랭킹 조회 (특정 유저의 순위)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT COUNT(*) + 1 AS rank
FROM user_statistics us
WHERE us.tier_point > 2500;

-- [Q4] OAuth 로그인 — 유저 조회
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM users
WHERE oauth_provider = 'github' AND oauth_id = 'github_50000';

-- [Q5] 문제은행 — 특정 유저의 문제 목록 (필터 + 페이지네이션)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT pb.*, q.content, q.difficulty
FROM user_problem_banks pb
LEFT JOIN questions q ON q.id = pb.question_id
WHERE pb.user_id = (SELECT id FROM users WHERE oauth_id = 'github_1' LIMIT 1)
  AND pb.answer_status = 'incorrect'
ORDER BY pb.id DESC
LIMIT 20 OFFSET 0;

-- [Q6] 문제은행 — 통계 집계
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  COUNT(*) AS total_solved,
  SUM(CASE WHEN answer_status = 'correct' THEN 1 ELSE 0 END) AS correct,
  SUM(CASE WHEN answer_status = 'incorrect' THEN 1 ELSE 0 END) AS incorrect,
  SUM(CASE WHEN answer_status = 'partial' THEN 1 ELSE 0 END) AS partial
FROM user_problem_banks
WHERE user_id = (SELECT id FROM users WHERE oauth_id = 'github_1' LIMIT 1);

-- [Q7] 매치 히스토리 — 특정 유저의 최근 10경기
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT m.*
FROM matches m
WHERE m.player1_id = (SELECT id FROM users WHERE oauth_id = 'github_1' LIMIT 1)
   OR m.player2_id = (SELECT id FROM users WHERE oauth_id = 'github_1' LIMIT 1)
ORDER BY m.created_at DESC
LIMIT 10;

-- [Q8] 티어 히스토리 — 특정 유저
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT uth.*, t.name AS tier_name
FROM user_tier_hisotries uth
INNER JOIN tiers t ON t.id = uth.tier_id
WHERE uth.user_id = (SELECT id FROM users WHERE oauth_id = 'github_1' LIMIT 1)
ORDER BY uth.updated_at DESC;

-- [Q9] 게임 문제 선택 — 활성 문제 중 사용량 적은 순
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT q.id, q.question_type, q.difficulty, q.usage_count
FROM questions q
WHERE q.is_active = true
  AND (
    (q.difficulty BETWEEN 1 AND 2 AND q.question_type IN ('multiple', 'short'))
    OR (q.difficulty = 3 AND q.question_type IN ('multiple', 'short'))
    OR (q.difficulty BETWEEN 4 AND 5 AND q.question_type = 'essay')
  )
ORDER BY q.usage_count ASC, random()
LIMIT 50;

-- [Q10] 카테고리별 문제 조회 (싱글플레이)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT q.*
FROM questions q
INNER JOIN category_questions cq ON cq.question_id = q.id
WHERE q.is_active = true
  AND cq.category_id IN (
    SELECT id FROM categories WHERE parent_id = (
      SELECT id FROM categories WHERE name = '자료구조' LIMIT 1
    )
  )
ORDER BY q.usage_count ASC, random()
LIMIT 10;


-- ============================================================
-- Section B: 인덱스 생성
-- ============================================================

-- B-1. 리더보드 (가장 큰 효과 예상)
CREATE INDEX CONCURRENTLY idx_user_stats_tier_point
  ON user_statistics (tier_point DESC);

CREATE INDEX CONCURRENTLY idx_user_stats_exp_point
  ON user_statistics (exp_point DESC);

-- B-2. OAuth 로그인 (매 요청마다 조회)
CREATE UNIQUE INDEX CONCURRENTLY idx_users_oauth
  ON users (oauth_provider, oauth_id);

-- B-3. 매치 히스토리
CREATE INDEX CONCURRENTLY idx_matches_player1
  ON matches (player1_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_matches_player2
  ON matches (player2_id, created_at DESC);

-- B-4. 문제은행 (복합 필터링)
CREATE INDEX CONCURRENTLY idx_problem_bank_user_status
  ON user_problem_banks (user_id, answer_status);

CREATE INDEX CONCURRENTLY idx_problem_bank_user_bookmark
  ON user_problem_banks (user_id, is_bookmarked)
  WHERE is_bookmarked = true;

-- B-5. 문제 선택 (게임 시작 시)
CREATE INDEX CONCURRENTLY idx_questions_active_diff_type
  ON questions (is_active, difficulty, question_type, usage_count ASC);

-- B-6. 카테고리 트리
CREATE INDEX CONCURRENTLY idx_categories_parent
  ON categories (parent_id);

CREATE INDEX CONCURRENTLY idx_category_questions_cat
  ON category_questions (category_id, question_id);

-- B-7. 티어 조회
CREATE INDEX CONCURRENTLY idx_tiers_name
  ON tiers (name);

CREATE INDEX CONCURRENTLY idx_tiers_points_range
  ON tiers (min_points, max_points);

-- B-8. 티어 히스토리
CREATE INDEX CONCURRENTLY idx_tier_history_user
  ON user_tier_hisotries (user_id, updated_at DESC);

CREATE INDEX CONCURRENTLY idx_tier_history_user_match
  ON user_tier_hisotries (user_id, match_id);

-- B-9. User Statistics FK
CREATE INDEX CONCURRENTLY idx_user_stats_user_id
  ON user_statistics (user_id);

-- B-10. Round/Answer FK (JOIN 최적화)
CREATE INDEX CONCURRENTLY idx_rounds_match
  ON rounds (match_id);

CREATE INDEX CONCURRENTLY idx_round_answers_round
  ON round_answers (round_id);

CREATE INDEX CONCURRENTLY idx_round_answers_user
  ON round_answers (user_id);

-- 통계 갱신 (인덱스 생성 후 필수)
ANALYZE;


-- ============================================================
-- Section C: 인덱스 삭제 (롤백용)
-- ============================================================
-- 필요 시 인덱스를 제거하고 다시 비교할 때 사용
--
-- DROP INDEX IF EXISTS idx_user_stats_tier_point;
-- DROP INDEX IF EXISTS idx_user_stats_exp_point;
-- DROP INDEX IF EXISTS idx_users_oauth;
-- DROP INDEX IF EXISTS idx_matches_player1;
-- DROP INDEX IF EXISTS idx_matches_player2;
-- DROP INDEX IF EXISTS idx_problem_bank_user_status;
-- DROP INDEX IF EXISTS idx_problem_bank_user_bookmark;
-- DROP INDEX IF EXISTS idx_questions_active_diff_type;
-- DROP INDEX IF EXISTS idx_categories_parent;
-- DROP INDEX IF EXISTS idx_category_questions_cat;
-- DROP INDEX IF EXISTS idx_tiers_name;
-- DROP INDEX IF EXISTS idx_tiers_points_range;
-- DROP INDEX IF EXISTS idx_tier_history_user;
-- DROP INDEX IF EXISTS idx_tier_history_user_match;
-- DROP INDEX IF EXISTS idx_user_stats_user_id;
-- DROP INDEX IF EXISTS idx_rounds_match;
-- DROP INDEX IF EXISTS idx_round_answers_round;
-- DROP INDEX IF EXISTS idx_round_answers_user;
-- ANALYZE;
