/**
 * A5: mobile E2E seed fixtures are deterministic and cover every slice matrix.
 * Run: npx jest packages/db/tests/seed-mobile-e2e.test.ts
 */
import {
  E2E_AVAILABILITY,
  E2E_PASSWORD,
  E2E_PATIENT,
  E2E_PHARMACY,
  E2E_PRESCRIPTIONS,
  E2E_PRODUCTS,
  E2E_PROVIDER,
  E2E_SUBSCRIPTION_PLAN,
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
});
