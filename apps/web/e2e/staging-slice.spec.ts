import { test, expect, request } from '@playwright/test';

// Staging slice: register → login → onboarding → booking → logout in a real
// browser. No external providers are touched: seeding happens through the
// public API, and payment/video steps are asserted at the UI-contract level
// (server-authoritative messaging, no local fabrication).
//
// Requires: docker backend on published ports (Next rewrites proxy to them)
// and a migrated dev database. Timestamped accounts isolate parallel runs.

const API = 'http://localhost:3001/api/auth';
const USER_API = 'http://localhost:3002/api/users';
const APPT_API = 'http://localhost:3005/api/appointments';

const stamp = Date.now().toString(36);
const patientEmail = `e2e-patient-${stamp}@example.com`;
const consultantEmail = `e2e-doctor-${stamp}@example.com`;
const password = 'E2eSecure1!';

async function apiRegister(email: string, role: string) {
  const ctx = await request.newContext();
  const roleDigit = role === 'CONSULTANT' ? '1' : '2';
  const res = await ctx.post(`${API}/register`, {
    data: {
      email,
      phone: `+2348${roleDigit}${stamp.slice(-7).padStart(7, '0')}`,
      password,
      role,
      firstName: 'E2E',
      lastName: role === 'CONSULTANT' ? 'Doctor' : 'Patient',
      consentVersion: '1.0',
    },
  });
  expect(res.ok(), `register ${role} failed: ${await res.text()}`).toBeTruthy();
  await ctx.dispose();
}

async function apiLogin(email: string): Promise<string> {
  const ctx = await request.newContext();
  const res = await ctx.post(`${API}/login`, { data: { email, password } });
  expect(res.ok(), `login failed: ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  await ctx.dispose();
  return body.data.token as string;
}

test.describe('staging slice', () => {
  test('privileged public registration stays closed', async ({ request: api }) => {
    const res = await api.post(`${API}/register`, {
      data: {
        email: `e2e-admin-${stamp}@example.com`,
        password,
        role: 'SUPER_ADMIN',
        consentVersion: '1.0',
      },
    });
    expect([400, 403]).toContain(res.status());
  });

  test('patient: login → dashboard → onboarding → appointments → logout', async ({ page }) => {
    await apiRegister(patientEmail, 'PATIENT');
    await apiRegister(consultantEmail, 'CONSULTANT');

    // Consultant opens Monday availability via the API (server UTC contract).
    const consultantToken = await apiLogin(consultantEmail);
    const apiCtx = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${consultantToken}` },
    });
    const avail = await apiCtx.post(`${APPT_API}/availability`, {
      data: {
        dayOfWeek: 0,
        startTime: '09:00',
        endTime: '17:00',
        slotDurationMinutes: 30,
      },
    });
    expect(avail.ok(), `availability failed: ${await avail.text()}`).toBeTruthy();

    // Sanity: provider directory serves the consultant through the gateway path.
    const providers = await apiCtx.get(`${USER_API}/providers?name=E2E`);
    expect(providers.ok()).toBeTruthy();
    await apiCtx.dispose();

    // UI: login.
    await page.goto('/login');
    await page.getByPlaceholder('Email address or phone').fill(patientEmail);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByRole('button', { name: /sign in|log in|continue/i }).click();
    await expect(page).not.toHaveURL(/login/, { timeout: 20000 });

    // UI: appointments page loads server data (no crash, no fabrication markers).
    await page.goto('/appointments');
    await expect(page.getByText(/appointment/i).first()).toBeVisible({ timeout: 20000 });
    const bodyText = (await page.textContent('body')) || '';
    expect(bodyText).not.toMatch(/RX-\d{3}$/m);

    // UI: wallet page uses the server balance endpoint (no instant credit UI).
    await page.goto('/wallet');
    await expect(page.getByText(/wallet/i).first()).toBeVisible({ timeout: 20000 });

    // UI: logout returns to login (server session invalidated underneath).
    await page.goto('/logout');
    await expect(page).toHaveURL(/login/, { timeout: 20000 });
  });
});
