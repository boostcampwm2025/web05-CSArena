-- ============================================================
-- CSArena 더미데이터 생성 스크립트
-- 목적: 인덱스 성능 비교를 위한 대량 데이터 삽입
-- ============================================================
-- 실행 방법:
--   psql -h <host> -U <user> -d <database> -f seed-dummy-data.sql
--
-- 데이터 규모:
--   users              100,000건
--   user_statistics     100,000건
--   questions             5,000건
--   categories               50건 (부모 10 + 자식 40)
--   category_questions    10,000건
--   tiers                     5건
--   matches             500,000건
--   rounds            2,500,000건
--   round_answers     5,000,000건
--   user_problem_banks 1,000,000건
--   user_tier_hisotries  500,000건
--   총 약 9,715,000건
-- ============================================================

BEGIN;

-- ============================================================
-- 0. 기존 더미데이터 정리
-- ============================================================
-- TRUNCATE
--   user_tier_hisotries,
--   user_problem_banks,
--   round_answers,
--   rounds,
--   matches,
--   category_questions,
--   user_statistics,
--   users,
--   questions,
--   categories,
--   tiers
-- CASCADE;

-- ============================================================
-- 1. Tiers (5건)
-- ============================================================
INSERT INTO tiers (name, min_points, max_points, icon_url)
VALUES
  ('Bronze',   0,    999,  NULL),
  ('Silver',   1000, 1999, NULL),
  ('Gold',     2000, 2999, NULL),
  ('Platinum', 3000, 3999, NULL),
  ('Diamond',  4000, NULL, NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. Categories (50건: 부모 10 + 자식 40)
-- ============================================================
-- 부모 카테고리
INSERT INTO categories (name, parent_id, is_leaf, status, question_count)
VALUES
  ('자료구조',       NULL, false, 'active', 0),
  ('알고리즘',       NULL, false, 'active', 0),
  ('운영체제',       NULL, false, 'active', 0),
  ('네트워크',       NULL, false, 'active', 0),
  ('데이터베이스',   NULL, false, 'active', 0),
  ('컴퓨터구조',     NULL, false, 'active', 0),
  ('소프트웨어공학',  NULL, false, 'active', 0),
  ('프로그래밍언어',  NULL, false, 'active', 0),
  ('웹개발',         NULL, false, 'active', 0),
  ('보안',           NULL, false, 'active', 0)
ON CONFLICT DO NOTHING;

-- 자식 카테고리 (부모당 4개씩)
DO $$
DECLARE
  parent RECORD;
  subcategories TEXT[];
  sub TEXT;
  i INT;
BEGIN
  FOR parent IN
    SELECT id, name FROM categories WHERE parent_id IS NULL ORDER BY id
  LOOP
    subcategories := CASE parent.name
      WHEN '자료구조'       THEN ARRAY['배열/리스트', '트리', '그래프', '해시']
      WHEN '알고리즘'       THEN ARRAY['정렬', '탐색', 'DP', '그리디']
      WHEN '운영체제'       THEN ARRAY['프로세스', '메모리', '파일시스템', '스케줄링']
      WHEN '네트워크'       THEN ARRAY['TCP/IP', 'HTTP', 'DNS', '소켓']
      WHEN '데이터베이스'   THEN ARRAY['SQL', '정규화', '인덱스', '트랜잭션']
      WHEN '컴퓨터구조'     THEN ARRAY['CPU', '캐시', '파이프라인', '메모리계층']
      WHEN '소프트웨어공학'  THEN ARRAY['디자인패턴', '테스트', 'CI/CD', '애자일']
      WHEN '프로그래밍언어'  THEN ARRAY['타입시스템', '컴파일러', '가비지컬렉션', '동시성']
      WHEN '웹개발'         THEN ARRAY['프론트엔드', '백엔드', 'REST API', '인증']
      WHEN '보안'           THEN ARRAY['암호화', '인증/인가', 'XSS/CSRF', '네트워크보안']
    END;

    i := 1;
    FOREACH sub IN ARRAY subcategories
    LOOP
      INSERT INTO categories (name, parent_id, is_leaf, status, question_count)
      VALUES (sub, parent.id, true, 'active', 0)
      ON CONFLICT DO NOTHING;
      i := i + 1;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- 3. Questions (5,000건)
-- ============================================================
INSERT INTO questions (question_type, content, correct_answer, explanation, difficulty, usage_count, is_active, quality_score, model_name)
SELECT
  (ARRAY['multiple', 'short', 'essay'])[floor(random() * 3 + 1)],
  CASE (ARRAY['multiple', 'short', 'essay'])[floor(random() * 3 + 1)]
    WHEN 'multiple' THEN jsonb_build_object(
      'type', 'multiple',
      'question', 'CS 문제 #' || i || ': 다음 중 올바른 것은?',
      'option', jsonb_build_array('보기 A', '보기 B', '보기 C', '보기 D')
    )
    WHEN 'short' THEN jsonb_build_object(
      'type', 'short',
      'question', 'CS 문제 #' || i || ': 다음 개념을 간단히 설명하시오.'
    )
    ELSE jsonb_build_object(
      'type', 'essay',
      'question', 'CS 문제 #' || i || ': 다음 주제에 대해 서술하시오.'
    )
  END,
  CASE (ARRAY['multiple', 'short', 'essay'])[floor(random() * 3 + 1)]
    WHEN 'multiple' THEN (ARRAY['A', 'B', 'C', 'D'])[floor(random() * 4 + 1)]
    ELSE '모범 답안 내용 #' || i
  END,
  '해설: 이 문제는 CS 기본 개념 #' || i || '에 대한 이해를 테스트합니다.',
  floor(random() * 5 + 1)::int,    -- difficulty 1~5
  floor(random() * 50)::int,        -- usage_count 0~49
  true,                              -- is_active
  floor(random() * 40 + 60)::int,   -- quality_score 60~99
  'clova-studio'
FROM generate_series(1, 5000) AS i;

-- ============================================================
-- 4. Category-Question 매핑 (10,000건, 문제당 평균 2카테고리)
-- ============================================================
INSERT INTO category_questions (category_id, question_id)
SELECT DISTINCT ON (c_id, q_id)
  c_id, q_id
FROM (
  SELECT
    (SELECT id FROM categories WHERE is_leaf = true ORDER BY random() LIMIT 1) AS c_id,
    id AS q_id
  FROM questions
  UNION ALL
  SELECT
    (SELECT id FROM categories WHERE is_leaf = true ORDER BY random() LIMIT 1) AS c_id,
    id AS q_id
  FROM questions
) sub
ON CONFLICT DO NOTHING;

-- 카테고리별 문제 수 갱신
UPDATE categories c
SET question_count = (
  SELECT COUNT(*) FROM category_questions cq WHERE cq.category_id = c.id
)
WHERE c.is_leaf = true;

-- ============================================================
-- 5. Users (100,000건) — 배치 삽입
-- ============================================================
INSERT INTO users (email, nickname, user_profile, oauth_provider, oauth_id, created_at)
SELECT
  'user' || i || '@test.com',
  'testuser_' || i,
  CASE WHEN random() > 0.7 THEN 'https://avatars.githubusercontent.com/u/' || i ELSE NULL END,
  'github',
  'github_' || i,
  NOW() - (random() * interval '365 days')
FROM generate_series(1, 100000) AS i;

-- ============================================================
-- 6. User Statistics (100,000건, users와 1:1)
-- ============================================================
INSERT INTO user_statistics (user_id, win_count, lose_count, tier_point, total_matches, exp_point, solved_count, correct_count)
SELECT
  u.id,
  floor(random() * 100)::int,
  floor(random() * 100)::int,
  floor(random() * 4500)::int,
  floor(random() * 200)::int,
  floor(random() * 10000)::int,
  floor(random() * 500)::int,
  floor(random() * 400)::int
FROM users u
WHERE u.oauth_id LIKE 'github_%';

-- correct_count가 solved_count를 초과하지 않도록 보정
UPDATE user_statistics
SET correct_count = solved_count
WHERE correct_count > solved_count;

-- ============================================================
-- 7. Matches (500,000건) — 10만건씩 배치 삽입
-- ============================================================
DO $$
DECLARE
  batch INT;
  min_uid BIGINT;
  max_uid BIGINT;
BEGIN
  SELECT MIN(id), MAX(id) INTO min_uid, max_uid FROM users WHERE oauth_id LIKE 'github_%';

  FOR batch IN 1..5
  LOOP
    INSERT INTO matches (player1_id, player2_id, winner_id, match_type, created_at)
    SELECT
      floor(random() * (max_uid - min_uid + 1) + min_uid)::bigint,
      CASE WHEN random() > 0.3
        THEN floor(random() * (max_uid - min_uid + 1) + min_uid)::bigint
        ELSE NULL  -- single play는 player2 없음
      END,
      NULL,  -- winner는 나중에 설정
      CASE WHEN random() > 0.3 THEN 'multi' ELSE 'single' END,
      NOW() - (random() * interval '365 days')
    FROM generate_series(1, 100000);

    RAISE NOTICE 'Matches batch % 완료', batch;
  END LOOP;
END $$;

-- winner 설정 (multi 매치의 70%에 승자 배정)
UPDATE matches
SET winner_id = CASE WHEN random() > 0.5 THEN player1_id ELSE player2_id END
WHERE match_type = 'multi'
  AND player2_id IS NOT NULL
  AND random() < 0.7;

-- ============================================================
-- 8. Rounds (2,500,000건) — 매치당 5라운드, 배치 삽입
-- ============================================================
DO $$
DECLARE
  batch_start BIGINT;
  batch_end BIGINT;
  total_matches BIGINT;
  batch_size BIGINT := 100000;
  min_qid INT;
  max_qid INT;
BEGIN
  SELECT MIN(id), MAX(id) INTO batch_start, total_matches FROM matches;
  batch_end := batch_start + batch_size - 1;
  SELECT MIN(id), MAX(id) INTO min_qid, max_qid FROM questions;

  WHILE batch_start <= total_matches
  LOOP
    INSERT INTO rounds (match_id, question_id, round_number)
    SELECT
      m.id,
      floor(random() * (max_qid - min_qid + 1) + min_qid)::int,
      r
    FROM matches m
    CROSS JOIN generate_series(1, 5) AS r
    WHERE m.id BETWEEN batch_start AND batch_end;

    RAISE NOTICE 'Rounds batch % ~ % 완료', batch_start, batch_end;
    batch_start := batch_end + 1;
    batch_end := batch_start + batch_size - 1;
  END LOOP;
END $$;

-- ============================================================
-- 9. Round Answers (5,000,000건) — 라운드당 2명, 배치 삽입
-- ============================================================
DO $$
DECLARE
  batch_start BIGINT;
  batch_end BIGINT;
  max_round_id BIGINT;
  batch_size BIGINT := 500000;
  min_uid BIGINT;
  max_uid BIGINT;
BEGIN
  SELECT MIN(id), MAX(id) INTO batch_start, max_round_id FROM rounds;
  batch_end := batch_start + batch_size - 1;
  SELECT MIN(id), MAX(id) INTO min_uid, max_uid FROM users WHERE oauth_id LIKE 'github_%';

  WHILE batch_start <= max_round_id
  LOOP
    INSERT INTO round_answers (user_id, round_id, user_answer, score, answer_status, ai_feedback)
    SELECT
      floor(random() * (max_uid - min_uid + 1) + min_uid)::bigint,
      r.id,
      '사용자 답변 내용 ' || r.id,
      floor(random() * 11)::int,  -- score 0~10
      (ARRAY['correct', 'incorrect', 'partial'])[floor(random() * 3 + 1)]::varchar,
      CASE WHEN random() > 0.3
        THEN 'AI 피드백: 답변에 대한 분석 내용입니다. 라운드 ' || r.id
        ELSE NULL
      END
    FROM rounds r
    WHERE r.id BETWEEN batch_start AND batch_end;

    -- 두 번째 플레이어 답안
    INSERT INTO round_answers (user_id, round_id, user_answer, score, answer_status, ai_feedback)
    SELECT
      floor(random() * (max_uid - min_uid + 1) + min_uid)::bigint,
      r.id,
      '상대 답변 내용 ' || r.id,
      floor(random() * 11)::int,
      (ARRAY['correct', 'incorrect', 'partial'])[floor(random() * 3 + 1)]::varchar,
      CASE WHEN random() > 0.3
        THEN 'AI 피드백: 상대 답변에 대한 분석입니다. 라운드 ' || r.id
        ELSE NULL
      END
    FROM rounds r
    WHERE r.id BETWEEN batch_start AND batch_end;

    RAISE NOTICE 'Round Answers batch % ~ % 완료', batch_start, batch_end;
    batch_start := batch_end + 1;
    batch_end := batch_start + batch_size - 1;
  END LOOP;
END $$;

-- ============================================================
-- 10. User Problem Banks (1,000,000건) — 배치 삽입
-- ============================================================
DO $$
DECLARE
  batch INT;
  min_uid BIGINT;
  max_uid BIGINT;
  min_qid INT;
  max_qid INT;
  min_mid BIGINT;
  max_mid BIGINT;
BEGIN
  SELECT MIN(id), MAX(id) INTO min_uid, max_uid FROM users WHERE oauth_id LIKE 'github_%';
  SELECT MIN(id), MAX(id) INTO min_qid, max_qid FROM questions;
  SELECT MIN(id), MAX(id) INTO min_mid, max_mid FROM matches;

  FOR batch IN 1..5
  LOOP
    INSERT INTO user_problem_banks (user_id, question_id, match_id, is_bookmarked, user_answer, answer_status, ai_feedback, created_at)
    SELECT
      floor(random() * (max_uid - min_uid + 1) + min_uid)::bigint,
      floor(random() * (max_qid - min_qid + 1) + min_qid)::int,
      floor(random() * (max_mid - min_mid + 1) + min_mid)::bigint,
      random() < 0.15,  -- 15% 북마크
      '사용자가 제출한 답변입니다. 문제 #' || i,
      (ARRAY['correct', 'incorrect', 'partial'])[floor(random() * 3 + 1)]::varchar,
      'AI 피드백 내용입니다.',
      NOW() - (random() * interval '365 days')
    FROM generate_series(1, 200000) AS i;

    RAISE NOTICE 'Problem Banks batch % 완료', batch;
  END LOOP;
END $$;

-- ============================================================
-- 11. User Tier Histories (500,000건) — 배치 삽입
-- ============================================================
DO $$
DECLARE
  batch INT;
  min_uid BIGINT;
  max_uid BIGINT;
  min_tid BIGINT;
  max_tid BIGINT;
  min_mid BIGINT;
  max_mid BIGINT;
BEGIN
  SELECT MIN(id), MAX(id) INTO min_uid, max_uid FROM users WHERE oauth_id LIKE 'github_%';
  SELECT MIN(id), MAX(id) INTO min_tid, max_tid FROM tiers;
  SELECT MIN(id), MAX(id) INTO min_mid, max_mid FROM matches;

  FOR batch IN 1..5
  LOOP
    INSERT INTO user_tier_hisotries (user_id, tier_id, match_id, tier_point, tier_change, updated_at)
    SELECT
      floor(random() * (max_uid - min_uid + 1) + min_uid)::bigint,
      floor(random() * (max_tid - min_tid + 1) + min_tid)::bigint,
      floor(random() * (max_mid - min_mid + 1) + min_mid)::bigint,
      floor(random() * 4500)::int,
      floor(random() * 41 - 20)::int,  -- -20 ~ +20
      NOW() - (random() * interval '365 days')
    FROM generate_series(1, 100000);

    RAISE NOTICE 'Tier Histories batch % 완료', batch;
  END LOOP;
END $$;

COMMIT;

-- ============================================================
-- 12. 통계 갱신
-- ============================================================
ANALYZE users;
ANALYZE user_statistics;
ANALYZE matches;
ANALYZE rounds;
ANALYZE round_answers;
ANALYZE questions;
ANALYZE categories;
ANALYZE category_questions;
ANALYZE user_problem_banks;
ANALYZE user_tier_hisotries;
ANALYZE tiers;

-- ============================================================
-- 데이터 검증
-- ============================================================
SELECT '====== 더미데이터 삽입 결과 ======' AS info;
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL SELECT 'user_statistics', COUNT(*) FROM user_statistics
UNION ALL SELECT 'matches', COUNT(*) FROM matches
UNION ALL SELECT 'rounds', COUNT(*) FROM rounds
UNION ALL SELECT 'round_answers', COUNT(*) FROM round_answers
UNION ALL SELECT 'questions', COUNT(*) FROM questions
UNION ALL SELECT 'categories', COUNT(*) FROM categories
UNION ALL SELECT 'category_questions', COUNT(*) FROM category_questions
UNION ALL SELECT 'user_problem_banks', COUNT(*) FROM user_problem_banks
UNION ALL SELECT 'user_tier_hisotries', COUNT(*) FROM user_tier_hisotries
UNION ALL SELECT 'tiers', COUNT(*) FROM tiers
ORDER BY table_name;
