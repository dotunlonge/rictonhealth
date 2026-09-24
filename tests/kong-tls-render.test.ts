/**
 * Kong TLS render (domain attach without AWS console).
 * Pure function under test; the CLI wrapper lives in scripts/render-kong-tls.ts.
 */
import { renderKongTls } from '../scripts/render-kong-tls';

const BASE_KONG = `_format_version: '3.0'
consumers:
  - username: ricton-client
services:
  - name: appointment-service
    url: http://appointment-service:3005
    routes:
      - name: appointment-routes
        paths:
          - /api/appointments
        strip_path: false
`;

describe('Kong TLS render (domain attach)', () => {
  it('ships byte-identical config when no domain is set (HTTP as today)', () => {
    expect(renderKongTls(BASE_KONG, {})).toBe(BASE_KONG);
  });

  it('adds a global ACME plugin backed by the stack redis when domain + email are set', () => {
    const out = renderKongTls(BASE_KONG, {
      apiDomain: 'api.ricton.com',
      acmeEmail: 'ops@ricton.com',
    });
    expect(out).toMatch(/name:\s*acme/);
    expect(out).toMatch(/tos_accepted:\s*true/);
    expect(out).toMatch(/ops@ricton\.com/);
    expect(out).toMatch(/api\.ricton\.com/);
    expect(out).toMatch(/storage:\s*redis/);
    expect(out).toMatch(/\$\{REDIS_PASSWORD\}/);
  });

  it('keeps every service and route from the source config', () => {
    const out = renderKongTls(BASE_KONG, {
      apiDomain: 'api.ricton.com',
      acmeEmail: 'ops@ricton.com',
    });
    expect(out).toMatch(/appointment-service/);
    expect(out).toMatch(/\/api\/appointments/);
    expect(out).toMatch(/ricton-client/);
  });

  it('is idempotent (rendering twice adds one plugin)', () => {
    const once = renderKongTls(BASE_KONG, {
      apiDomain: 'api.ricton.com',
      acmeEmail: 'ops@ricton.com',
    });
    const twice = renderKongTls(once, {
      apiDomain: 'api.ricton.com',
      acmeEmail: 'ops@ricton.com',
    });
    expect(twice).toBe(once);
    expect(twice.match(/name:\s*acme/g)?.length).toBe(1);
  });

  it('skips TLS when the email is missing (LE cannot issue)', () => {
    expect(renderKongTls(BASE_KONG, { apiDomain: 'api.ricton.com' })).toBe(BASE_KONG);
  });
});
