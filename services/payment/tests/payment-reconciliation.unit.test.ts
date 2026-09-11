(process.env as Record<string, string>).JWT_SECRET = 'test-jwt-secret';
(process.env as Record<string, string>).DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

jest.mock('@ricton/shared', () => ({
  AppError: class AppError extends Error {
    constructor(message: string) {
      super(message);
    }
  },
}));

import { assertPaystackPaymentMatches } from '../src/payment-reconciliation';

describe('Paystack payment reconciliation', () => {
  it('accepts an exact NGN amount expressed by Paystack in kobo', () => {
    expect(() =>
      assertPaystackPaymentMatches(
        { amount: 15000, currency: 'NGN' },
        { amount: 1_500_000, currency: 'NGN' }
      )
    ).not.toThrow();
  });

  it('fails closed when the provider amount is lower than the stored payment', () => {
    expect(() =>
      assertPaystackPaymentMatches(
        { amount: 15000, currency: 'NGN' },
        { amount: 500_000, currency: 'NGN' }
      )
    ).toThrow(/amount/i);
  });

  it('fails closed on a currency mismatch or missing reconciliation data', () => {
    expect(() =>
      assertPaystackPaymentMatches(
        { amount: 15000, currency: 'NGN' },
        { amount: 1_500_000, currency: 'USD' }
      )
    ).toThrow(/currency/i);
    expect(() =>
      assertPaystackPaymentMatches(
        { amount: 15000, currency: 'NGN' },
        { amount: undefined, currency: undefined }
      )
    ).toThrow(/missing/i);
  });
});
