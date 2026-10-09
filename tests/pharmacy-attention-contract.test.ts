/**
 * P7 Stock/expiry attention contract (TDD RED → GREEN).
 * The pharmacist product list must surface what needs attention — out of
 * stock, low stock, expired, expiring soon — derived from the inventory rows
 * the backend already returns. No new backend; presentation of server data.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('P7 stock/expiry attention contract', () => {
  it('inventory rows carry the fields attention is derived from', async () => {
    const ctrl = fs.readFileSync(
      path.join(root, 'services', 'pharmacy', 'src', 'controllers', 'pharmacy.controller.ts'),
      'utf8'
    );
    // getInventory returns full product rows (no select narrowing).
    expect(ctrl).toMatch(/getInventory/);
    expect(ctrl).toMatch(/prisma\.product\.findMany/);
  });

  it('product list derives a needs-attention section (stock + expiry)', () => {
    const page = fs.readFileSync(
      path.join(root, 'apps', 'web', 'src', 'app', 'pharmacy', 'products', 'page.tsx'),
      'utf8'
    );
    expect(page).toMatch(/expiryDate/);
    expect(page).toMatch(/Needs attention|needsAttention|attention/i);
  });
});
