/**
 * 부하 한계 측정용 JWT 일괄 발급 — Fargate 환경 (EC2 PG via SSH)
 *
 * sign-bench-tokens.mjs(로컬 docker 가정)의 클라우드 변형.
 * SSH로 EC2의 csarena-postgres 컨테이너에 접근해 dev-benchuser% 유저 조회.
 *
 * 사용 (필수 env):
 *   JWT_SECRET='<production JWT_SECRET>' \
 *     DB_PASSWORD='<production DB_PASSWORD>' \
 *     SSH_KEY=~/Downloads/csarena.pem \
 *     EC2_HOST=ubuntu@13.125.237.251 \
 *     PG_CONTAINER=csarena-postgres \
 *     DB_USER=csarena DB_NAME=csarena \
 *     node sign-bench-tokens-cloud.mjs
 *
 * production secrets는 task definition v17에서 받아 export — 코드/메모에 적지 말 것.
 *
 * 출력: ./tokens.json (load-test-rooms.js가 ../websocket-multi-instance/tokens.json을
 *       참조하므로, 측정 호스트에서 두 파일이 동일하도록 복사 필요)
 */
import jwt from 'jsonwebtoken';
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`ERROR: ${name} 환경변수가 필요합니다. production 값으로 export 후 재실행.`);
    process.exit(1);
  }
  return v;
}

const SECRET = requireEnv('JWT_SECRET');
const DB_PASSWORD = requireEnv('DB_PASSWORD');
const SSH_KEY = process.env.SSH_KEY || '~/Downloads/csarena.pem';
const EC2_HOST = process.env.EC2_HOST || 'ubuntu@13.125.237.251';
const PG_CONTAINER = process.env.PG_CONTAINER || 'csarena-postgres';
const DB_USER = process.env.DB_USER || 'csarena';
const DB_NAME = process.env.DB_NAME || 'csarena';

// SSH 한 번에 전체 결과 받기
const sshCmd = `ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no ${EC2_HOST} ` +
  `"docker exec -e PGPASSWORD='${DB_PASSWORD}' ${PG_CONTAINER} ` +
  `psql -U ${DB_USER} -d ${DB_NAME} -t -A -F'|' -c ` +
  `\\"SELECT id, nickname, oauth_id FROM users WHERE oauth_id LIKE 'dev-benchuser%' ORDER BY id\\""`;

console.error(`Querying users via SSH...`);
const raw = execSync(sshCmd, { encoding: 'utf8' }).trim();
const rows = raw.split('\n').filter(Boolean);

if (rows.length === 0) {
  console.error('ERROR: dev-benchuser% 유저를 찾을 수 없습니다. 시드 SQL을 먼저 실행하세요.');
  process.exit(1);
}

console.error(`Found ${rows.length} bench users. Signing tokens...`);

const tokens = [];
for (const row of rows) {
  const [id, nickname, oauthId] = row.split('|');
  const token = jwt.sign(
    { sub: Number(id), visibleId: oauthId, nickname, oauthProvider: 'github' },
    SECRET,
    { expiresIn: '4h' },  // 12회 측정 + 분석 시간 고려해 4시간
  );
  tokens.push({ userId: Number(id), nickname, token });
}

const outPath = new URL('./tokens.json', import.meta.url);
writeFileSync(outPath, JSON.stringify(tokens, null, 2));
console.log(`Wrote ${tokens.length} tokens to ${outPath.pathname}`);
