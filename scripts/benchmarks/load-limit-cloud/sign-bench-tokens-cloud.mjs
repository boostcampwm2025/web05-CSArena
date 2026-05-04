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
import { execFileSync } from 'node:child_process';

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`ERROR: ${name} 환경변수가 필요합니다. production 값으로 export 후 재실행.`);
    process.exit(1);
  }
  return v;
}

// 식별자(컨테이너명, DB 사용자/이름) shell 주입 차단 — 영숫자·하이픈·언더스코어만 허용
function validateIdentifier(name, value) {
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    console.error(`ERROR: ${name}에 허용되지 않은 문자 포함: ${value}`);
    process.exit(1);
  }
}

// 임의 문자열을 single-quoted shell literal로 안전하게 escape
// 예: hello world → 'hello world'
//     it's a      → 'it'\''s a'
function shellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

const SECRET = requireEnv('JWT_SECRET');
const DB_PASSWORD = requireEnv('DB_PASSWORD');
const SSH_KEY = process.env.SSH_KEY || '~/Downloads/csarena.pem';
const EC2_HOST = process.env.EC2_HOST || 'ubuntu@13.125.237.251';
const PG_CONTAINER = process.env.PG_CONTAINER || 'csarena-postgres';
const DB_USER = process.env.DB_USER || 'csarena';
const DB_NAME = process.env.DB_NAME || 'csarena';

validateIdentifier('PG_CONTAINER', PG_CONTAINER);
validateIdentifier('DB_USER', DB_USER);
validateIdentifier('DB_NAME', DB_NAME);

// Remote command — DB_PASSWORD는 shellQuote로 escape (single quote/특수문자 안전).
// SQL은 fixed literal (사용자 입력 없음).
const remoteCmd =
  `docker exec -e PGPASSWORD=${shellQuote(DB_PASSWORD)} ${PG_CONTAINER} ` +
  `psql -U ${DB_USER} -d ${DB_NAME} -t -A -F'|' -c ` +
  `"SELECT id, nickname, oauth_id FROM users WHERE oauth_id LIKE 'dev-benchuser%' ORDER BY id"`;

// execFileSync + 인자 배열로 ssh 실행 — 로컬 shell 주입 위험 차단.
// StrictHostKeyChecking=accept-new: 첫 접속 시 호스트 키 자동 등록(TOFU),
//   이후 변경 감지. =no(완전 무시)와 달리 MITM 일부 방어.
const sshArgs = [
  '-i', SSH_KEY,
  '-o', 'StrictHostKeyChecking=accept-new',
  '-o', 'BatchMode=yes',
  EC2_HOST,
  remoteCmd,
];

console.error(`Querying users via SSH...`);
const raw = execFileSync('ssh', sshArgs, { encoding: 'utf8' }).trim();
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
