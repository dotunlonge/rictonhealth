import { test, expect, type Browser } from '@playwright/test';

// These development fixtures are created by prisma/seed.ts. The tests drive
// real browser sessions against the real local services; nothing is mocked.
const roles = {
  patient: {
    email: 'patient@ricton.health',
    home: '/dashboard',
    pages: ['/providers', '/appointments', '/wallet', '/pharmacy'],
  },
  consultant: {
    email: 'dr.adeyemi@ricton.com',
    home: '/dashboard',
    pages: ['/dashboard/availability', '/patients', '/prescriptions', '/telemedicine', '/wallet'],
  },
  pharmacist: {
    email: 'pharmacy@ricton.health',
    home: '/dashboard/pharmacy',
    pages: ['/pharmacy/products', '/prescriptions', '/wallet'],
  },
  hospital: {
    email: 'hospital.admin@ricton.health',
    home: '/dashboard/hospital',
    pages: ['/providers', '/appointments', '/wallet'],
  },
  admin: {
    email: 'admin@ricton.health',
    home: '/admin',
    pages: ['/admin/providers', '/admin/users', '/admin/pharmacy-products', '/admin/audit'],
  },
} as const;

async function login(browser: Browser, email: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/login');
  await page.getByPlaceholder('Email address or phone').fill(email);
  await page.getByPlaceholder('Password').fill('password123');
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
  return { context, page };
}

test.describe('seeded stakeholder workflows', () => {
  for (const [role, workflow] of Object.entries(roles)) {
    test(`${role} can enter its workspace and every navigation surface loads`, async ({
      browser,
    }) => {
      const { context, page } = await login(browser, workflow.email);
      await expect(page).toHaveURL(new RegExp(workflow.home.replaceAll('/', '\\/')), {
        timeout: 20_000,
      });
      for (const target of workflow.pages) {
        await page.goto(target);
        await expect(page.locator('main, [role="main"], body').first()).toBeVisible({
          timeout: 20_000,
        });
        // Next dev embeds route source/metadata in the document payload; it
        // may include error phrases that are not user-visible. Assert the
        // rendered UI instead, which is what an actual stakeholder sees.
        await expect(page.getByText(/not authorized|forbidden|internal server error/i)).toHaveCount(
          0
        );
      }
      await context.close();
    });
  }

  test('pharmacist can enter inventory and admin can reach its review queue', async ({
    browser,
  }) => {
    const pharmacist = await login(browser, roles.pharmacist.email);
    await pharmacist.page.goto('/pharmacy/products/new');
    await expect(pharmacist.page.getByLabel(/NAFDAC registration/i)).toBeVisible();
    await expect(pharmacist.page.getByLabel(/Batch number/i)).toBeVisible();
    await expect(pharmacist.page.getByLabel(/Supplier/i)).toBeVisible();
    await expect(pharmacist.page.getByLabel(/Expiry date/i)).toBeVisible();
    await pharmacist.context.close();

    const admin = await login(browser, roles.admin.email);
    await admin.page.goto('/admin/pharmacy-products');
    await expect(admin.page.getByText(/Pharmacy product review/i)).toBeVisible();
    await admin.context.close();
  });
});
