# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps/web/e2e/nearby-doctor-map.spec.ts >> patient can open a keyless nearby-doctor map and see practice pins
- Location: apps/web/e2e/nearby-doctor-map.spec.ts:42:5

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/login", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect, type Browser } from '@playwright/test';
  2  |
  3  | // Real-browser proof of the keyless nearby-doctor map. The demo doctors seeded
  4  | // by `prisma/seed.ts` carry public Lagos practice locations; the browser's
  5  | // geolocation is stubbed to a Victoria Island fix so the pins are in range.
  6  | const LAGOS = { latitude: 6.4281, longitude: 3.4219 };
  7  |
  8  | async function login(browser: Browser) {
  9  |   const context = await browser.newContext();
  10 |   await context.addInitScript(
  11 |     (coords: { latitude: number; longitude: number }) => {
  12 |       (
  13 |         navigator as unknown as {
  14 |           geolocation: { getCurrentPosition: (cb: (position: unknown) => void) => void };
  15 |         }
  16 |       ).geolocation.getCurrentPosition = (success) =>
  17 |         success({
  18 |           coords: {
  19 |             latitude: coords.latitude,
  20 |             longitude: coords.longitude,
  21 |             accuracy: 10,
  22 |             altitude: null,
  23 |             altitudeAccuracy: null,
  24 |             heading: null,
  25 |             speed: null,
  26 |           },
  27 |           timestamp: Date.now(),
  28 |         });
  29 |     },
  30 |     LAGOS
  31 |   );
  32 |
  33 |   const page = await context.newPage();
> 34 |   await page.goto('/login');
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  35 |   await page.getByPlaceholder('Email address or phone').fill('patient@ricton.health');
  36 |   await page.getByPlaceholder('Password').fill('password123');
  37 |   await page.getByRole('button', { name: 'Log In', exact: true }).click();
  38 |   await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
  39 |   return { context, page };
  40 | }
  41 |
  42 | test('patient can open a keyless nearby-doctor map and see practice pins', async ({ browser }) => {
  43 |   const { context, page } = await login(browser);
  44 |
  45 |   await page.goto('/providers');
  46 |   await page.getByRole('button', { name: /Use my location/i }).click();
  47 |
  48 |   const map = page.getByRole('region', { name: 'Map of nearby doctor practice locations' });
  49 |   await expect(map).toBeVisible({ timeout: 20_000 });
  50 |   await expect(map.locator('.leaflet-container')).toBeVisible({ timeout: 20_000 });
  51 |   await expect(map.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 20_000 });
  52 |
  53 |   // The button flips to the located state and no third-party map vendor is used.
  54 |   await expect(page.getByRole('button', { name: /Nearby doctors/i })).toBeVisible();
  55 |   await expect(map).not.toContainText(/google maps|mapbox/i);
  56 |
  57 |   await context.close();
  58 | });
  59 |
```
