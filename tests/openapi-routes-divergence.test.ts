/**
 * A4: Express/Kong routes must not drift from OpenAPI (TDD RED→GREEN).
 * Static: combines service mounts (src/index.ts `app.use`) with route
 * literals (`router.<verb>('...')`) and requires each in openapi.yaml;
 * requires every OpenAPI path to sit behind a Kong prefix.
 * Run: npx jest tests/openapi-routes-divergence.test.ts
 */
import fs from 'fs';
import path from 'path';

const root = (...p: string[]) => path.join(__dirname, '..', ...p);
const read = (p: string) => fs.readFileSync(root(p), 'utf8');

/** Map each routes file to its mount prefixes via `import VAR from './routes/FILE'` + `app.use('PREFIX', VAR)`. */
function serviceMounts(): Map<string, string[]> {
  const mounts = new Map<string, string[]>();
  for (const dir of fs.readdirSync(root('services'))) {
    const index = root('services', dir, 'src', 'index.ts');
    if (!fs.existsSync(index)) continue;
    const src = fs.readFileSync(index, 'utf8');
    const fileByVar = new Map<string, string>();
    for (const m of src.matchAll(/import\s+(\w+)\s+from\s+['"`]\.\/routes\/([^'"`]+)['"`]/g)) {
      fileByVar.set(m[1], m[2].replace(/\.ts$/, ''));
    }
    for (const m of src.matchAll(
      /import\s*\{([^}]+)\}\s*from\s*['"`]\.\/routes\/([^'"`]+)['"`]/g
    )) {
      for (const v of m[1].split(',').map((s) => s.trim().split(/\s+/).pop()!)) {
        fileByVar.set(v, m[2].replace(/\.ts$/, ''));
      }
    }
    const prefixByVar = new Map<string, string[]>();
    for (const m of src.matchAll(/app\.use\(\s*['"`](\/api\/[A-Za-z-]+)['"`]\s*,\s*(\w+)/g)) {
      prefixByVar.set(m[2], [...(prefixByVar.get(m[2]) ?? []), m[1]]);
    }
    const routesDir = root('services', dir, 'src', 'routes');
    if (!fs.existsSync(routesDir)) continue;
    for (const f of fs.readdirSync(routesDir).filter((x) => x.endsWith('.ts'))) {
      const base = f.replace(/\.ts$/, '');
      const vars = [...fileByVar.entries()].filter(([, file]) => file === base).map(([v]) => v);
      const prefixes = vars.flatMap((v) => prefixByVar.get(v) ?? []);
      mounts.set(
        `${dir}/${base}`,
        prefixes.length > 0 ? [...new Set(prefixes)] : [...new Set(prefixByVar.values())].flat()
      );
    }
  }
  return mounts;
}

function expressPaths(): string[] {
  const mounts = serviceMounts();
  const out: string[] = [];
  for (const [fileKey, prefixes] of mounts) {
    const [dir, ...rest] = fileKey.split('/');
    const src = fs.readFileSync(
      root('services', dir, 'src', 'routes', `${rest.join('/')}.ts`),
      'utf8'
    );
    for (const m of src.matchAll(
      /router\.(get|post|put|patch|delete)\(\s*['"`](\/[^'"`$]*?)['"`]/g
    )) {
      const rel = m[2].replace(/:([A-Za-z_]+)/g, '{$1}');
      for (const mount of prefixes) {
        out.push(`${m[1].toUpperCase()} ${mount}${rel === '/' ? '' : rel}`);
      }
    }
  }
  return [...new Set(out)];
}

function openapiPaths(): Set<string> {
  const spec = read('openapi.yaml');
  const paths = new Set<string>();
  for (const m of spec.matchAll(/^ {2}"?(\/api\/[^"\s:]+)"?:/gm)) {
    paths.add(m[1]);
  }
  return paths;
}

function kongPrefixes(): string[] {
  const kong = read('gateway/kong.yml');
  return [...kong.matchAll(/^\s+-\s+(\/api\/[A-Za-z-]+|\/docs)\s*$/gm)].map((m) => m[1]);
}

describe('route divergence', () => {
  it('every Express route is documented in OpenAPI', () => {
    const documented = openapiPaths();
    const missing = expressPaths().filter((route) => {
      const [, p] = route.split(' ');
      return ![...documented].some((d) => d === p);
    });
    expect({ missing, count: missing.length }).toEqual({ missing: [], count: 0 });
  });

  it('every OpenAPI path sits behind a Kong prefix (or is internal-only)', () => {
    const prefixes = kongPrefixes();
    const orphaned = [...openapiPaths()].filter(
      (p) =>
        !prefixes.some((k) => p === k || p.startsWith(`${k}/`)) && !p.startsWith('/api/internal/')
    );
    expect({ orphaned }).toEqual({ orphaned: [] });
  });
});
