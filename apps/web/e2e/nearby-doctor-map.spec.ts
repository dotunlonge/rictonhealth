import { test, expect, type Browser } from '@playwright/test';

// Real-browser proof of the keyless nearby-doctor map. The demo doctors seeded
// by `prisma/seed.ts` carry public Lagos practice locations; the browser's
// geolocation is stubbed to a Victoria Island fix so the pins are in range.
const LAGOS = { latitude: 6.4281, longitude: 3.4219 };

async function login(browser: Browser) {
  const context = await browser.newContext();
  await context.addInitScript((coords: { latitude: number; longitude: number }) => {
    (
      navigator as unknown as {
        geolocation: { getCurrentPosition: (cb: (position: unknown) => void) => void };
      }
    ).geolocation.getCurrentPosition = (success) =>
      success({
        coords: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });
  }, LAGOS);

  const page = await context.newPage();
  await page.goto('/login');
  await page.getByPlaceholder('Email address or phone').fill('patient@ricton.health');
  await page.getByPlaceholder('Password').fill('password123');
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
  return { context, page };
}

test('patient can open a keyless nearby-doctor map and see practice pins', async ({ browser }) => {
  const { context, page } = await login(browser);

  await page.goto('/providers');
  await page.getByRole('button', { name: /Use my location/i }).click();

  const map = page.getByRole('region', { name: 'Map of nearby doctor practice locations' });
  await expect(map).toBeVisible({ timeout: 20_000 });
  await expect(map.locator('.leaflet-container')).toBeVisible({ timeout: 20_000 });
  await expect(map.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 20_000 });

  // The button flips to the located state and no third-party map vendor is used.
  await expect(page.getByRole('button', { name: /Nearby doctors/i })).toBeVisible();
  await expect(map).not.toContainText(/google maps|mapbox/i);

  await context.close();
});
