// 将 apps/web/dist 同步到 apps/api/web-dist（NestJS ServeStatic 挂载点）。
// Dockerfile 内由 COPY 直达，此脚本仅用于本地 build/prod 联调。
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const from = path.join(root, 'apps', 'web', 'dist');
const to = path.join(root, 'apps', 'api', 'web-dist');

if (!fs.existsSync(from)) {
  console.error(`web dist 不存在：${from}，请先 pnpm build:web`);
  process.exit(1);
}
fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
console.log(`web-dist 已同步：${to}`);
