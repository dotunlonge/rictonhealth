/**
 * Deterministic mobile E2E fixtures (pure, DB-free).
 * Every rerun produces the same accounts/catalog so Maestro journeys are stable.
 * The seed script upserts by email — safe to run repeatedly.
 */

export const E2E_PASSWORD = 'E2ePass123!';

export const E2E_PATIENT = {
  email: 'e2e.patient@ricton.health',
  phone: '+2348000000101',
  firstName: 'Adaeze',
  lastName: 'E2E',
} as const;

export const E2E_PROVIDER = {
  email: 'e2e.doctor@ricton.health',
  phone: '+2348000000102',
  firstName: 'Emeka',
  lastName: 'E2E',
  specialty: 'Cardiology',
  consultationFee: 15000,
} as const;

export const E2E_PHARMACY = {
  email: 'e2e.pharmacy@ricton.health',
  phone: '+2348000000103',
  pharmacyName: 'E2E Test Pharmacy',
} as const;

/** Availability Mon–Fri 09:00–17:00, 30-min slots (dayOfWeek 0=Monday). */
export const E2E_AVAILABILITY = [0, 1, 2, 3, 4].map((dayOfWeek) => ({
  dayOfWeek,
  startTime: '09:00:00',
  endTime: '17:00:00',
  slotDurationMinutes: 30,
  isActive: true,
}));

export const E2E_PRODUCTS = [
  {
    name: 'E2E Paracetamol 500mg',
    price: 1500,
    stock: 100,
    category: 'Analgesics',
    requiresPrescription: false,
  },
  {
    name: 'E2E Amoxicillin 250mg',
    price: 4500,
    stock: 50,
    category: 'Antibiotics',
    requiresPrescription: true,
  },
  {
    name: 'E2E Vitamin C 1000mg',
    price: 3000,
    stock: 200,
    category: 'Supplements',
    requiresPrescription: false,
  },
] as const;

/** One prescription per orderability state (mirrors mobile isOrderable). */
export const E2E_PRESCRIPTIONS = [
  { key: 'draft', status: 'DRAFT', signedAt: null },
  { key: 'signed', status: 'SIGNED', signedAt: '2026-09-01T10:00:00Z' },
  { key: 'dispensed', status: 'DISPENSED', signedAt: '2026-08-01T10:00:00Z' },
] as const;

export const E2E_WALLET_BALANCE = 15000;
export const E2E_WALLET_CURRENCY = 'NGN';

export const E2E_SUBSCRIPTION_PLAN = 'PREMIUM';

/** Fixed OTP-registration identities (seed deletes them first, so the
 *  register → code-entry journeys are rerunnable). */
export const E2E_OTP_USERS = ['e2e.otp.a@ricton.health', 'e2e.otp.b@ricton.health'] as const;

export const E2E_PATIENT_FIRST_NAME = 'Adaeze';

/** Seeded clinician message shown in the inbox/thread journeys. */
export const E2E_MESSAGE_BODY = 'E2E seeded hello from your clinician';

/** Seeded reward catalog + points for the redeem journeys. */
export const E2E_REWARD = {
  name: 'E2E Health Voucher',
  description: 'Seeded redeem journey reward',
  pointsCost: 100,
  stock: 50,
} as const;
export const E2E_REWARD_POINTS = 500;

/**
 * Seeded VIDEO visit for telemedicine journeys: booked CONFIRMED with a linked
 * LiveKit room, scheduled 5 minutes ago (30-min duration) so the 15-early /
 * 30-late join window is open at seed time. Reason doubles as the idempotency
 * marker — the seed deletes only rows carrying it before recreating.
 */
export const E2E_VIDEO_VISIT = {
  reason: 'E2E video follow-up visit',
  durationMinutes: 30,
  externalRoomId: 'ricton-e2e-video-visit',
} as const;
