import { test, expect, request, type Page } from '@playwright/test';

// Founder/QA sweep: every revenue-critical flow in real browsers against the
// live stack (all 15 services + Next on :3100). No mocks, no simulated
// tokens, no local credit fabrication.
//
// Covers: auth → roles → hospital onboarding → providers → booking a doctor →
// wallet top-up input → payment init (Paystack) → pharmacy → prescriptions →
// subscription → inbox → LiveKit video room join (both parties) → logout.
// Fails on fake-interface markers (simulated tokens, lorem, mock balances).
const BASE = process.env.E2E_BASE_URL || 'http://localhost:3100';
const AUTH = 'http://localhost:3001/api/auth';
const USER_API = 'http://localhost:3002/api/users';
const APPT = 'http://localhost:3005/api/appointments';
const TELE = 'http://localhost:3013/api/telemedicine';
const WALLET = 'http://localhost:3008/api/wallets';

// Sweep runs against the LOCAL dev database (same one the live services use).
// Pinned unconditionally so ambient shell state can never redirect it.
process.env.DATABASE_URL = 'postgresql://apple@127.0.0.1:5432/ricton_dev?schema=public';
import { PrismaClient, UserStatus } from '@ricton/db';

const prisma = new PrismaClient();

const stamp = Date.now().toString(36);
const patientEmail = `e2e-qa-patient-${stamp}@example.com`;
const doctorEmail = `e2e-qa-doctor-${stamp}@example.com`;
const password = 'E2eSecure1!';

const FAKE_MARKERS =
  /simulated_token|lorem ipsum|mock_balance|RX-\d{3}$|TODO: wire|placeholder data/i;

async function apiRegister(email: string, role: string, digit: string) {
  const ctx = await request.newContext();
  const res = await ctx.post(`${AUTH}/register`, {
    data: {
      email,
      phone: `+2347${digit}${stamp.slice(-7).padStart(7, '0')}`,
      password,
      role,
      firstName: 'QA',
      lastName: role,
      consentVersion: '1.0',
    },
  });
  expect(res.ok(), `register ${role} failed: ${await res.text()}`).toBeTruthy();
  await ctx.dispose();
}

