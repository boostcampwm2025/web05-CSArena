-- ============================================================
-- OAuth 로그인 인덱스
--
-- 대상 쿼리:
--   AuthService.validateOAuthUser():
--     SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?
--
-- 적용 방법:
--   docker exec web05-postgres psql -U postgres -d boostcamp -f /tmp/auth-indexes.sql
-- ============================================================

-- ============================================================
-- Section A: 적용 전 성능 측정
-- ============================================================

-- [Q1] OAuth 로그인 조회 (Seq Scan 확인)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, nickname, oauth_provider, oauth_id
FROM users
WHERE oauth_provider = 'github' AND oauth_id = 'github_50000';

-- ============================================================
-- Section B: 인덱스 생성
-- ============================================================

-- B-1. users → (oauth_provider, oauth_id) UNIQUE 인덱스
--   oauth_provider + oauth_id 조합은 유저를 유일하게 식별하므로 UNIQUE
--   dev-login, OAuth 콜백 등 인증 경로 전체가 이 조건으로 조회함
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth
  ON users (oauth_provider, oauth_id);

ANALYZE users;

-- ============================================================
-- Section C: 적용 후 성능 측정
-- ============================================================

-- [Q1] 동일 쿼리 — Index Scan으로 전환 확인
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, nickname, oauth_provider, oauth_id
FROM users
WHERE oauth_provider = 'github' AND oauth_id = 'github_50000';

-- ============================================================
-- Section D: 롤백
-- ============================================================
-- DROP INDEX IF EXISTS idx_users_oauth;
-- ANALYZE users;
