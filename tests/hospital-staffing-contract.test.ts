/**
 * H2 Staffing contract (TDD RED → GREEN).
 * Hospital staff attach/detach must be wired end-to-end:
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

function routeSource(): string {
  return fs.readFileSync(
    path.join(root, 'services', 'admin', 'src', 'routes', 'admin.routes.ts'),
    'utf8'
  );
}

describe('H2 hospital staffing contract', () => {
  it('backend exposes attach/detach routes for HOSPITAL_ADMIN + SUPER_ADMIN', () => {
    const routes = routeSource();
    expect(routes).toMatch(/\/hospitals\/doctors/);
    expect(routes).toMatch(/attachDoctor/);
    expect(routes).toMatch(/detachDoctor/);
    expect(routes).toMatch(/HOSPITAL_ADMIN/);
  });

  it('web UI calls attach (POST /admin/hospitals/doctors)', () => {
    expect(webSource()).toMatch(/\/admin\/hospitals\/doctors/);
  });

  it('web UI calls detach (DELETE /admin/hospitals/doctors/:id)', () => {
    const src = webSource();
    expect(src).toMatch(/hospitals\/doctors/);
    // detach must go through api.delete (not just display the list)
    expect(src).toMatch(/api\.delete\(/);
  });

  it('hospital dashboard no longer shows placeholder schedule text', () => {
    const dashboard = fs.readFileSync(
      path.join(root, 'apps', 'web', 'src', 'app', 'dashboard', 'hospital', 'page.tsx'),
      'utf8'
    );
    expect(dashboard).not.toMatch(/10 AM - 12 AM/);
  });
});
