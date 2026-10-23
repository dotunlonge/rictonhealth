/**
 * A5: mobile E2E seed fixtures are deterministic and cover every slice matrix.
 * Run: npx jest packages/db/tests/seed-mobile-e2e.test.ts
 */
import {
  E2E_AVAILABILITY,
  E2E_MESSAGE_BODY,
  E2E_OTP_USERS,
  E2E_PASSWORD,
  E2E_PATIENT,
  E2E_PHARMACY,
  E2E_PRESCRIPTIONS,
  E2E_PRODUCTS,
  E2E_PROVIDER,
  E2E_REWARD,
  E2E_REWARD_POINTS,
  E2E_SUBSCRIPTION_PLAN,
  E2E_VIDEO_VISIT,
  E2E_WALLET_BALANCE,
} from '../prisma/seed-mobile-e2e.fixtures';

describe('mobile E2E seed fixtures', () => {
  it('uses fixed identities with a strong password', () => {
    expect(E2E_PATIENT.email).toContain('e2e.patient');
    expect(E2E_PROVIDER.email).toContain('e2e.doctor');
    expect(E2E_PHARMACY.email).toContain('e2e.pharmacy');
    expect(E2E_PASSWORD.length).toBeGreaterThanOrEqual(8);
  });

  it('covers weekday availability for slot journeys', () => {
    expect(E2E_AVAILABILITY).toHaveLength(5);
    for (const a of E2E_AVAILABILITY) {
      expect(a.startTime < a.endTime).toBe(true);
    }
  });

  it('covers all prescription orderability states', () => {
    const states = E2E_PRESCRIPTIONS.map((p) => ({
      status: p.status,
      signed: p.signedAt !== null,
    }));
    expect(states).toContainEqual({ status: 'DRAFT', signed: false });
    expect(states).toContainEqual({ status: 'SIGNED', signed: true });
    expect(states).toContainEqual({ status: 'DISPENSED', signed: true });
  });

  it('covers OTC + prescription-only products with stock', () => {
    expect(E2E_PRODUCTS.length).toBeGreaterThanOrEqual(3);
    expect(E2E_PRODUCTS.some((p) => p.requiresPrescription)).toBe(true);
    expect(E2E_PRODUCTS.some((p) => !p.requiresPrescription)).toBe(true);
    for (const p of E2E_PRODUCTS) {
      expect(p.stock).toBeGreaterThan(0);
    }
  });

  it('funds the wallet and sets a premium entitlement', () => {
    expect(E2E_WALLET_BALANCE).toBeGreaterThan(0);
    expect(E2E_SUBSCRIPTION_PLAN).toBe('PREMIUM');
  });

  it('seeds an in-window video visit with a linked room', () => {
    expect(E2E_VIDEO_VISIT.reason.length).toBeGreaterThan(0);
    expect(E2E_VIDEO_VISIT.durationMinutes).toBeGreaterThan(0);
    expect(E2E_VIDEO_VISIT.externalRoomId.startsWith('ricton-')).toBe(true);
  });

  it('reserves OTP-registration identities for rerunnable register journeys', () => {
    expect(E2E_OTP_USERS).toHaveLength(2);
    expect(new Set(E2E_OTP_USERS).size).toBe(2);
  });

  it('seeds a clinician thread and redeemable rewards', () => {
    expect(E2E_MESSAGE_BODY.length).toBeGreaterThan(0);
    expect(E2E_REWARD.name.length).toBeGreaterThan(0);
    expect(E2E_REWARD_POINTS).toBeGreaterThan(E2E_REWARD.pointsCost);
  });

  it('gives the provider a public practice location for nearby discovery', () => {
    expect(E2E_PROVIDER.practiceLocationVisible).toBe(true);
    expect(E2E_PROVIDER.practiceLatitude).toBeGreaterThanOrEqual(-90);
    expect(E2E_PROVIDER.practiceLatitude).toBeLessThanOrEqual(90);
    expect(E2E_PROVIDER.practiceLongitude).toBeGreaterThanOrEqual(-180);
    expect(E2E_PROVIDER.practiceLongitude).toBeLessThanOrEqual(180);
    expect(E2E_PROVIDER.practiceCity.length).toBeGreaterThan(0);
    expect(E2E_PROVIDER.practiceState.length).toBeGreaterThan(0);
  });
});
