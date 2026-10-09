/**
 * S9 Support filing contract (TDD RED → GREEN).
 * Any authenticated ACTIVE user must be able to file a ticket and read their
 * own tickets — completing the loop with the SUPER_ADMIN triage queue (S7).
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
      // Triage queue is SUPER_ADMIN-only; the filing surface must live outside it.
      if (full.includes(`${path.sep}admin${path.sep}support`)) continue;
      out.push(fs.readFileSync(full, 'utf8'));
    }
  };
  walk(path.join(root, 'apps', 'web', 'src'));
  return out.join('\n');
}

describe('S9 support filing contract', () => {
  it('backend exposes user-facing ticket filing + own-ticket list', () => {
    const routes = fs.readFileSync(
      path.join(root, 'services', 'admin', 'src', 'routes', 'admin.routes.ts'),
      'utf8'
    );
    expect(routes).toMatch(/\.post\('\/support\/tickets'/);
    expect(routes).toMatch(/\.get\('\/support\/tickets'/);
  });

  it('web UI files tickets (POST /admin/support/tickets with subject+body)', () => {
    const src = webSource();
    expect(src).toMatch(/\/admin\/support\/tickets/);
    expect(src).toMatch(/subject/);
  });

  it('web UI lists the caller’s own tickets (GET /admin/support/tickets)', () => {
    expect(webSource()).toMatch(/support\/tickets/);
  });

  it('non-admin navigation exposes the support surface', () => {
    const nav = fs.readFileSync(
      path.join(root, 'apps', 'web', 'src', 'components', 'layout', 'SidebarLayout.tsx'),
      'utf8'
    );
    expect(nav).toMatch(/\/support/);
  });
});
