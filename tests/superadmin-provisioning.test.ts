/**
 * Super-admin self-service (TDD RED → GREEN).
 * A SUPER_ADMIN must be able to provision another SUPER_ADMIN (no hospital),
 * while HOSPITAL_ADMIN still requires a hospitalId. DB-free: schema level.
 */
process.env.JWT_SECRET = 'test-only-jwt-secret-min-32-chars-xxxx';
process.env.DATABASE_URL = 'postgresql://localhost:5432/ricton_test';
// Ordered require: packages/shared reads secrets at import time.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AdminProvisionUserSchema } = require('../services/admin/src/schemas/admin.schema');

describe('privileged provisioning roles', () => {
  it('accepts SUPER_ADMIN without a hospital', () => {
    const res = AdminProvisionUserSchema.safeParse({
      email: 'ops2@ricton.health',
      password: 'a-very-long-password-1',
      role: 'SUPER_ADMIN',
    });
    expect(res.success).toBe(true);
  });

  it('rejects SUPER_ADMIN scoped to a hospital', () => {
    const res = AdminProvisionUserSchema.safeParse({
      email: 'ops2@ricton.health',
      password: 'a-very-long-password-1',
      role: 'SUPER_ADMIN',
      hospitalId: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(res.success).toBe(false);
  });

  it('still requires hospitalId for HOSPITAL_ADMIN', () => {
    const bad = AdminProvisionUserSchema.safeParse({
      email: 'ha@ricton.health',
      password: 'a-very-long-password-1',
      role: 'HOSPITAL_ADMIN',
    });
    expect(bad.success).toBe(false);
    const good = AdminProvisionUserSchema.safeParse({
      email: 'ha@ricton.health',
      password: 'a-very-long-password-1',
      role: 'HOSPITAL_ADMIN',
      hospitalId: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(good.success).toBe(true);
  });

  it('still rejects public self-serve roles', () => {
    const res = AdminProvisionUserSchema.safeParse({
      email: 'x@ricton.health',
      password: 'a-very-long-password-1',
      role: 'PATIENT',
    });
    expect(res.success).toBe(false);
  });
});
