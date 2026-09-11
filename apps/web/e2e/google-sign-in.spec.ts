import { expect, test } from '@playwright/test';

const GOOGLE_SDK_URL = 'https://accounts.google.com/gsi/client';

test.describe('Google sign-in', () => {
  test('sends the Google ID credential to the auth backend from a visible button', async ({
    page,
  }) => {
    await page.route(GOOGLE_SDK_URL, async (route) => {
      await route.fulfill({
        contentType: 'application/javascript',
        body: `
          window.google = {
            accounts: {
              id: {
                initialize(config) {
                  window.__rictonGoogleCallback = config.callback;
                },
                renderButton(container) {
                  const button = document.createElement('button');
                  button.type = 'button';
                  button.textContent = 'Sign in with Google';
                  button.addEventListener('click', () => {
                    window.__rictonGoogleCallback({ credential: 'browser-test-id-credential' });
                  });
                  container.appendChild(button);
                }
              }
            }
          };
        `,
      });
    });

    await page.route('**/api/auth/oauth/google', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { message: 'Expected browser-test rejection' },
        }),
      });
    });

    await page.goto('/login');
    const button = page.getByRole('button', { name: 'Sign in with Google' });
    await expect(button).toBeVisible();

    const requestPromise = page.waitForRequest('**/api/auth/oauth/google');
    await button.click();
    const request = await requestPromise;

    expect(request.postDataJSON()).toMatchObject({ token: 'browser-test-id-credential' });
  });

  test('shows a clickable retry when the Google SDK cannot load', async ({ page }) => {
    await page.route(GOOGLE_SDK_URL, (route) => route.abort('failed'));

    await page.goto('/login');

    await expect(page.getByRole('button', { name: 'Retry Google sign-in' })).toBeVisible();
    await expect(page.getByText('Loading Google sign-in…')).toBeHidden();
  });
});
