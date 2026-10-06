import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('pharmacy inventory workflow contract', () => {
  it('collects the compliance and traceability fields required by the API', () => {
    const page = read('apps/web/src/app/pharmacy/products/[id]/page.tsx');
    for (const field of ['nafdacRegNo', 'batchNumber', 'supplierName', 'expiryDate']) {
      expect(page).toContain(field);
    }
    expect(page).toContain('type="date"');
  });

  it('stores traceability and will not expose expired or unreviewed stock', () => {
    const schema = read('packages/db/prisma/schema.prisma');
    const controller = read('services/pharmacy/src/controllers/pharmacy.controller.ts');
    for (const field of ['batchNumber', 'supplierName', 'expiryDate']) {
      expect(schema).toContain(field);
      expect(controller).toContain(field);
    }
    expect(controller).toMatch(/expiryDate:\s*\{ gt: new Date\(\) \}/);
    expect(controller).toContain('A future expiryDate, batchNumber, and supplierName are required');
    expect(controller).toContain('batchNumber must contain at least 2 characters');
  });

  it('gives a super-admin a review queue and approval control', () => {
    expect(read('services/pharmacy/src/routes/pharmacy.routes.ts')).toContain(
      '/products/review/pending'
    );
    const page = read('apps/web/src/app/admin/pharmacy-products/page.tsx');
    expect(page).toContain('/pharmacy/products/review/pending');
    expect(page).toContain('/verify');
  });
});
