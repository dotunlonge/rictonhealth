# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: seeded-stakeholder-workflows.spec.ts >> seeded stakeholder workflows >> hospital can enter its workspace and every navigation surface loads
- Location: apps/web/e2e/seeded-stakeholder-workflows.spec.ts:26:9

# Error details

```
Error: apiRequestContext._wrapApiCall: ENOENT: no such file or directory, copyfile '/Users/apple/Documents/GitHub/Ricton/apps/web/test-results/.playwright-artifacts-2/traces/0a0ecf1c335030dbb1bf-eb70eb70d9fafa9bd920-recording1.network' -> '/Users/apple/Documents/GitHub/Ricton/apps/web/test-results/.playwright-artifacts-2/traces/0a0ecf1c335030dbb1bf-eb70eb70d9fafa9bd920-recording1-pwnetcopy-1.network'
```

# Page snapshot

```yaml
- generic [active] [ref=f3e1]:
    - generic [ref=f3e2]:
        - link "Skip to main content" [ref=f3e3] [cursor=pointer]:
            - /url: '#ricton-main'
        - complementary "Account and primary navigation" [ref=f3e4]:
            - generic [ref=f3e5]:
                - generic [ref=f3e10]:
                    - text: RICTON
                    - paragraph [ref=f3e11]: Health Platform
                - generic [ref=f3e17]:
                    - heading "Ricton Demo Hospital" [level=2] [ref=f3e18]
                    - generic [ref=f3e19]: Hospital Admin
                - navigation "Primary" [ref=f3e20]:
                    - link "Hospital Overview" [ref=f3e21] [cursor=pointer]:
                        - /url: /dashboard/hospital
                    - link "Medical Staff" [ref=f3e27] [cursor=pointer]:
                        - /url: /providers
                    - link "Hospital Appointments" [ref=f3e34] [cursor=pointer]:
                        - /url: /appointments
                    - link "Pharmacy Department" [ref=f3e38] [cursor=pointer]:
                        - /url: /pharmacy
                    - link "Hospital Revenue" [ref=f3e43] [cursor=pointer]:
                        - /url: /wallet
                    - link "Messages" [ref=f3e48] [cursor=pointer]:
                        - /url: /inbox
                    - link "Hospital Settings" [ref=f3e53] [cursor=pointer]:
                        - /url: /settings
            - button "Sign Out" [ref=f3e59]
        - generic [ref=f3e64]:
            - banner [ref=f3e65]:
                - combobox "Search pages and destinations" [ref=f3e68]
                - generic [ref=f3e69]:
                    - button "Notifications" [ref=f3e70]
                    - generic [ref=f3e79]:
                        - paragraph [ref=f3e80]: Ricton Demo Hospital
                        - paragraph [ref=f3e81]: Hospital Admin
            - main [ref=f3e82]:
                - generic [ref=f3e83]:
                    - generic [ref=f3e84]:
                        - generic [ref=f3e85]:
                            - heading "Digital Health Wallet & Earnings" [level=1] [ref=f3e86]
                            - paragraph [ref=f3e90]: Secure automated billing, consultation payouts, and prescription transaction history
                        - paragraph [ref=f3e91]: Staff wallets receive consultation payouts — funding is patient-only.
                    - generic [ref=f3e92]:
                        - generic [ref=f3e93]:
                            - text: Available Wallet Balance
                            - generic [ref=f3e94]:
                                - generic [ref=f3e95]: ₦
                                - generic [ref=f3e96]: '0'
                            - generic [ref=f3e97]: Live Account Active
                        - generic [ref=f3e101]:
                            - text: This Month Expenses
                            - generic [ref=f3e102]:
                                - generic [ref=f3e103]: ₦
                                - generic [ref=f3e104]: '0'
                            - paragraph [ref=f3e105]: 0 Total Health Transactions
                        - generic [ref=f3e106]:
                            - text: Payment Account
                            - generic [ref=f3e111]:
                                - paragraph [ref=f3e112]: hospital.admin@ricton.health
                                - paragraph [ref=f3e113]: Verified Health Payout Account
                    - generic [ref=f3e114]:
                        - generic [ref=f3e115]:
                            - heading "Withdraw to bank account" [level=2] [ref=f3e116]
                            - paragraph [ref=f3e117]: Minimum ₦100. The account name is verified before money moves.
                        - generic [ref=f3e118]:
                            - combobox "Destination bank" [ref=f3e119]:
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
                            - textbox "Account number" [ref=f3e120]:
                                - /placeholder: 10-digit account number
                            - textbox "Amount in naira" [ref=f3e121]:
                                - /placeholder: Amount (₦)
                            - button "Withdraw" [ref=f3e122]
                    - generic [ref=f3e123]:
                        - generic [ref=f3e124]:
                            - heading "Weekly Health Expense Analytics" [level=2] [ref=f3e125]
                            - application [ref=f3e129]:
                                - generic [ref=f3e134]:
                                    - generic [ref=f3e135]:
                                        - generic [ref=f3e136]: Mon
                                        - generic [ref=f3e138]: Tue
                                        - generic [ref=f3e140]: Wed
                                        - generic [ref=f3e142]: Thu
                                        - generic [ref=f3e144]: Fri
                                        - generic [ref=f3e146]: Sat
                                        - generic [ref=f3e148]: Sun
                                    - generic [ref=f3e150]:
                                        - generic [ref=f3e151]: '0'
                                        - generic [ref=f3e153]: '1'
                                        - generic [ref=f3e155]: '2'
                                        - generic [ref=f3e157]: '3'
                                        - generic [ref=f3e159]: '4'
                        - generic [ref=f3e161]:
                            - heading "Recent Activity" [level=2] [ref=f3e162]
                            - paragraph [ref=f3e172]: No transaction activity recorded
                    - generic [ref=f3e173]:
                        - heading "Payment history" [level=2] [ref=f3e174]
                        - paragraph [ref=f3e179]: No payments recorded yet.
    - generic [ref=f3e184] [cursor=pointer]:
        - button "Open Next.js Dev Tools" [ref=f3e185]
        - generic [ref=f3e189]:
            - button "Open issues overlay" [ref=f3e190]:
                - generic [ref=f3e191]:
                    - generic [aria-hidden] [ref=f3e192]: '5'
                    - generic [ref=f3e193]: '6'
                - generic [ref=f3e194]:
                    - text: Issue
                    - generic [aria-hidden] [ref=f3e195]: s
            - button "Collapse issues badge" [ref=f3e196]
    - alert [ref=f3e199]
    - generic [aria-hidden] [ref=f3e200]: '0'
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
     |                     ^ Error: apiRequestContext._wrapApiCall: ENOENT: no such file or directory, copyfile '/Users/apple/Documents/GitHub/Ricton/apps/web/test-results/.playwright-artifacts-2/traces/0a0ecf1c335030dbb1bf-eb70eb70d9fafa9bd920-recording1.network' -> '/Users/apple/Documents/GitHub/Ricton/apps/web/test-results/.playwright-artifacts-2/traces/0a0ecf1c335030dbb1bf-eb70eb70d9fafa9bd920-recording1-pwnetcopy-1.network'
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
