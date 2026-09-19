const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(
  path.join(dist, 'index.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>signoz-open-dashboard embed (M1 placeholder)</title></head><body><div id="embed-root">embed placeholder — replaced once the M2 replicated frontend lands</div></body></html>`,
);
console.log('web placeholder built to', dist);
