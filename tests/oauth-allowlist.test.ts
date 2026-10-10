/**
 * OAuth privilege-escalation guard (TDD RED → GREEN).
 * Public registration AND OAuth must accept only self-serve roles. A
 * facility admin (HOSPITAL_ADMIN) must come from privileged provisioning
 * (POST /api/admin/users) or the one-off bootstrap — never self-service,
 * and especially never ACTIVE-on-creation via OAuth.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const ctrl = fs.readFileSync(
  path.join(root, 'services', 'auth', 'src', 'controllers', 'auth.controller.ts'),
  'utf8'
);

describe('public role allowlist', () => {
  it('excludes HOSPITAL_ADMIN from self-service registration', () => {
    const m = ctrl.match(/PUBLIC_REGISTRABLE_ROLES\s*=\s*new Set\(\[([^\]]+)\]\)/);
    expect(m).not.toBeNull();
    expect(m![1]).not.toMatch(/HOSPITAL_ADMIN/);
  });

  it('still offers the three self-serve roles', () => {
    const m = ctrl.match(/PUBLIC_REGISTRABLE_ROLES\s*=\s*new Set\(\[([^\]]+)\]\)/);
    expect(m![1]).toMatch(/PATIENT/);
    expect(m![1]).toMatch(/CONSULTANT/);
    expect(m![1]).toMatch(/PHARMACIST/);
  });

  it('OAuth creates users ACTIVE only from the same allowlist gate', () => {
    // Both Google and Apple handlers must gate on the shared set (no
    // handler-local role list that can drift).
    const gates = ctrl.match(/if\s*\(!PUBLIC_REGISTRABLE_ROLES\.has\(role\)\)/g) || [];
    expect(gates.length).toBeGreaterThanOrEqual(3); // register + google + apple
  });
});
