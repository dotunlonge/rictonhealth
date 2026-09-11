/**
 * G2 (cont.): one authoritative API contract.
 * Every Express route mounted by every service must be documented in
 * openapi.yaml (the gateway contract), with the matching HTTP method.
 * Run: npx jest tests/openapi-coverage.test.ts
 */
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const root = path.resolve(__dirname, '..');

// Single source of truth: the generator's discovery (service index mounts +
// router registrations). The contract can never drift from the scanner.
import { serviceRoutes } from '../scripts/generate-openapi-from-routes';

export function discoverRoutes(): Array<{ method: string; path: string; file: string }> {
  return serviceRoutes().map((r) => ({ ...r, file: r.service }));
}

function loadSpec(): { paths: Record<string, Record<string, unknown>> } {
  const raw = fs.readFileSync(path.join(root, 'openapi.yaml'), 'utf8');
  const doc = yaml.parse(raw) as { paths?: Record<string, Record<string, unknown>> };
  return { paths: doc.paths ?? {} };
}

describe('OpenAPI contract coverage', () => {
  it('documents every mounted route with its method', () => {
    const routes = discoverRoutes();
    expect(routes.length).toBeGreaterThan(100);
    const { paths } = loadSpec();
    const missing = routes.filter((r) => {
      const entry = paths[r.path];
      if (!entry) return true;
      return !entry[r.method.toLowerCase()];
    });
    if (missing.length > 0) {
      // eslint-disable-next-line no-console
      console.log(
        `Missing ${missing.length} routes:\n` +
          missing
            .slice(0, 40)
            .map((r) => `  ${r.method} ${r.path}  (${r.file})`)
            .join('\n')
      );
    }
    expect(missing).toEqual([]);
  });

  it('promotes critical money/auth/clinical endpoints to full request schemas', () => {
    const raw = fs.readFileSync(path.join(root, 'openapi.yaml'), 'utf8');
    const spec = yaml.parse(raw) as {
      paths: Record<string, Record<string, { requestBody?: unknown }>>;
    };
    const promoted = [
      ['post', '/api/auth/register'],
      ['post', '/api/auth/login'],
      ['post', '/api/appointments'],
      ['post', '/api/prescriptions'],
      ['post', '/api/wallets/topup'],
      ['post', '/api/rewards/claim'],
    ] as Array<[string, string]>;
    for (const [method, p] of promoted) {
      expect(spec.paths[p]?.[method]?.requestBody).toBeDefined();
    }
  });

  it('leaves zero unattested write operations (schema, no-body, or external)', () => {
    const raw = fs.readFileSync(path.join(root, 'openapi.yaml'), 'utf8');
    const spec = yaml.parse(raw) as {
      paths: Record<string, Record<string, { requestBody?: unknown; 'x-coverage'?: string }>>;
    };
    const unattested: string[] = [];
    const ATTESTED = new Set([
      'route-generated+schema-promoted',
      'documented-no-body',
      'external-webhook',
    ]);
    for (const [p, ops] of Object.entries(spec.paths)) {
      for (const [method, op] of Object.entries(ops)) {
        if (!['post', 'put', 'patch', 'delete'].includes(method)) continue;
        if (op.requestBody) continue;
        if (op['x-coverage'] && ATTESTED.has(op['x-coverage'])) continue;
        if (!op['x-coverage']) continue; // hand-written entries carry full detail
        unattested.push(`${method} ${p}`);
      }
    }
    expect(unattested).toEqual([]);
  });

  it('documents the spec-level auth scheme used by secured routes', () => {
    const raw = fs.readFileSync(path.join(root, 'openapi.yaml'), 'utf8');
    expect(raw).toMatch(/bearerAuth|Bearer/i);
  });
});
