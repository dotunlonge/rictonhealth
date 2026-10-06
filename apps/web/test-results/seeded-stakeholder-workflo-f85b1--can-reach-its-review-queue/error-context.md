# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: seeded-stakeholder-workflows.spec.ts >> seeded stakeholder workflows >> pharmacist can enter inventory and admin can reach its review queue
- Location: apps/web/e2e/seeded-stakeholder-workflows.spec.ts:41:7

# Error details

```
Error: apiRequestContext._wrapApiCall: ENOENT: no such file or directory, copyfile '/Users/apple/Documents/GitHub/Ricton/apps/web/test-results/.playwright-artifacts-4/traces/0a0ecf1c335030dbb1bf-4d9281448ba8a1590e4f-recording1.network' -> '/Users/apple/Documents/GitHub/Ricton/apps/web/test-results/.playwright-artifacts-4/traces/0a0ecf1c335030dbb1bf-4d9281448ba8a1590e4f-recording1-pwnetcopy-1.network'
```

# Page snapshot

```yaml
- generic [active] [ref=f2e1]:
    - generic [ref=f2e2]:
        - link "Skip to main content" [ref=f2e3] [cursor=pointer]:
            - /url: '#ricton-main'
        - complementary "Account and primary navigation" [ref=f2e4]:
            - generic [ref=f2e5]:
                - generic [ref=f2e10]:
                    - text: RICTON
                    - paragraph [ref=f2e11]: Health Platform
                - generic [ref=f2e17]:
                    - heading "pharmacy" [level=2] [ref=f2e18]
                    - generic [ref=f2e19]: Licensed Pharmacist
                - navigation "Primary" [ref=f2e20]:
                    - link "Pharmacy Portal" [ref=f2e21] [cursor=pointer]:
                        - /url: /dashboard/pharmacy
                    - link "Products & Inventory" [ref=f2e28] [cursor=pointer]:
                        - /url: /pharmacy/products
                    - link "Prescription Orders" [ref=f2e34] [cursor=pointer]:
                        - /url: /prescriptions
                    - link "Store Earnings" [ref=f2e39] [cursor=pointer]:
                        - /url: /wallet
                    - link "Messages" [ref=f2e44] [cursor=pointer]:
                        - /url: /inbox
                    - link "Pharmacy Settings" [ref=f2e49] [cursor=pointer]:
                        - /url: /settings
            - button "Sign Out" [ref=f2e55]
        - generic [ref=f2e60]:
            - banner [ref=f2e61]:
                - combobox "Search pages and destinations" [ref=f2e64]
                - generic [ref=f2e65]:
                    - button "Notifications" [ref=f2e66]
                    - generic [ref=f2e75]:
                        - paragraph [ref=f2e76]: pharmacy
                        - paragraph [ref=f2e77]: Licensed Pharmacist
            - main [ref=f2e78]:
                - generic [ref=f2e79]:
                    - button "Back to products" [ref=f2e80]
                    - generic [ref=f2e83]:
                        - heading "Add product" [level=1] [ref=f2e84]
                        - paragraph [ref=f2e85]: New stock is held for compliance review before it reaches patients.
                    - generic [ref=f2e86]:
                        - generic [ref=f2e87]:
                            - text: Name *
                            - textbox "Name *" [ref=f2e88]
                        - generic [ref=f2e89]:
                            - text: Price (NGN) *
                            - spinbutton "Price (NGN) *" [ref=f2e90]
                        - generic [ref=f2e91]:
                            - text: Stock *
                            - spinbutton "Stock *" [ref=f2e92]
                        - generic [ref=f2e93]:
                            - text: Category
                            - textbox "Category" [ref=f2e94]
                        - generic [ref=f2e95]:
                            - text: Image URL
                            - textbox "Image URL" [ref=f2e96]
                        - generic [ref=f2e97]:
                            - text: NAFDAC registration no. *
                            - textbox "NAFDAC registration no. *" [ref=f2e98]
                        - generic [ref=f2e99]:
                            - text: Batch number *
                            - textbox "Batch number *" [ref=f2e100]
                        - generic [ref=f2e101]:
                            - text: Supplier *
                            - textbox "Supplier *" [ref=f2e102]
                        - generic [ref=f2e103]:
                            - text: Expiry date *
                            - textbox "Expiry date *" [ref=f2e104]
                        - generic [ref=f2e105]:
                            - text: Description
                            - textbox "Description" [ref=f2e106]
                        - generic [ref=f2e107]:
                            - checkbox "A valid prescription is required before this medication can be fulfilled" [ref=f2e108]
                            - text: A valid prescription is required before this medication can be fulfilled
                        - button "Save product" [ref=f2e110]
    - button "Open Next.js Dev Tools" [ref=f2e116] [cursor=pointer]
    - alert [ref=f2e120]
```

