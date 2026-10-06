# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: seeded-stakeholder-workflows.spec.ts >> seeded stakeholder workflows >> pharmacist can enter its workspace and every navigation surface loads
- Location: apps/web/e2e/seeded-stakeholder-workflows.spec.ts:26:9

# Error details

```
Error: apiRequestContext._wrapApiCall: ENOENT: no such file or directory, copyfile '/Users/apple/Documents/GitHub/Ricton/apps/web/test-results/.playwright-artifacts-1/traces/0a0ecf1c335030dbb1bf-d0fcc9bae4c81558a0c2-recording1.network' -> '/Users/apple/Documents/GitHub/Ricton/apps/web/test-results/.playwright-artifacts-1/traces/0a0ecf1c335030dbb1bf-d0fcc9bae4c81558a0c2-recording1-pwnetcopy-1.network'
```

# Page snapshot

```yaml
- generic [active] [ref=f4e1]:
    - generic [ref=f4e2]:
        - link "Skip to main content" [ref=f4e3] [cursor=pointer]:
            - /url: '#ricton-main'
        - complementary "Account and primary navigation" [ref=f4e4]:
            - generic [ref=f4e5]:
                - generic [ref=f4e10]:
                    - text: RICTON
                    - paragraph [ref=f4e11]: Health Platform
                - generic [ref=f4e17]:
                    - heading "pharmacy" [level=2] [ref=f4e18]
                    - generic [ref=f4e19]: Licensed Pharmacist
                - navigation "Primary" [ref=f4e20]:
                    - link "Pharmacy Portal" [ref=f4e21] [cursor=pointer]:
                        - /url: /dashboard/pharmacy
                    - link "Products & Inventory" [ref=f4e28] [cursor=pointer]:
                        - /url: /pharmacy/products
                    - link "Prescription Orders" [ref=f4e34] [cursor=pointer]:
                        - /url: /prescriptions
                    - link "Store Earnings" [ref=f4e39] [cursor=pointer]:
                        - /url: /wallet
                    - link "Messages" [ref=f4e44] [cursor=pointer]:
                        - /url: /inbox
                    - link "Pharmacy Settings" [ref=f4e49] [cursor=pointer]:
                        - /url: /settings
            - button "Sign Out" [ref=f4e55]
        - generic [ref=f4e60]:
            - banner [ref=f4e61]:
                - combobox "Search pages and destinations" [ref=f4e64]
                - generic [ref=f4e65]:
                    - button "Notifications" [ref=f4e66]
                    - generic [ref=f4e75]:
                        - paragraph [ref=f4e76]: pharmacy
                        - paragraph [ref=f4e77]: Licensed Pharmacist
            - main [ref=f4e78]:
                - generic [ref=f4e79]:
                    - generic [ref=f4e80]:
                        - generic [ref=f4e81]:
                            - heading "Digital Health Wallet & Earnings" [level=1] [ref=f4e82]
                            - paragraph [ref=f4e86]: Secure automated billing, consultation payouts, and prescription transaction history
                        - paragraph [ref=f4e87]: Staff wallets receive consultation payouts — funding is patient-only.
                    - generic [ref=f4e88]:
                        - generic [ref=f4e89]:
                            - text: Available Wallet Balance
                            - generic [ref=f4e90]:
                                - generic [ref=f4e91]: ₦
                                - generic [ref=f4e92]: '0'
                            - generic [ref=f4e93]: Live Account Active
                        - generic [ref=f4e97]:
                            - text: This Month Expenses
                            - generic [ref=f4e98]:
                                - generic [ref=f4e99]: ₦
                                - generic [ref=f4e100]: '0'
                            - paragraph [ref=f4e101]: 0 Total Health Transactions
                        - generic [ref=f4e102]:
                            - text: Payment Account
                            - generic [ref=f4e107]:
                                - paragraph [ref=f4e108]: pharmacy@ricton.health
                                - paragraph [ref=f4e109]: Verified Health Payout Account
                    - generic [ref=f4e110]:
                        - generic [ref=f4e111]:
                            - heading "Withdraw to bank account" [level=2] [ref=f4e112]
                            - paragraph [ref=f4e113]: Minimum ₦100. The account name is verified before money moves.
                        - generic [ref=f4e114]:
                            - combobox "Destination bank" [ref=f4e115]:
                                - option "Select bank" [selected]
                                - option "5TT MFB"
                                - option "78 Finance Company Ltd"
                                - option "9jaPay Microfinance Bank"
                                - option "9mobile 9Payment Service Bank"
                                - option "Abbey Mortgage Bank"
                                - option "Above Only MFB"
                                - option "Abulesoro MFB"
                                - option "Access Bank"
                                - option "Access Bank (Diamond)"
                                - option "Accion Microfinance Bank"
                                - option "Adamawa Mortgage Bank Limited"
                                - option "Advancly MFB"
                                - option "Aella MFB"
                                - option "AG Mortgage Bank"
                                - option "Ahmadu Bello University Microfinance Bank"
                                - option "Airtel Smartcash PSB"
                                - option "AKU Microfinance Bank"
                                - option "Akuchukwu Microfinance Bank Limited"
                                - option "Al-Barakah Microfinance Bank"
                                - option "ALAT by WEMA"
                                - option "Alert MFB"
                                - option "ALLWORKERS MFB"
                                - option "Alpha Morgan Bank"
                                - option "Alternative bank"
                                - option "Amju Unique MFB"
                                - option "Aramoko MFB"
                                - option "ASO Savings and Loans"
                                - option "ASSET MATRIX MFB"
                                - option "Assets Microfinance Bank"
                                - option "Astrapolaris MFB LTD"
                                - option "ATBU MFB"
                                - option "AVUENEGBE MICROFINANCE BANK"
                                - option "AWACASH MICROFINANCE BANK"
                                - option "AZTEC MICROFINANCE BANK LIMITED"
                                - option "Bainescredit MFB"
                                - option "Banc Corp Microfinance Bank"
                                - option "BANK OF AGRICULTURE"
                                - option "Bank78 Microfinance Bank"
                                - option "BANKIT MFB"
                                - option "BANKIT MICROFINANCE BANK LTD"
                                - option "BANKLY MFB"
                                - option "Baobab Microfinance Bank"
                                - option "BC Kash Microfinance Bank"
                                - option "BellBank Microfinance Bank"
                                - option "Benysta Microfinance Bank Limited"
                                - option "Berachah Microfinance Bank Ltd."
                                - option "Beststar Microfinance Bank"
                                - option "BLOC MFB"
                                - option "BOLD MFB"
                                - option "Boost Microfinance Bank"
                                - option "Bosak Microfinance Bank"
                                - option "Bowen Microfinance Bank"
                                - option "Branch International Finance Company Limited"
                                - option "Brent Mortgage bank"
                                - option "BuyPower MFB"
                                - option "BWAY MFB"
                                - option "Carbon"
                                - option "Cashbridge Microfinance Bank Limited"
                                - option "CASHCONNECT MFB"
                                - option "Cedrus MFB"
                                - option "CEMCS Microfinance Bank"
                                - option "Centrum Finance"
                                - option "CHAMS MOBILE MFB"
                                - option "Chanelle Microfinance Bank Limited"
                                - option "Chikum Microfinance bank"
                                - option "Citibank Nigeria"
                                - option "CITYCODE MORTAGE BANK"
                                - option "Civic Microfinance Bank Limited"
                                - option "Consumer Microfinance Bank"
                                - option "Cool Microfinance Bank Limited"
                                - option "Cooperative Mortgage Bank"
                                - option "Corestep MFB"
                                - option "Coronation Merchant Bank"
                                - option "County Finance Limited"
                                - option "Credit Direct Limited"
                                - option "Crescent MFB"
                                - option "Crust Microfinance Bank"
                                - option "CRUTECH MICROFINANCE BANK LTD"
                                - option "Dash Microfinance Bank"
                                - option "Davenport MICROFINANCE BANK"
                                - option "Dillon Microfinance Bank"
                                - option "Dot Microfinance Bank"
                                - option "EBSU Microfinance Bank"
                                - option "Ecobank Nigeria"
                                - option "Ekimogun MFB"
                                - option "Ekondo Microfinance Bank"
                                - option "ESO-E MICROFINANCE BANK LIMITED"
                                - option "Ethica MFB"
                                - option "EXCEL FINANCE BANK"
                                - option "Eyowo"
                                - option "Fairmoney Microfinance Bank"
                                - option "FCMB MFB"
                                - option "Fedeth MFB"
                                - option "Fewchore Finance Company Limited"
                                - option "FFS Microfinance Bank"
                                - option "Fidelity Bank"
                                - option "Firmus MFB"
                                - option "First Bank of Nigeria"
                                - option "First City Monument Bank"
                                - option "First Option MFB"
                                - option "FIRST ROYAL MICROFINANCE BANK"
                                - option "FIRSTMIDAS MFB"
                                - option "FirstTrust Mortgage Bank Nigeria"
                                - option "Flutterwave MFB"
                                - option "Fortress MFB"
                                - option "FSDH Merchant Bank Limited"
                                - option "FUTMINNA MICROFINANCE BANK"
                                - option "Garun Mallam MFB"
                                - option "Gateway Mortgage Bank LTD"
                                - option "Globus Bank"
                                - option "GLORY MFB"
                                - option "Goldman MFB"
                                - option "GOMBE MFB"
                                - option "GoMoney"
                                - option "GOOD SHEPHERD MICROFINANCE BANK"
                                - option "Goodnews Microfinance Bank"
                                - option "GRANTS MFB"
                                - option "Greenwich Merchant Bank"
                                - option "GROOMING MICROFINANCE BANK"
                                - option "GTI MFB"
                                - option "Guaranty Trust Bank"
                                - option "Hackman Microfinance Bank"
                                - option "Haggai Mortgage Bank"
                                - option "Hasal Microfinance Bank"
                                - option "Hayat Trust MFB"
                                - option "HopePSB"
                                - option "IBANK Microfinance Bank"
                                - option "IBBU MFB"
                                - option "Ibile Microfinance Bank"
                                - option "Ibom Mortgage Bank"
                                - option "Ikoyi Osun MFB"
                                - option "Ilaro Poly Microfinance Bank"
                                - option "Imowo MFB"
                                - option "IMPERIAL HOMES MORTAGE BANK"
                                - option "INEBA GOGO MFB"
                                - option "Infinity MFB"
                                - option "Infinity trust Mortgage Bank"
                                - option "ISUA MFB"
                                - option "Jaiz Bank"
                                - option "Jubilee Life Mortgage Bank"
                                - option "Kadpoly MFB"
                                - option "KANOPOLY MFB"
                                - option "KAYI MFB"
                                - option "Kayvee Microfinance Bank"
                                - option "Kebbi Homes Savings and Loans Limited"
                                - option "Keystone Bank"
                                - option "Kolomoni MFB"
                                - option "Kolomoni Microfinance Bank"
                                - option "KONGAPAY (Kongapay Technologies Limited)(formerly Zinternet)"
                                - option "Kredi Money MFB LTD"
                                - option "Kuda Bank"
                                - option "Lagos Building Investment Company Plc."
                                - option "Lemmy MFB"
                                - option "Letshego Microfinance Bank"
                                - option "Links MFB"
                                - option "Living Trust Mortgage Bank"
                                - option "LOMA MFB"
                                - option "Lotus Bank"
                                - option "Maal MFB"
                                - option "MAHFUZ MFB"
                                - option "MAINSTREET MICROFINANCE BANK"
                                - option "Mayden Microfinance Bank"
                                - option "Mayfair MFB"
                                - option "Mayfresh Mortgage Bank"
                                - option "Mega Microfinance Bank"
                                - option "Michael Okpara UniAgric Microfinance Bank"
                                - option "Mint MFB"
                                - option "MINT-FINEX MFB"
                                - option "Money Master PSB"
                                - option "Moniepoint MFB"
                                - option "MOVASCO MFB"
                                - option "MTN Momo PSB"
                                - option "MUTUAL BENEFITS MICROFINANCE BANK"
                                - option "NDCC MICROFINANCE BANK"
                                - option "NET MICROFINANCE BANK"
                                - option "Nigerian Navy Microfinance Bank Limited"
                                - option "NIRSAL MICROFINANCE"
                                - option "Nombank MFB"
                                - option "NOVA BANK"
                                - option "Novus MFB"
                                - option "NPF MICROFINANCE BANK"
                                - option "NSUK MICROFINANACE BANK"
                                - option "NUVION MFB"
                                - option "Olabisi Onabanjo University Microfinance Bank"
                                - option "OLUCHUKWU MICROFINANCE BANK LTD"
                                - option "OPay Digital Services Limited (OPay)"
                                - option "Optimus Bank Limited"
                                - option "Pact Microfinance Bank"
                                - option "Paga"
                                - option "PalmPay"
                                - option "Parallex Bank"
                                - option "Parkway - ReadyCash"
                                - option "PATHFINDER MICROFINANCE BANK LIMITED"
                                - option "PATRICKGOLD MFB"
                                - option "Paystack MFB"
                                - option "Paystack-Titan"
                                - option "Peace Microfinance Bank"
                                - option "PECANTRUST MICROFINANCE BANK LIMITED"
                                - option "Personal Trust MFB"
                                - option "Petra Mircofinance Bank Plc"
                                - option "Pettysave MFB"
                                - option "PFI FINANCE COMPANY LIMITED"
                                - option "Platinum Mortgage Bank"
                                - option "Pocket App"
                                - option "Polaris Bank"
                                - option "Polyunwana MFB"
                                - option "PremiumTrust Bank"
                                - option "Prospa Capital Microfinance Bank"
                                - option "PROSPERIS FINANCE LIMITED"
                                - option "Providus Bank"
                                - option "QuickFund MFB"
                                - option "Rand Merchant Bank"
                                - option "RANDALPHA MICROFINANCE BANK"
                                - option "Rank MFB"
                                - option "Refuge Mortgage Bank"
                                - option "REHOBOTH MICROFINANCE BANK"
                                - option "RenMoney Microfinance Bank"
                                - option "Rephidim Microfinance Bank"
                                - option "Retrust Mfb"
                                - option "Rex Microfinance Bank"
                                - option "Rigo Microfinance Bank Limited"
                                - option "ROCKSHIELD MICROFINANCE BANK"
                                - option "RSU MICROFINANCE BANK"
                                - option "Rubies MFB"
                                - option "Safe Haven MFB"
                                - option "SAGE GREY FINANCE LIMITED"
                                - option "Shield MFB"
                                - option "Signature Bank Ltd"
                                - option "Solid Allianze MFB"
                                - option "Solid Rock MFB"
                                - option "SOURCE MFB"
                                - option "Sparkle Microfinance Bank"
                                - option "SPECTRUM MFB LTD"
                                - option "Springfield Microfinance Bank"
                                - option "Stanbic IBTC Bank"
                                - option "Standard Chartered Bank"
                                - option "STANFORD MICROFINANCE BANK"
                                - option "STATESIDE MICROFINANCE BANK"
                                - option "STB Mortgage Bank"
                                - option "Stellas MFB"
                                - option "Sterling Bank"
                                - option "Summit Bank"
                                - option "Suntrust Bank"
                                - option "Supreme MFB"
                                - option "Sycamore Microfinance Bank"
                                - option "TAJ Bank"
                                - option "Tangerine Money"
                                - option "Tatum Bank"
                                - option "Tatum Bank Ltd"
                                - option "TENN"
                                - option "Think Finance Microfinance Bank"
                                - option "Titan Bank"
                                - option "TOPRATE MFB"
                                - option "TransPay MFB"
                                - option "TRUSTBANC J6 MICROFINANCE BANK"
                                - option "U and C MFB"
                                - option "U&C Microfinance Bank Ltd (U AND C MFB)"
                                - option "UBJ Microfinance Bank Limited"
                                - option "UCEE MFB"
                                - option "Uhuru MFB"
                                - option "Ultraviolet Microfinance Bank"
                                - option "Umunnachi Microfinance Bank Ltd"
                                - option "Unaab Microfinance Bank Limited"
                                - option "UNIABUJA MFB"
                                - option "Unical MFB"
                                - option "Unilag Microfinance Bank"
                                - option "UNIMAID MICROFINANCE BANK"
                                - option "Union Bank of Nigeria"
                                - option "United Bank For Africa"
                                - option "Unity Bank"
                                - option "UNIUYO Microfinance Bank Ltd"
                                - option "Uzondu Microfinance Bank Awka Anambra State"
                                - option "Vale Finance Limited"
                                - option "VFD Microfinance Bank Limited"
                                - option "Victory MFB"
                                - option "VISTA MFB"
                                - option "Visual ICT Limited (TagPay)"
                                - option "Waya Microfinance Bank"
                                - option "Wema Bank"
                                - option "Weston Charis MFB"
                                - option "Whitecrust Finance Company"
                                - option "Xpress Wallet"
                                - option "YCT MFB"
                                - option "Yes MFB"
                                - option "Zap"
                                - option "Zenith Bank"
                                - option "Zenith Bank"
                                - option "Zitra MFB"
                            - textbox "Account number" [ref=f4e116]:
                                - /placeholder: 10-digit account number
                            - textbox "Amount in naira" [ref=f4e117]:
                                - /placeholder: Amount (₦)
                            - button "Withdraw" [ref=f4e118]
                    - generic [ref=f4e119]:
                        - generic [ref=f4e120]:
                            - heading "Weekly Health Expense Analytics" [level=2] [ref=f4e121]
                            - application [ref=f4e125]:
                                - generic [ref=f4e130]:
                                    - generic [ref=f4e131]:
                                        - generic [ref=f4e132]: Mon
                                        - generic [ref=f4e134]: Tue
                                        - generic [ref=f4e136]: Wed
                                        - generic [ref=f4e138]: Thu
                                        - generic [ref=f4e140]: Fri
                                        - generic [ref=f4e142]: Sat
                                        - generic [ref=f4e144]: Sun
                                    - generic [ref=f4e146]:
                                        - generic [ref=f4e147]: '0'
                                        - generic [ref=f4e149]: '1'
                                        - generic [ref=f4e151]: '2'
                                        - generic [ref=f4e153]: '3'
                                        - generic [ref=f4e155]: '4'
                        - generic [ref=f4e157]:
                            - heading "Recent Activity" [level=2] [ref=f4e158]
                            - paragraph [ref=f4e168]: No transaction activity recorded
                    - generic [ref=f4e169]:
                        - heading "Payment history" [level=2] [ref=f4e170]
                        - paragraph [ref=f4e175]: No payments recorded yet.
    - generic [ref=f4e180] [cursor=pointer]:
        - button "Open Next.js Dev Tools" [ref=f4e181]
        - generic [ref=f4e185]:
            - button "Open issues overlay" [ref=f4e186]:
                - generic [ref=f4e187]:
                    - generic [aria-hidden] [ref=f4e188]: '9'
                    - generic [ref=f4e189]: '10'
                - generic [ref=f4e190]:
                    - text: Issue
                    - generic [aria-hidden] [ref=f4e191]: s
            - button "Collapse issues badge" [ref=f4e192]
    - alert [ref=f4e195]
    - generic [aria-hidden] [ref=f4e196]: '0'
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
     |                     ^ Error: apiRequestContext._wrapApiCall: ENOENT: no such file or directory, copyfile '/Users/apple/Documents/GitHub/Ricton/apps/web/test-results/.playwright-artifacts-1/traces/0a0ecf1c335030dbb1bf-d0fcc9bae4c81558a0c2-recording1.network' -> '/Users/apple/Documents/GitHub/Ricton/apps/web/test-results/.playwright-artifacts-1/traces/0a0ecf1c335030dbb1bf-d0fcc9bae4c81558a0c2-recording1-pwnetcopy-1.network'
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
