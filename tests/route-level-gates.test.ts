/**
 * Route-level authorization gates (TDD RED → GREEN).
 * Defense must live at the route layer (admin-pattern: requireAuth +
 * requireRole + requireActiveStatus), not only inside controllers where a
 * future edit can silently drop it.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('route-level authorization gates', () => {
  it('GET /patients/:id is role-gated to clinical roles + self (mirrors controller)', () => {
    const routes = read('services/user/src/routes/user.routes.ts');
    const i = routes.indexOf("'/patients/:id'");
    expect(i).toBeGreaterThan(-1);
    const window = routes.slice(Math.max(0, i - 400), i + 200);
    // Exact gate call: PATIENT/CONSULTANT/HOSPITAL_ADMIN/SUPER_ADMIN, no PHARMACIST.
    expect(window).toMatch(
      /requireRole\('PATIENT', 'CONSULTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'\)/
    );
  });

  it('POST /payments/:id/refund is role-gated to clinic admins', () => {
    const routes = read('services/payment/src/routes/payment.routes.ts');
    const i = routes.indexOf("'/:id/refund'");
    expect(i).toBeGreaterThan(-1);
    const window = routes.slice(Math.max(0, i - 400), i + 200);
    expect(window).toMatch(/requireRole/);
    expect(window).toMatch(/HOSPITAL_ADMIN/);
    expect(window).toMatch(/SUPER_ADMIN/);
  });
});