# Test source

```ts
  1  | import { test, expect, type Browser } from '@playwright/test';
  2  |
  3  | // These development fixtures are created by prisma/seed.ts. The tests drive
  4  | // real browser sessions against the real local services; nothing is mocked.
  5  | const roles = {
  6  |   patient: { email: 'patient@ricton.health', home: '/dashboard', pages: ['/providers', '/appointments', '/wallet', '/pharmacy'] },
  7  |   consultant: { email: 'dr.adeyemi@ricton.com', home: '/dashboard', pages: ['/dashboard/availability', '/patients', '/prescriptions', '/telemedicine', '/wallet'] },
  8  |   pharmacist: { email: 'pharmacy@ricton.health', home: '/dashboard/pharmacy', pages: ['/pharmacy/products', '/prescriptions', '/wallet'] },
  9  |   hospital: { email: 'hospital.admin@ricton.health', home: '/dashboard/hospital', pages: ['/providers', '/appointments', '/wallet'] },
  10 |   admin: { email: 'admin@ricton.health', home: '/admin', pages: ['/admin/providers', '/admin/users', '/admin/pharmacy-products', '/admin/audit'] },
  11 | } as const;
  12 |
  13 | async function login(browser: Browser, email: string) {
  14 |   const context = await browser.newContext();
  15 |   const page = await context.newPage();
  16 |   await page.goto('/login');
  17 |   await page.getByPlaceholder('Email address or phone').fill(email);
  18 |   await page.getByPlaceholder('Password').fill('password123');
  19 |   await page.getByRole('button', { name: 'Log In', exact: true }).click();
  20 |   await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
  21 |   return { context, page };
  22 | }
  23 |
  24 | test.describe('seeded stakeholder workflows', () => {
  25 |   for (const [role, workflow] of Object.entries(roles)) {
  26 |     test(`${role} can enter its workspace and every navigation surface loads`, async ({ browser }) => {
  27 |       const { context, page } = await login(browser, workflow.email);
  28 |       await expect(page).toHaveURL(new RegExp(workflow.home.replaceAll('/', '\\/')), { timeout: 20_000 });
  29 |       for (const target of workflow.pages) {
  30 |         await page.goto(target);
  31 |         await expect(page.locator('main, [role="main"], body').first()).toBeVisible({ timeout: 20_000 });
  32 |         // Next dev embeds route source/metadata in the document payload; it
  33 |         // may include error phrases that are not user-visible. Assert the
  34 |         // rendered UI instead, which is what an actual stakeholder sees.
  35 |         await expect(page.getByText(/not authorized|forbidden|internal server error/i)).toHaveCount(0);
  36 |       }
  37 |       await context.close();
  38 |     });
  39 |   }
  40 |
  41 |   test('pharmacist can enter inventory and admin can reach its review queue', async ({ browser }) => {
  42 |     const pharmacist = await login(browser, roles.pharmacist.email);
  43 |     await pharmacist.page.goto('/pharmacy/products/new');
  44 |     await expect(pharmacist.page.getByLabel(/NAFDAC registration/i)).toBeVisible();
  45 |     await expect(pharmacist.page.getByLabel(/Batch number/i)).toBeVisible();
  46 |     await expect(pharmacist.page.getByLabel(/Supplier/i)).toBeVisible();
  47 |     await expect(pharmacist.page.getByLabel(/Expiry date/i)).toBeVisible();
> 48 |     await pharmacist.context.close();
     |                              ^ Error: apiRequestContext._wrapApiCall: ENOENT: no such file or directory, copyfile '/Users/apple/Documents/GitHub/Ricton/apps/web/test-results/.playwright-artifacts-4/traces/0a0ecf1c335030dbb1bf-4d9281448ba8a1590e4f-recording1.network' -> '/Users/apple/Documents/GitHub/Ricton/apps/web/test-results/.playwright-artifacts-4/traces/0a0ecf1c335030dbb1bf-4d9281448ba8a1590e4f-recording1-pwnetcopy-1.network'
  49 |
  50 |     const admin = await login(browser, roles.admin.email);
  51 |     await admin.page.goto('/admin/pharmacy-products');
  52 |     await expect(admin.page.getByText(/Pharmacy product review/i)).toBeVisible();
  53 |     await admin.context.close();
  54 |   });
  55 | });
  56 |
```
