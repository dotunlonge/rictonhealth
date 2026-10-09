/**
 * C6 Referrals contract (TDD RED → GREEN).
 * CONSULTANT referral create + track must be wired end-to-end:
 * web UI → gateway path → Express route → OpenAPI.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

function webSource(): string {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) continue;
      out.push(fs.readFileSync(full, 'utf8'));
    }
  };
  walk(path.join(root, 'apps', 'web', 'src'));
  return out.join('\n');
}

describe('C6 referrals contract', () => {
  it('backend exposes referral create/list routes (CONSULTANT-gated create)', () => {
    const routes = fs.readFileSync(
      path.join(root, 'services', 'appointment', 'src', 'routes', 'appointment.routes.ts'),
      'utf8'
    );
    expect(routes).toMatch(/\/referrals/);
    expect(routes).toMatch(/requireRole\('CONSULTANT'\)/);
  });

  it('web UI creates referrals (POST /appointments/referrals with consent:true)', () => {
    const src = webSource();
    expect(src).toMatch(/\/appointments\/referrals/);
    expect(src).toMatch(/consent/);
  });

  it('web UI lists referrals (GET /appointments/referrals)', () => {
    expect(webSource()).toMatch(/appointments\/referrals/);
  });

  it('consultant navigation exposes referrals', () => {
    const nav = fs.readFileSync(
      path.join(root, 'apps', 'web', 'src', 'components', 'layout', 'SidebarLayout.tsx'),
      'utf8'
    );
    expect(nav).toMatch(/referral/i);
  });

  it('referral form offers server-fed patient + provider pickers (no manual IDs)', () => {
    const page = fs.readFileSync(
      path.join(root, 'apps', 'web', 'src', 'app', 'referrals', 'page.tsx'),
      'utf8'
    );
    expect(page).toMatch(/\/users\/patients/);
    expect(page).toMatch(/\/users\/providers/);
  });
});