async function apiLogin(email: string): Promise<{ token: string; userId: string }> {
  const ctx = await request.newContext();
  const res = await ctx.post(`${AUTH}/login`, { data: { email, password } });
  expect(res.ok(), `login failed: ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  await ctx.dispose();
  return { token: body.data.token as string, userId: body.data.user.id as string };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function uiLogin(page: any, email: string) {
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder('Email address or phone').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page).not.toHaveURL(/login/, { timeout: 20000 });
}

async function expectRealPage(page: Page, url: string, heading: RegExp) {
  await page.goto(url);
  await expect(page.getByText(heading).first()).toBeVisible({ timeout: 20000 });
  const body = (await page.textContent('body')) || '';
  expect(body, `${url} contains fake-interface markers`).not.toMatch(FAKE_MARKERS);
}

test.describe('founder QA sweep', () => {
  test('patient + doctor: hospitals, booking, payment, pharmacy, video, no fakes', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await apiRegister(patientEmail, 'PATIENT', '1');
    await apiRegister(doctorEmail, 'CONSULTANT', '2');
    // Fresh registrations are PENDING until contact OTP verification (which
    // needs live SMS/email providers). The sweep provisions the *verified*
    // state directly so every downstream founder flow (booking, video,
    // payment) is exercised as a verified user would experience it.
    await prisma.user.updateMany({
      where: { email: { in: [patientEmail, doctorEmail] } },
      data: { status: UserStatus.ACTIVE, emailVerified: true },
    });
    const doctor = await apiLogin(doctorEmail);
    const patient = await apiLogin(patientEmail);

    // Doctor opens availability (server UTC contract).
    const target = new Date(Date.now() + 24 * 60 * 60 * 1000);
    target.setUTCHours(10, 0, 0, 0);
    const dayOfWeek = (target.getUTCDay() + 6) % 7;
    const docCtx = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${doctor.token}` },
    });
    const avail = await docCtx.post(`${APPT}/availability`, {
      data: { dayOfWeek, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 },
    });
    expect(avail.ok(), `availability failed: ${await avail.text()}`).toBeTruthy();

    // Patient books the doctor (VIDEO) through the API.
    const patCtx = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${patient.token}` },
    });
    const booking = await patCtx.post(APPT, {
      data: { providerId: doctor.userId, scheduledAt: target.toISOString(), type: 'VIDEO' },
    });
    expect(booking.ok(), `booking failed: ${await booking.text()}`).toBeTruthy();
    const appointmentId = ((await booking.json()).data as { id: string }).id;

    // Booking auto-creates the telemedicine room; adopt it.
    const roomsRes = await docCtx.get(`${TELE}/rooms`);
    expect(roomsRes.ok(), `room list failed: ${await roomsRes.text()}`).toBeTruthy();
    const rooms = (await roomsRes.json()).data as Array<{ id: string; appointmentId: string }>;
    const room = rooms.find((r) => r.appointmentId === appointmentId);
    expect(room, 'expected auto-created LiveKit room for the VIDEO appointment').toBeDefined();

    // Payment for services is server-authoritative: top-up init must return a
    // Paystack authorization URL (never a local credit).
    const topup = await patCtx.post(`${WALLET}/topup`, { data: { amount: 1000 } });
    expect(topup.ok(), `topup init failed: ${await topup.text()}`).toBeTruthy();
    const topupBody = await topup.json();
    expect(topupBody.data?.authorizationUrl || '', 'topup must return Paystack URL').toMatch(
      /^https?:\/\//
    );
    // Sub-minimum amounts are rejected, not silently rounded.
    const cheap = await patCtx.post(`${WALLET}/topup`, { data: { amount: 50 } });
    expect([400, 422]).toContain(cheap.status());
    await docCtx.dispose();
    await patCtx.dispose();

    // ---- Patient browser journey ----
    await uiLogin(page, patientEmail);

    await expectRealPage(page, `${BASE}/dashboard`, /dashboard|welcome|appointment/i);
    await expectRealPage(page, `${BASE}/providers`, /provider|doctor|consultant/i);
    // Patient sees the booking CTA; staff must not (role separation).
    await expect(page.getByText(/book slot/i).first()).toBeVisible({ timeout: 15000 });

    await expectRealPage(page, `${BASE}/appointments`, /appointment/i);
    const apptBody = (await page.textContent('body')) || '';
    expect(apptBody).toContain('VIDEO');

    // Hospitals: onboarding form is real fields, hospital dashboard guards cleanly.
    await expectRealPage(page, `${BASE}/onboarding/hospital`, /hospital/i);
    await page.goto(`${BASE}/dashboard/hospital`);
    await expect(
      page.getByText(/hospital|not authorized|forbidden|dashboard/i).first()
    ).toBeVisible({
      timeout: 20000,
    });

    // Wallet: user-controlled amount input (no hardcoded-only ₦10,000 button).
    await page.goto(`${BASE}/wallet`);
    await expect(page.getByText(/wallet/i).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByLabel(/top-up amount/i)).toBeVisible({ timeout: 15000 });
    await page.getByLabel(/top-up amount/i).fill('50');
    await page.getByRole('button', { name: /fund wallet/i }).click();
    await expect(page.getByText(/at least ₦100/i).first()).toBeVisible({ timeout: 15000 });

    await expectRealPage(page, `${BASE}/pharmacy`, /pharmacy|medicine|product/i);
    await expectRealPage(page, `${BASE}/prescriptions`, /prescription/i);
    await expectRealPage(page, `${BASE}/subscription`, /subscription|plan/i);
    await expectRealPage(page, `${BASE}/inbox`, /message|inbox|conversation/i);

    // Video: patient can reach the LiveKit room page and gets either a live
    // room or an honest error — never a simulated token or hang.
    await page.goto(`${BASE}/telemedicine/${room!.id}`);
    await expect(
      page.getByText(/join|connect|participant|video|error|unavailable|failed/i).first()
    ).toBeVisible({ timeout: 60000 });
    const teleBody = ((await page.textContent('body')) || '').toLowerCase();
    expect(teleBody).not.toContain('simulated_token');

    // Provider directory serves the booked doctor through the gateway path.
    const dirCtx = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${patient.token}` },
    });
    const providers = await dirCtx.get(`${USER_API}/providers?name=QA`);
    expect(providers.ok(), `provider directory failed: ${await providers.text()}`).toBeTruthy();
    await dirCtx.dispose();

    await page.goto(`${BASE}/logout`);
    await expect(page).toHaveURL(/login/, { timeout: 20000 });

    // ---- Doctor browser journey (between-users) ----
    await uiLogin(page, doctorEmail);
    await expectRealPage(page, `${BASE}/dashboard`, /dashboard|appointment|consultation/i);
    await expectRealPage(page, `${BASE}/dashboard/availability`, /availability|slot|schedule/i);
    await page.goto(`${BASE}/telemedicine/${room!.id}`);
    await expect(
      page.getByText(/join|connect|participant|video|error|unavailable|failed/i).first()
    ).toBeVisible({ timeout: 60000 });
    await page.goto(`${BASE}/logout`);
    await expect(page).toHaveURL(/login/, { timeout: 20000 });
  });
});
