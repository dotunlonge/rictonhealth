/**
 * Leave-list scoping (TDD RED → GREEN).
 * GET /leave without a providerId filter must never return cross-provider
 * rows: CONSULTANT sees self, HOSPITAL_ADMIN sees own hospital's providers,
 * SUPER_ADMIN sees all, everyone else is refused at the route.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('leave-list scoping', () => {
  it('route admits only staff roles', () => {
    const routes = read('services/appointment/src/routes/appointment.routes.ts');
    expect(routes).toMatch(
      /router\.get\(\s*'\/leave',\s*requireRole\('CONSULTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'\)/
    );
  });

  it('controller confines hospital admins to their hospital', () => {
    const ctrl = read('services/appointment/src/controllers/appointment.controller.ts');
    const start = ctrl.indexOf('export const listLeaves');
    const body = ctrl.slice(start, ctrl.indexOf('export const ', start + 10));
    expect(body).toMatch(/HOSPITAL_ADMIN/);
    expect(body).toMatch(/hospitalId/);
  });

  it('controller refuses non-staff roles', () => {
    const ctrl = read('services/appointment/src/controllers/appointment.controller.ts');
    const start = ctrl.indexOf('export const listLeaves');
    const body = ctrl.slice(start, ctrl.indexOf('export const ', start + 10));
    expect(body).toMatch(/ForbiddenError/);
  });
});
