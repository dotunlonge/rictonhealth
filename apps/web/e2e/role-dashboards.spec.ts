import { test, expect, request } from '@playwright/test';

// E2E seeds against the isolated TEST database (same one jest uses).
// Pinned unconditionally: these specs must NEVER touch RDS, regardless of
// ambient shell state (hoisted imports evaluate before this line, so only an
// unconditional assignment is airtight).
process.env.DATABASE_URL =
  'postgresql://ricton_test_user:ricton_test_password@127.0.0.1:5433/ricton_test_db?schema=public';
import { PrismaClient, UserRole, UserStatus } from '@ricton/db';
import bcrypt from 'bcrypt';

// Every role logs in through the UI and lands on its own first screen.
// SUPER_ADMIN cannot self-register by design, so it is provisioned directly
// (mirroring the admin provisioning flow) and cleaned up afterwards.
const BASE = process.env.E2E_BASE_URL || 'http://localhost:3100';
const API = 'http://localhost:3001/api/auth';
const stamp = Date.now().toString(36);
const password = 'E2eSecure1!';

const prisma = new PrismaClient();

async function apiRegister(email: string, role: string, digit: string) {
  const ctx = await request.newContext();
  const res = await ctx.post(`${API}/register`, {
    data: {
      email,
      phone: `+2349${digit}${stamp.slice(-7).padStart(7, '0')}`,
      password,
      role,
      firstName: 'E2E',
      lastName: role,
      consentVersion: '1.0',
    },
  });
  expect(res.ok(), `register ${role} failed: ${await res.text()}`).toBeTruthy();
  await ctx.dispose();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function uiLogin(page: any, email: string) {
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder('Email address or phone').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: /sign in|log in|continue/i }).click();
}

test.describe('role dashboards', () => {
  const createdEmails = [
    `e2e-rpat-${stamp}@example.com`,
    `e2e-rdoc-${stamp}@example.com`,
    `e2e-rpharm-${stamp}@example.com`,
    `e2e-radmin-${stamp}@example.com`,
  ];

  test.beforeAll(async () => {
    await apiRegister(createdEmails[0], 'PATIENT', '5');
    await apiRegister(createdEmails[1], 'CONSULTANT', '6');
    await apiRegister(createdEmails[2], 'PHARMACIST', '7');
    await prisma.user.create({
      data: {
        email: createdEmails[3],
        passwordHash: await bcrypt.hash(password, 10),
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: true,
      },
    });
  });

  test.afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    await prisma.$disconnect();
  });

  test('PATIENT lands on /dashboard', async ({ page }) => {
    await uiLogin(page, `e2e-rpat-${stamp}@example.com`);
    await expect(page).toHaveURL(/\/dashboard\/?$/, { timeout: 20000 });
  });

  test('CONSULTANT lands on doctor onboarding', async ({ page }) => {
    await uiLogin(page, `e2e-rdoc-${stamp}@example.com`);
    await expect(page).toHaveURL(/\/onboarding\/doctor/, { timeout: 20000 });
  });

  test('PHARMACIST lands on pharmacy onboarding', async ({ page }) => {
    await uiLogin(page, `e2e-rpharm-${stamp}@example.com`);
    await expect(page).toHaveURL(/\/onboarding\/pharmacy/, { timeout: 20000 });
  });

  test('SUPER_ADMIN lands on /admin', async ({ page }) => {
    await uiLogin(page, createdEmails[3]);
    await expect(page).toHaveURL(/\/admin/, { timeout: 20000 });
  });
});
