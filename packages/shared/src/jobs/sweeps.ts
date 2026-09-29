/**
 * Hourly lifecycle sweeps (documentation + single entrypoint).
 *
 * - Appointments: `runAppointmentReminders` (./reminders) — 24h window,
 *   idempotent claim via reminderSentAt. Run from the shared worker.
 * - Telemedicine: `sweepStaleRooms(now)` (services/telemedicine controller) —
 *   CREATED older than 2h and ACTIVE older than 3h → ENDED (best-effort).
 *   Schedule from the telemedicine service (it owns @ricton/db access there).
 * - Payments: `sweepStalePendingPayments(now)` (services/payment controller) —
 *   PENDING older than 30min → FAILED + metadata {expired:true}, unlink
 *   appointment.paymentId best-effort. Schedule from the payment service.
 *
 * This module intentionally has no static imports of the services (avoids
 * shared↔service cycles); service sweeps are invoked by their own schedulers.
 */
export interface HourlySweepSummary {
  reminders?: { reminded: number; skipped: number };
}

export async function runHourlySweeps(now = new Date()): Promise<HourlySweepSummary> {
  const { runAppointmentReminders } = await import('./reminders');
  const reminders = await runAppointmentReminders(now);
  return { reminders };
}
