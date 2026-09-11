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
