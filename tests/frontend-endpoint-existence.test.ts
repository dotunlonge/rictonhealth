/**
 * Every literal frontend API call must resolve to a documented backend route.
 * (Template-composed mobile paths are covered by mobile contract-parity tests.)
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

function discoverWebCalls(): Array<{ method: string; path: string; file: string }> {
  const out: Array<{ method: string; path: string; file: string }> = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) continue;
      const src = fs.readFileSync(full, 'utf8');
      const re = /api\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        let p = m[2].replace(/\$\{[^}]+\}/g, '{param}').split('?')[0];
        if (!p.startsWith('/api/')) p = `/api${p}`;
        out.push({ method: m[1].toUpperCase(), path: p, file: full });
      }
    }
  };
  walk(path.join(root, 'apps', 'web', 'src'));
  return out;
}

function loadSpecPaths(): Record<string, Record<string, unknown>> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const yaml = require('yaml') as {
    parse: (s: string) => { paths?: Record<string, Record<string, unknown>> };
  };
  const raw = fs.readFileSync(path.join(root, 'openapi.yaml'), 'utf8');
  return yaml.parse(raw).paths ?? {};
}

describe('frontend endpoint existence', () => {
  it('every web API call resolves to a backend route+method', () => {
    const calls = discoverWebCalls();
    expect(calls.length).toBeGreaterThan(40);
    const paths = loadSpecPaths();
    const missing = calls.filter((c) => {
      const norm = c.path.replace(/\{[^}]+\}/g, '{param}');
      return !Object.entries(paths).some(
        ([sp, ops]) =>
          sp.replace(/\{[^}]+\}/g, '{param}') === norm && ops[c.method.toLowerCase()] !== undefined
      );
    });
    if (missing.length > 0) {
      // eslint-disable-next-line no-console
      console.log(missing.map((c) => `  ${c.method} ${c.path} (${c.file})`).join('\n'));
    }
    expect(missing).toEqual([]);
  });
});
