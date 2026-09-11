/* Staging load smoke: service health + auth validation under concurrency.
 *
 * SLOs asserted here (staging smoke; production targets live in docs/SLOS.md):
 *  - p99 latency < 1500ms on anonymous endpoints @ 20 connections
 *  - zero 5xx responses
 *
 * Usage:
 *   node scripts/load-smoke.js                                   # gateway :8000 auth login
 *   LOAD_METHOD=GET LOAD_PATH=/health BASE_URL=http://localhost:3005 node scripts/load-smoke.js
 */
const { execFileSync } = require('child_process');

const BASE = process.env.BASE_URL || 'http://localhost:8000';
const METHOD = process.env.LOAD_METHOD || 'POST';
const PATH = process.env.LOAD_PATH || '/api/auth/login';
const BODY = process.env.LOAD_BODY || '{}';
const CONNECTIONS = Number(process.env.LOAD_CONNECTIONS || 20);
const DURATION_S = Number(process.env.LOAD_DURATION_S || 20);

function runAutocannon() {
  // Direct binary path: spawning via npx re-resolves the package every run
  // and hangs when the registry is flaky. Falls back to npx when absent.
  const path = require('path');
  const fs = require('fs');
  const localBin = path.join(__dirname, '..', 'node_modules', '.bin', 'autocannon');
  const useNpx = !fs.existsSync(localBin);
  const args = useNpx ? ['--yes', 'autocannon', '--json'] : ['--json'];
  const cmd = useNpx ? 'npx' : localBin;
  args.push('-c', String(CONNECTIONS), '-d', String(DURATION_S), '-m', METHOD);
  if (METHOD !== 'GET') {
    args.push('-H', 'Content-Type: application/json', '-b', BODY);
  }
  args.push(`${BASE}${PATH}`);
  const out = execFileSync(cmd, args, {
    encoding: 'utf8',
    timeout: (DURATION_S + 120) * 1000,
  });
  return JSON.parse(out);
}

function main() {
  const result = runAutocannon();
  const p99 = result.latency.p99;
  const errors = result.errors || 0;
  const byStatus = result.statusCodeStats || {};
  const bad = Object.entries(byStatus)
    .filter(([code]) => code.startsWith('5'))
    .reduce((s, [, n]) => s + n, 0);
  console.log(
    `${METHOD} ${BASE}${PATH}: requests=${result.requests.total} p99=${p99}ms errors=${errors} 5xx=${bad} status=${JSON.stringify(byStatus)}`
  );
  let ok = true;
  if (p99 > 1500) {
    console.error(`FAIL: p99 ${p99}ms > 1500ms`);
    ok = false;
  }
  if (errors > 0 || bad > 0) {
    console.error(`FAIL: errors=${errors} 5xx=${bad}`);
    ok = false;
  }
  process.exit(ok ? 0 : 1);
}

main();
