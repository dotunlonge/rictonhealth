// Canonical specialty enum shared by doctor onboarding + provider directory.
// Keep in sync with mobile booking specialty filter (apps/mobile booking/index.tsx).
export const SPECIALTIES = [
  'General Practice',
  'Cardiology',
  'Dermatology',
  'Pediatrics',
  'Psychiatry',
  'Orthopedics',
  'Gynecology',
  'Neurology',
  'Ophthalmology',
  'ENT',
] as const;

export type Specialty = (typeof SPECIALTIES)[number];
