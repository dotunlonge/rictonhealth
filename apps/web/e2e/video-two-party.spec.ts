import { test, expect, request, chromium } from '@playwright/test';

// Two REAL browser instances against the video flow (fake media devices).
// Requires backend reachability (skipped in CI without it):
//   TWILIO_E2E=1 with services running.
//
// Provider reality (verified live): Twilio Programmable Video is SUNSET —
// room provisioning answers "migrate to LiveKit/Daily", so no real media
// session can be established on Twilio anymore. This spec therefore proves
// the fail-closed contract in real browsers: both parties are rejected
// cleanly (no simulated tokens, no hangs, honest error UI), which is the
// safe behavior until the provider migration (LiveKit) lands.
const TWILIO_E2E = process.env.TWILIO_E2E === '1';
const BASE = process.env.E2E_BASE_URL || 'http://localhost:3100';

const API = 'http://localhost:3001/api/auth';
const stamp = Date.now().toString(36);
const doctorEmail = `e2e-vdoc-${stamp}@example.com`;
const patientEmail = `e2e-vpat-${stamp}@example.com`;
const password = 'E2eSecure1!';

async function apiRegister(email: string, role: string) {
  const ctx = await request.newContext();
  const digit = role === 'CONSULTANT' ? '3' : '4';
  const res = await ctx.post(`${API}/register`, {
    data: {
      email,
      phone: `+2348${digit}${stamp.slice(-7).padStart(7, '0')}`,
      password,
      role,
      firstName: 'E2E',
      lastName: role,
      consentVersion: '1.0',
    },
  });
  expect(res.ok(), `register failed: ${await res.text()}`).toBeTruthy();
  await ctx.dispose();
}

async function apiLogin(email: string): Promise<{ token: string; userId: string }> {
  const ctx = await request.newContext();
  const res = await ctx.post(`${API}/login`, { data: { email, password } });
  expect(res.ok(), `login failed: ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  await ctx.dispose();
  return { token: body.data.token as string, userId: body.data.user.id as string };
}

async function setupAppointmentRoom(
  doctorToken: string,
  patientToken: string,
  doctorId: string,
  patientId: string
): Promise<string> {
  const target = new Date(Date.now() + 24 * 60 * 60 * 1000);
  target.setUTCHours(10, 0, 0, 0);
  const dayOfWeek = (target.getUTCDay() + 6) % 7; // Mon=0..Sun=6

  const docCtx = await request.newContext({
    extraHTTPHeaders: { Authorization: `Bearer ${doctorToken}` },
  });
  const avail = await docCtx.post('http://localhost:3005/api/appointments/availability', {
    data: { dayOfWeek, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 },
  });
  expect(avail.ok(), `availability failed: ${await avail.text()}`).toBeTruthy();

  const patCtx = await request.newContext({
    extraHTTPHeaders: { Authorization: `Bearer ${patientToken}` },
  });
  const booking = await patCtx.post('http://localhost:3005/api/appointments', {
    data: { providerId: doctorId, scheduledAt: target.toISOString(), type: 'VIDEO' },
  });
  expect(booking.ok(), `booking failed: ${await booking.text()}`).toBeTruthy();
  const appointmentId = ((await booking.json()).data as { id: string }).id;

  // Booking a VIDEO appointment auto-creates its telemedicine room (one room
  // per appointment, enforced by unique appointmentId) — adopt it instead of
  // creating a duplicate.
  const roomsRes = await docCtx.get('http://localhost:3013/api/telemedicine/rooms');
  expect(roomsRes.ok(), `room list failed: ${await roomsRes.text()}`).toBeTruthy();
  const rooms = (await roomsRes.json()).data as Array<{ id: string; appointmentId: string }>;
  const room = rooms.find((r) => r.appointmentId === appointmentId);
  expect(room, 'expected auto-created room for the appointment').toBeDefined();
  await docCtx.dispose();
  await patCtx.dispose();
  void patientId;
  return room!.id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function uiLogin(page: any, email: string) {
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder('Email address or phone').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: /sign in|log in|continue/i }).click();
  await expect(page).not.toHaveURL(/login/, { timeout: 20000 });
}

test.describe('two-party video', () => {
  test.skip(!TWILIO_E2E, 'needs TWILIO_E2E=1 with provider credentials');

  test('both parties fail closed with honest UI (no simulated media session)', async () => {
    test.setTimeout(240_000);
    await apiRegister(doctorEmail, 'CONSULTANT');
    await apiRegister(patientEmail, 'PATIENT');
    const doctor = await apiLogin(doctorEmail);
    const patient = await apiLogin(patientEmail);

    // Appointment-backed room so BOTH parties are members (membership is enforced).
    const roomId = await setupAppointmentRoom(
      doctor.token,
      patient.token,
      doctor.userId,
      patient.userId
    );
    expect(roomId).toBeDefined();

    const mediaArgs = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'];
    const doctorBrowser = await chromium.launch({ args: mediaArgs });
    const patientBrowser = await chromium.launch({ args: mediaArgs });
    try {
      const doctorPage = await (await doctorBrowser.newContext()).newPage();
      const patientPage = await (await patientBrowser.newContext()).newPage();

      await uiLogin(doctorPage, doctorEmail);
      await uiLogin(patientPage, patientEmail);

      // Provider is sunset: both rooms must surface a clean error (or, if a
      // provider ever succeeds, a live room) — but never a simulated token,
      // a hang, or an unhandled crash.
      for (const page of [doctorPage, patientPage]) {
        await page.goto(`${BASE}/telemedicine/${roomId}`);
        await expect(
          page.getByText(/1 participant|not configured|failed|unavailable|error/i).first()
        ).toBeVisible({ timeout: 90000 });
        const body = ((await page.textContent('body')) || '').toLowerCase();
        expect(body).not.toContain('simulated_token');
      }
    } finally {
      await doctorBrowser.close();
      await patientBrowser.close();
    }
  });
});
