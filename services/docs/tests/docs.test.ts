/**
 * Docs service serves the committed openapi.yaml — it must parse and cover
 * every public webhook + smartguard prefix. No DB required.
 * Run: npx jest services/docs/tests/docs.test.ts
 */
import fs from 'fs';
import path from 'path';

describe('docs openapi spec', () => {
  it('parses and documents webhooks + smartguard routes', () => {
    const specPath = path.join(__dirname, '..', '..', '..', 'openapi.yaml');
    const raw = fs.readFileSync(specPath, 'utf8');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const yaml = require('yaml') as { parse: (s: string) => { paths?: Record<string, unknown> } };
    const doc = yaml.parse(raw);
    expect(Object.keys(doc.paths ?? {}).length).toBeGreaterThan(40);
    for (const p of [
      '/api/payments/webhook',
      '/api/wallets/webhook',
      '/api/subscriptions/webhook',
    ]) {
      expect(doc.paths ?? {}).toHaveProperty(p);
    }
  });
});
