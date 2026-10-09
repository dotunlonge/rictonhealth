/**
 * P4 Unified Rx worklist (TDD RED → GREEN).
 * A pharmacist working an order with a linked prescription must see the Rx
 * contents (items, patient, prescriber, status) inline via the existing
 * GET /prescriptions/:id — not cross-navigate and hunt.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('P4 unified Rx worklist contract', () => {
  it('backend exposes pharmacist-scoped prescription detail with items', () => {
    const ctrl = fs.readFileSync(
      path.join(
        root,
        'services',
        'prescription',
        'src',
        'controllers',
        'prescription.controller.ts'
      ),
      'utf8'
    );
    expect(ctrl).toMatch(/getPrescriptionById/);
    expect(ctrl).toMatch(/items/);
  });

  it('pharmacy dashboard loads linked-Rx detail inline', () => {
    const page = fs.readFileSync(
      path.join(root, 'apps', 'web', 'src', 'app', 'dashboard', 'pharmacy', 'page.tsx'),
      'utf8'
    );
    expect(page).toMatch(/\/prescriptions\/\$\{/);
    expect(page).toMatch(/linkedRx|rxDetail|Linked prescription/i);
  });
});
