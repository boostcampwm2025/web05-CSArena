-- ============================================================
-- 부하 한계 측정용 시드 — 1000명 유저
-- ============================================================
-- 11번 측정(websocket-multi-instance)의 50명 시드와 별개로 운영.
-- ROOMS=500 = VU 1000 시나리오까지 커버.
--
-- 실행:
--   docker exec -i web05-postgres-multi psql -U postgres -d boostcamp \
--     < scripts/benchmarks/load-limit/seed-bench-users-1000.sql
--
-- 이후 sign-bench-tokens.mjs를 다시 돌리면 tokens.json이 1000개 entry로 갱신된다.
-- (sign-bench-tokens는 'dev-benchuser%' LIKE 패턴으로 동적 조회하므로 코드 변경 불필요)
-- ============================================================
BEGIN;

-- tiers — name 컬럼에 UNIQUE 제약이 없어 ON CONFLICT 작동 안 함.
-- WHERE NOT EXISTS로 멱등성 보장 (재실행해도 중복 추가 X).
INSERT INTO tiers (name, min_points, max_points, icon_url)
SELECT v.name, v.min_pts, v.max_pts, v.icon
FROM (VALUES
  ('Bronze'::varchar,   0,    999,  NULL::varchar),
  ('Silver'::varchar,   1000, 1999, NULL::varchar),
  ('Gold'::varchar,     2000, 2999, NULL::varchar),
  ('Platinum'::varchar, 3000, 3999, NULL::varchar),
  ('Diamond'::varchar,  4000, NULL, NULL::varchar)
) AS v(name, min_pts, max_pts, icon)
WHERE NOT EXISTS (SELECT 1 FROM tiers t WHERE t.name = v.name);

-- 최소 카테고리 1개 — 동일하게 WHERE NOT EXISTS
INSERT INTO categories (name, parent_id, is_leaf, status, question_count)
SELECT '벤치마크'::varchar, NULL, true, 'active', 0
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = '벤치마크');

-- 유저 1~1000 — bench-user-N 규칙 (기존 50명 시드와 동일 oauth_id 패턴이라 ON CONFLICT로 멱등 동작)
INSERT INTO users (nickname, oauth_provider, oauth_id, user_profile, email)
SELECT
  'benchuser' || n AS nickname,
  'github' AS oauth_provider,
  'dev-benchuser' || n AS oauth_id,
  NULL AS user_profile,
  'bench' || n || '@test.local' AS email
FROM generate_series(1, 1000) AS n
ON CONFLICT (oauth_provider, oauth_id) DO NOTHING;

-- user_statistics — ELO 100 폭 안에 분포해 매칭 ±100 윈도우 안에서 즉시 페어링
INSERT INTO user_statistics (user_id, win_count, lose_count, tier_point, total_matches, exp_point, solved_count, correct_count)
SELECT
  u.id,
  0 AS win_count,
  0 AS lose_count,
  1000 + ((u.id) % 10) * 10 AS tier_point,  -- 1000~1090 범위
  0 AS total_matches,
  0 AS exp_point,
  0 AS solved_count,
  0 AS correct_count
FROM users u
WHERE u.oauth_id LIKE 'dev-benchuser%'
ON CONFLICT (user_id) DO NOTHING;

COMMIT;

-- 확인 — 1000명이 시드되었는지
SELECT COUNT(*) AS bench_users FROM users WHERE oauth_id LIKE 'dev-benchuser%';
SELECT COUNT(*) AS bench_stats FROM user_statistics us
  JOIN users u ON u.id = us.user_id WHERE u.oauth_id LIKE 'dev-benchuser%';
