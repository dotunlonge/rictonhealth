/**
 * One-time super-admin bootstrap for non-dev environments.
 *
 * Problem: public registration only issues PATIENT/CONSULTANT/PHARMACIST and
 * POST /api/admin/users requires an existing SUPER_ADMIN, so a fresh
 * staging/production database has no sign-in path to the admin center.
 * The dev seed (prisma/seed.ts) refuses production by design.
 *
 * Usage (once per environment, credentials from the secrets manager — never
 * committed):
 *   BOOTSTRAP_ADMIN_EMAIL=ops@example.com \
 *   BOOTSTRAP_ADMIN_PASSWORD='<strong unique password>' \
 *   npm run bootstrap:admin --workspace=@ricton/db
 *
 * Afterwards sign in at /login and provision further admins via
 * /admin/users ("Provision Hospital Admin" / user management), then rotate
 * the bootstrap password or deactivate the bootstrap account.
 *
 * Safety:
 * - Idempotent: exits 0 without touching anything if a SUPER_ADMIN exists.
 * - Refuses weak/known-default passwords.
 * - Never logs the password.
 */
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BANNED_PASSWORDS = new Set([
  'password',
  'password123',
  'admin',
  'admin123',
  'ricton',
  'ricton123',
  'changeme',
  'letmein',
]);

async function main() {
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || '';

  if (!email || !email.includes('@')) {
    console.error('ERROR: BOOTSTRAP_ADMIN_EMAIL must be set to a valid email address.');
    process.exit(1);
  }
  if (password.length < 16) {
    console.error('ERROR: BOOTSTRAP_ADMIN_PASSWORD must be at least 16 characters.');
    process.exit(1);
  }
  if (BANNED_PASSWORDS.has(password.toLowerCase())) {
    console.error('ERROR: BOOTSTRAP_ADMIN_PASSWORD is a known-default password. Choose better.');
    process.exit(1);
  }

  const existing = await prisma.user.findFirst({
    where: { role: UserRole.SUPER_ADMIN },
    select: { id: true, email: true },
  });
  if (existing) {
    console.log(
      `A super admin already exists (${existing.email}). No changes made — sign in with that account.`
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });
  console.log(`Bootstrapped super admin: ${admin.email} (ACTIVE, verified).`);
  console.log('Next: sign in at /login, provision further admins, then rotate this password.');
}

main()
  .catch((err) => {
    console.error('Bootstrap failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
