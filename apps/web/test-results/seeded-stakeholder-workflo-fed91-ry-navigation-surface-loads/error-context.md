# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: seeded-stakeholder-workflows.spec.ts >> seeded stakeholder workflows >> admin can enter its workspace and every navigation surface loads
- Location: apps/web/e2e/seeded-stakeholder-workflows.spec.ts:26:9

# Error details

```
Error: apiRequestContext._wrapApiCall: ENOENT: no such file or directory, copyfile '/Users/apple/Documents/GitHub/Ricton/apps/web/test-results/.playwright-artifacts-3/traces/0a0ecf1c335030dbb1bf-a101c06c909b5232f7f3-recording1.network' -> '/Users/apple/Documents/GitHub/Ricton/apps/web/test-results/.playwright-artifacts-3/traces/0a0ecf1c335030dbb1bf-a101c06c909b5232f7f3-recording1-pwnetcopy-1.network'
```

# Page snapshot

```yaml
- generic [active] [ref=f5e1]:
    - generic [ref=f5e2]:
        - link "Skip to main content" [ref=f5e3] [cursor=pointer]:
            - /url: '#ricton-main'
        - complementary "Account and primary navigation" [ref=f5e4]:
            - generic [ref=f5e5]:
                - generic [ref=f5e10]:
                    - text: RICTON
                    - paragraph [ref=f5e11]: Health Platform
                - generic [ref=f5e17]:
                    - heading "admin" [level=2] [ref=f5e18]
                    - generic [ref=f5e19]: System Admin
                - navigation "Primary" [ref=f5e20]:
                    - link "Admin Center" [ref=f5e21] [cursor=pointer]:
                        - /url: /admin
                    - link "Platform Analytics" [ref=f5e25] [cursor=pointer]:
                        - /url: /admin/analytics
                    - link "Provider Approvals" [ref=f5e29] [cursor=pointer]:
                        - /url: /admin/providers
                    - link "User Directory" [ref=f5e36] [cursor=pointer]:
                        - /url: /patients
                    - link "System Settings" [ref=f5e43] [cursor=pointer]:
                        - /url: /settings
            - button "Sign Out" [ref=f5e49]
        - generic [ref=f5e54]:
            - banner [ref=f5e55]:
                - combobox "Search pages and destinations" [ref=f5e58]
                - generic [ref=f5e59]:
                    - button "Notifications" [ref=f5e60]
                    - generic [ref=f5e69]:
                        - paragraph [ref=f5e70]: admin
                        - paragraph [ref=f5e71]: System Admin
            - main [ref=f5e72]:
                - generic [ref=f5e73]:
                    - generic [ref=f5e74]:
                        - heading "Audit log" [level=1] [ref=f5e75]
                        - paragraph [ref=f5e76]: Immutable security and administrative events recorded by the backend.
                    - generic [ref=f5e77]:
                        - textbox "Filter by exact action" [ref=f5e78]
                        - button "Apply filter" [ref=f5e79]
                    - table [ref=f5e81]:
                        - rowgroup [ref=f5e82]:
                            - row [ref=f5e83]:
                                - columnheader "Time" [ref=f5e84]
                                - columnheader "Action" [ref=f5e85]
                                - columnheader "Resource" [ref=f5e86]
                                - columnheader "Actor" [ref=f5e87]
                                - columnheader "IP address" [ref=f5e88]
                        - rowgroup [ref=f5e89]:
                            - row [ref=f5e90]:
                                - cell "10/2/2026, 5:02:46 AM" [ref=f5e91]
                                - cell "TOKEN_REFRESH" [ref=f5e92]
                                - cell "AUTH" [ref=f5e93]
                                - cell "cb549a24-a1a2-4102-96e1-d040d781c1fc" [ref=f5e94]
                                - cell "::1" [ref=f5e95]
                            - row [ref=f5e96]:
                                - cell "10/2/2026, 5:02:41 AM" [ref=f5e97]
                                - cell "TOKEN_REFRESH" [ref=f5e98]
                                - cell "AUTH" [ref=f5e99]
                                - cell "cb549a24-a1a2-4102-96e1-d040d781c1fc" [ref=f5e100]
                                - cell "::1" [ref=f5e101]
                            - row [ref=f5e102]:
                                - cell "10/2/2026, 5:02:36 AM" [ref=f5e103]
                                - cell "TOKEN_REFRESH" [ref=f5e104]
                                - cell "AUTH" [ref=f5e105]
                                - cell "cb549a24-a1a2-4102-96e1-d040d781c1fc" [ref=f5e106]
                                - cell "::1" [ref=f5e107]
                            - row [ref=f5e108]:
                                - cell "10/2/2026, 5:02:30 AM" [ref=f5e109]
                                - cell "TOKEN_REFRESH" [ref=f5e110]
                                - cell "AUTH" [ref=f5e111]
                                - cell "cb549a24-a1a2-4102-96e1-d040d781c1fc" [ref=f5e112]
                                - cell "::1" [ref=f5e113]
                            - row [ref=f5e114]:
                                - cell "10/2/2026, 5:02:22 AM" [ref=f5e115]
                                - cell "LOGIN_SUCCESS" [ref=f5e116]
                                - cell "AUTH" [ref=f5e117]
                                - cell "cb549a24-a1a2-4102-96e1-d040d781c1fc" [ref=f5e118]
                                - cell "::1" [ref=f5e119]
                            - row [ref=f5e120]:
                                - cell "10/2/2026, 5:02:06 AM" [ref=f5e121]
                                - cell "TOKEN_REFRESH" [ref=f5e122]
                                - cell "AUTH" [ref=f5e123]
                                - cell "7edeb787-fca4-4776-a067-3c51ba475964" [ref=f5e124]
                                - cell "::1" [ref=f5e125]
                            - row [ref=f5e126]:
                                - cell "10/2/2026, 5:02:03 AM" [ref=f5e127]
                                - cell "TOKEN_REFRESH" [ref=f5e128]
                                - cell "AUTH" [ref=f5e129]
                                - cell "7edeb787-fca4-4776-a067-3c51ba475964" [ref=f5e130]
                                - cell "::1" [ref=f5e131]
                            - row [ref=f5e132]:
                                - cell "10/2/2026, 5:02:01 AM" [ref=f5e133]
                                - cell "TOKEN_REFRESH" [ref=f5e134]
                                - cell "AUTH" [ref=f5e135]
                                - cell "7edeb787-fca4-4776-a067-3c51ba475964" [ref=f5e136]
                                - cell "::1" [ref=f5e137]
                            - row [ref=f5e138]:
                                - cell "10/2/2026, 5:01:56 AM" [ref=f5e139]
                                - cell "LOGIN_SUCCESS" [ref=f5e140]
                                - cell "AUTH" [ref=f5e141]
                                - cell "7edeb787-fca4-4776-a067-3c51ba475964" [ref=f5e142]
                                - cell "::1" [ref=f5e143]
                            - row [ref=f5e144]:
                                - cell "10/2/2026, 5:01:27 AM" [ref=f5e145]
                                - cell "TOKEN_REFRESH" [ref=f5e146]
                                - cell "AUTH" [ref=f5e147]
                                - cell "a1294644-e850-4783-af54-2528720271ad" [ref=f5e148]
                                - cell "::1" [ref=f5e149]
                            - row [ref=f5e150]:
                                - cell "10/2/2026, 5:01:24 AM" [ref=f5e151]
                                - cell "TOKEN_REFRESH" [ref=f5e152]
                                - cell "AUTH" [ref=f5e153]
                                - cell "a1294644-e850-4783-af54-2528720271ad" [ref=f5e154]
                                - cell "::1" [ref=f5e155]
                            - row [ref=f5e156]:
                                - cell "10/2/2026, 5:01:23 AM" [ref=f5e157]
                                - cell "TOKEN_REFRESH" [ref=f5e158]
                                - cell "AUTH" [ref=f5e159]
                                - cell "a1294644-e850-4783-af54-2528720271ad" [ref=f5e160]
                                - cell "::1" [ref=f5e161]
                            - row [ref=f5e162]:
                                - cell "10/2/2026, 5:01:11 AM" [ref=f5e163]
                                - cell "LOGIN_SUCCESS" [ref=f5e164]
                                - cell "AUTH" [ref=f5e165]
                                - cell "a1294644-e850-4783-af54-2528720271ad" [ref=f5e166]
                                - cell "::1" [ref=f5e167]
                            - row [ref=f5e168]:
                                - cell "10/2/2026, 5:00:40 AM" [ref=f5e169]
                                - cell "LOGIN_FAILURE" [ref=f5e170]
                                - cell "AUTH" [ref=f5e171]
                                - cell "ad4ede88-5c73-4c3b-aabf-1ffa9b8104fc" [ref=f5e172]
                                - cell "::1" [ref=f5e173]
                            - row [ref=f5e174]:
                                - cell "10/2/2026, 5:00:27 AM" [ref=f5e175]
                                - cell "TOKEN_REFRESH" [ref=f5e176]
                                - cell "AUTH" [ref=f5e177]
                                - cell "69078b78-c4e7-4626-b24b-da8f95748481" [ref=f5e178]
                                - cell "::1" [ref=f5e179]
                            - row [ref=f5e180]:
                                - cell "10/2/2026, 5:00:23 AM" [ref=f5e181]
                                - cell "TOKEN_REFRESH" [ref=f5e182]
                                - cell "AUTH" [ref=f5e183]
                                - cell "69078b78-c4e7-4626-b24b-da8f95748481" [ref=f5e184]
                                - cell "::1" [ref=f5e185]
                            - row [ref=f5e186]:
                                - cell "10/2/2026, 5:00:19 AM" [ref=f5e187]
                                - cell "TOKEN_REFRESH" [ref=f5e188]
                                - cell "AUTH" [ref=f5e189]
                                - cell "69078b78-c4e7-4626-b24b-da8f95748481" [ref=f5e190]
                                - cell "::1" [ref=f5e191]
                            - row [ref=f5e192]:
                                - cell "10/2/2026, 5:00:04 AM" [ref=f5e193]
                                - cell "TOKEN_REFRESH" [ref=f5e194]
                                - cell "AUTH" [ref=f5e195]
                                - cell "69078b78-c4e7-4626-b24b-da8f95748481" [ref=f5e196]
                                - cell "::1" [ref=f5e197]
                            - row [ref=f5e198]:
                                - cell "10/2/2026, 5:00:00 AM" [ref=f5e199]
                                - cell "LOGIN_SUCCESS" [ref=f5e200]
                                - cell "AUTH" [ref=f5e201]
                                - cell "69078b78-c4e7-4626-b24b-da8f95748481" [ref=f5e202]
                                - cell "::1" [ref=f5e203]
                            - row [ref=f5e204]:
                                - cell "10/2/2026, 4:59:06 AM" [ref=f5e205]
                                - cell "LOGIN_FAILURE" [ref=f5e206]
                                - cell "AUTH" [ref=f5e207]
                                - cell "ad4ede88-5c73-4c3b-aabf-1ffa9b8104fc" [ref=f5e208]
                                - cell "::1" [ref=f5e209]
                            - row [ref=f5e210]:
                                - cell "10/2/2026, 4:58:49 AM" [ref=f5e211]
                                - cell "TOKEN_REFRESH" [ref=f5e212]
                                - cell "AUTH" [ref=f5e213]
                                - cell "69078b78-c4e7-4626-b24b-da8f95748481" [ref=f5e214]
                                - cell "::1" [ref=f5e215]
                            - row [ref=f5e216]:
                                - cell "10/2/2026, 4:58:31 AM" [ref=f5e217]
                                - cell "LOGIN_SUCCESS" [ref=f5e218]
                                - cell "AUTH" [ref=f5e219]
                                - cell "69078b78-c4e7-4626-b24b-da8f95748481" [ref=f5e220]
                                - cell "::1" [ref=f5e221]
                            - row [ref=f5e222]:
                                - cell "10/2/2026, 4:50:17 AM" [ref=f5e223]
                                - cell "LOGIN_FAILURE" [ref=f5e224]
                                - cell "AUTH" [ref=f5e225]
                                - cell "ad4ede88-5c73-4c3b-aabf-1ffa9b8104fc" [ref=f5e226]
                                - cell "::1" [ref=f5e227]
                            - row [ref=f5e228]:
                                - cell "10/2/2026, 4:50:15 AM" [ref=f5e229]
                                - cell "TOKEN_REFRESH" [ref=f5e230]
                                - cell "AUTH" [ref=f5e231]
                                - cell "a1294644-e850-4783-af54-2528720271ad" [ref=f5e232]
                                - cell "::1" [ref=f5e233]
                            - row [ref=f5e234]:
                                - cell "10/2/2026, 4:50:08 AM" [ref=f5e235]
                                - cell "LOGIN_SUCCESS" [ref=f5e236]
                                - cell "AUTH" [ref=f5e237]
                                - cell "a1294644-e850-4783-af54-2528720271ad" [ref=f5e238]
                                - cell "::1" [ref=f5e239]
                            - row [ref=f5e240]:
                                - cell "10/2/2026, 4:49:59 AM" [ref=f5e241]
                                - cell "TOKEN_REFRESH" [ref=f5e242]
                                - cell "AUTH" [ref=f5e243]
                                - cell "a1294644-e850-4783-af54-2528720271ad" [ref=f5e244]
                                - cell "::1" [ref=f5e245]
                            - row [ref=f5e246]:
                                - cell "10/2/2026, 4:49:41 AM" [ref=f5e247]
                                - cell "LOGIN_SUCCESS" [ref=f5e248]
                                - cell "AUTH" [ref=f5e249]
                                - cell "a1294644-e850-4783-af54-2528720271ad" [ref=f5e250]
                                - cell "::1" [ref=f5e251]
                            - row [ref=f5e252]:
                                - cell "10/2/2026, 4:49:34 AM" [ref=f5e253]
                                - cell "TOKEN_REFRESH" [ref=f5e254]
                                - cell "AUTH" [ref=f5e255]
                                - cell "a1294644-e850-4783-af54-2528720271ad" [ref=f5e256]
                                - cell "::1" [ref=f5e257]
                            - row [ref=f5e258]:
                                - cell "10/2/2026, 4:49:31 AM" [ref=f5e259]
                                - cell "TOKEN_REFRESH" [ref=f5e260]
                                - cell "AUTH" [ref=f5e261]
                                - cell "69078b78-c4e7-4626-b24b-da8f95748481" [ref=f5e262]
                                - cell "::1" [ref=f5e263]
                            - row [ref=f5e264]:
                                - cell "10/2/2026, 4:49:22 AM" [ref=f5e265]
                                - cell "LOGIN_SUCCESS" [ref=f5e266]
                                - cell "AUTH" [ref=f5e267]
                                - cell "69078b78-c4e7-4626-b24b-da8f95748481" [ref=f5e268]
                                - cell "::1" [ref=f5e269]
                            - row [ref=f5e270]:
                                - cell "10/2/2026, 4:49:10 AM" [ref=f5e271]
                                - cell "LOGIN_FAILURE" [ref=f5e272]
                                - cell "AUTH" [ref=f5e273]
                                - cell "ad4ede88-5c73-4c3b-aabf-1ffa9b8104fc" [ref=f5e274]
                                - cell "::1" [ref=f5e275]
                            - row [ref=f5e276]:
                                - cell "10/2/2026, 4:48:56 AM" [ref=f5e277]
                                - cell "LOGIN_SUCCESS" [ref=f5e278]
                                - cell "AUTH" [ref=f5e279]
                                - cell "a1294644-e850-4783-af54-2528720271ad" [ref=f5e280]
                                - cell "::1" [ref=f5e281]
                            - row [ref=f5e282]:
                                - cell "10/2/2026, 4:48:48 AM" [ref=f5e283]
                                - cell "LOGIN_FAILURE" [ref=f5e284]
                                - cell "AUTH" [ref=f5e285]
                                - cell "ad4ede88-5c73-4c3b-aabf-1ffa9b8104fc" [ref=f5e286]
                                - cell "::1" [ref=f5e287]
                            - row [ref=f5e288]:
                                - cell "10/2/2026, 4:48:32 AM" [ref=f5e289]
                                - cell "TOKEN_REFRESH" [ref=f5e290]
                                - cell "AUTH" [ref=f5e291]
                                - cell "69078b78-c4e7-4626-b24b-da8f95748481" [ref=f5e292]
                                - cell "::1" [ref=f5e293]
                            - row [ref=f5e294]:
                                - cell "10/2/2026, 4:48:26 AM" [ref=f5e295]
                                - cell "LOGIN_SUCCESS" [ref=f5e296]
                                - cell "AUTH" [ref=f5e297]
                                - cell "69078b78-c4e7-4626-b24b-da8f95748481" [ref=f5e298]
                                - cell "::1" [ref=f5e299]
                            - row [ref=f5e300]:
                                - cell "10/2/2026, 4:48:14 AM" [ref=f5e301]
                                - cell "TOKEN_REFRESH" [ref=f5e302]
                                - cell "AUTH" [ref=f5e303]
                                - cell "69078b78-c4e7-4626-b24b-da8f95748481" [ref=f5e304]
                                - cell "::1" [ref=f5e305]
                            - row [ref=f5e306]:
                                - cell "10/2/2026, 4:48:05 AM" [ref=f5e307]
                                - cell "LOGIN_SUCCESS" [ref=f5e308]
                                - cell "AUTH" [ref=f5e309]
                                - cell "cb549a24-a1a2-4102-96e1-d040d781c1fc" [ref=f5e310]
                                - cell "::1" [ref=f5e311]
                            - row [ref=f5e312]:
                                - cell "10/2/2026, 4:48:04 AM" [ref=f5e313]
                                - cell "LOGIN_SUCCESS" [ref=f5e314]
                                - cell "AUTH" [ref=f5e315]
                                - cell "69078b78-c4e7-4626-b24b-da8f95748481" [ref=f5e316]
                                - cell "::1" [ref=f5e317]
                    - generic [ref=f5e318]:
                        - generic [ref=f5e319]: 38 total events
                        - generic [ref=f5e320]:
                            - button "Previous" [disabled] [ref=f5e321]
                            - button "Next" [disabled] [ref=f5e322]
    - button "Open Next.js Dev Tools" [ref=f5e328] [cursor=pointer]
    - alert [ref=f5e332]
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
> 37 |       await context.close();
     |                     ^ Error: apiRequestContext._wrapApiCall: ENOENT: no such file or directory, copyfile '/Users/apple/Documents/GitHub/Ricton/apps/web/test-results/.playwright-artifacts-3/traces/0a0ecf1c335030dbb1bf-a101c06c909b5232f7f3-recording1.network' -> '/Users/apple/Documents/GitHub/Ricton/apps/web/test-results/.playwright-artifacts-3/traces/0a0ecf1c335030dbb1bf-a101c06c909b5232f7f3-recording1-pwnetcopy-1.network'
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
  48 |     await pharmacist.context.close();
  49 |
  50 |     const admin = await login(browser, roles.admin.email);
  51 |     await admin.page.goto('/admin/pharmacy-products');
  52 |     await expect(admin.page.getByText(/Pharmacy product review/i)).toBeVisible();
  53 |     await admin.context.close();
  54 |   });
  55 | });
  56 |
```
