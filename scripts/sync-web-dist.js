// Sync apps/web/dist to apps/api/web-dist (the NestJS ServeStatic mount point).
// Inside the Dockerfile this is done directly by COPY; this script is only for local build/prod integration.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const from = path.join(root, 'apps', 'web', 'dist');
const to = path.join(root, 'apps', 'api', 'web-dist');

if (!fs.existsSync(from)) {
  console.error(`web dist not found: ${from}, run pnpm build:web first`);
  process.exit(1);
}
fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
console.log(`web-dist synced: ${to}`);
