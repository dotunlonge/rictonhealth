/**
 * P2 Pharmacy product routes contract (TDD RED → GREEN).
 * Pharmacist product management must have:
 * - a dedicated create route (/pharmacy/products/new),
 * - ownership-scoped reads (GET /pharmacy/inventory*),
 * - write paths (POST|PUT|DELETE /pharmacy/products*),
 * with no reliance on the `[id]='new'` param hack.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('P2 pharmacy product routes contract', () => {
  it('dedicated create route exists (/pharmacy/products/new)', () => {
    const newPage = path.join(
      root,
      'apps',
      'web',
      'src',
      'app',
      'pharmacy',
      'products',
      'new',
      'page.tsx'
    );
    expect(fs.existsSync(newPage)).toBe(true);
  });

  it('product list reads through the ownership-scoped inventory family', () => {
    const list = fs.readFileSync(
      path.join(root, 'apps', 'web', 'src', 'app', 'pharmacy', 'products', 'page.tsx'),
      'utf8'
    );
    expect(list).toMatch(/\/pharmacy\/inventory/);
  });

  it('product writes go through the products family', () => {
    const srcFiles = [
      // Writes live in the shared editor used by both routes.
      path.join(root, 'apps', 'web', 'src', 'components', 'pharmacy', 'ProductEditor.tsx'),
      path.join(root, 'apps', 'web', 'src', 'app', 'pharmacy', 'products', 'new', 'page.tsx'),
      path.join(root, 'apps', 'web', 'src', 'app', 'pharmacy', 'products', '[id]', 'page.tsx'),
    ];
    const src = srcFiles
      .filter((f) => fs.existsSync(f))
      .map((f) => fs.readFileSync(f, 'utf8'))
      .join('\n');
    expect(src).toMatch(/api\.post\(['"`]\/pharmacy\/products['"`]/);
  });

  it('backend exposes both inventory reads and product writes', () => {
    const routes = fs.readFileSync(
      path.join(root, 'services', 'pharmacy', 'src', 'routes', 'pharmacy.routes.ts'),
      'utf8'
    );
    expect(routes).toMatch(/\/inventory/);
    expect(routes).toMatch(/\.post\('\/products'/);
    expect(routes).toMatch(/\.put\('\/products\/:id'/);
  });
});
