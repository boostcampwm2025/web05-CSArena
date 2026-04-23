/**
 * 테스트용 JWT 발급
 *
 * 사용:
 *   cd scripts/benchmarks
 *   pnpm install --ignore-workspace
 *   JWT_SECRET=<backend-secret> node websocket-multi-instance/sign-jwt.mjs
 */
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_multi_instance_32chars';

const users = [
  { sub: 2, visibleId: 'dev-TestPlayer1', nickname: 'TestPlayer1', oauthProvider: 'github' },
  { sub: 3, visibleId: 'dev-TestPlayer2', nickname: 'TestPlayer2', oauthProvider: 'github' },
];

for (const u of users) {
  const token = jwt.sign(u, SECRET, { expiresIn: '1h' });
  console.log(`USER ${u.sub} (${u.nickname}):`);
  console.log(token);
  console.log();
}
