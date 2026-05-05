/**
 * scale-out 테스트용 JWT 토큰 일괄 생성
 *
 * ECS 배포 서버의 데이터베이스에 미리 시드된 테스트 유저 ID를 기반으로
 * tokens.json을 생성한다.
 *
 * 사용:
 *   cd scripts/benchmarks
 *   JWT_SECRET=<backend-jwt-secret> \
 *   USER_IDS=2,3,4,5,...  \
 *     node scale-out/sign-bench-tokens.mjs
 *
 *   # 생성된 tokens.json 확인
 *   jq 'length' scale-out/tokens.json
 *
 * 환경변수:
 *   JWT_SECRET  — 백엔드와 동일한 JWT 시크릿 (필수)
 *   USER_IDS    — 콤마 구분 유저 ID 목록 (없으면 2~101 자동 생성)
 *   OUTPUT      — 출력 파일 경로 (기본: scale-out/tokens.json)
 *
 * 주의:
 *   - USER_IDS에 지정한 ID는 실제 DB에 존재해야 한다
 *   - 없는 유저 ID로 발급한 토큰은 Socket.IO 연결 시 인증 실패
 */
import jwt from 'jsonwebtoken';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  console.error('ERROR: JWT_SECRET 환경변수가 필요합니다.');
  console.error('  JWT_SECRET=<secret> node scale-out/sign-bench-tokens.mjs');
  process.exit(1);
}

const OUTPUT = process.env.OUTPUT || join(__dirname, 'tokens.json');

// USER_IDS가 없으면 2~101 (100개) 자동 생성
const userIds = process.env.USER_IDS
  ? process.env.USER_IDS.split(',').map((s) => {
      const n = Number(s.trim());
      if (Number.isNaN(n)) throw new Error(`Invalid user ID: "${s}"`);
      return n;
    })
  : Array.from({ length: 100 }, (_, i) => i + 2);

const tokens = userIds.map((id) => {
  const payload = {
    sub: id,
    visibleId: `bench-user-${id}`,
    nickname: `BenchUser${id}`,
    oauthProvider: 'github',
  };
  return { token: jwt.sign(payload, SECRET, { expiresIn: '2h' }) };
});

writeFileSync(OUTPUT, JSON.stringify(tokens, null, 2));
console.log(`${tokens.length}개 토큰 생성 완료 → ${OUTPUT}`);
