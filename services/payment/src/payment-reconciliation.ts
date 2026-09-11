import { AppError } from '@ricton/shared';

interface StoredPaymentAmount {
  amount: unknown;
  currency: string;
}

interface PaystackPaymentAmount {
  amount?: unknown;
  currency?: unknown;
}

export function assertPaystackPaymentMatches(
  stored: StoredPaymentAmount,
  provider: PaystackPaymentAmount
): void {
  if (provider.amount === undefined || provider.amount === null || !provider.currency) {
    throw new AppError(
      'Paystack response is missing amount or currency reconciliation data',
      400,
      'PAYMENT_RECONCILIATION_FAILED'
    );
  }

  const storedAmount = Number(stored.amount);
  const providerAmount = Number(provider.amount);
  if (!Number.isFinite(storedAmount) || !Number.isSafeInteger(providerAmount)) {
    throw new AppError(
      'Payment amount could not be reconciled safely',
      400,
      'PAYMENT_RECONCILIATION_FAILED'
    );
  }

  const expectedLowestUnit = Math.round(storedAmount * 100);
  if (providerAmount !== expectedLowestUnit) {
    throw new AppError(
      `Payment amount mismatch: expected ${expectedLowestUnit}, received ${providerAmount}`,
      400,
      'PAYMENT_RECONCILIATION_FAILED'
    );
  }

  if (String(provider.currency).toUpperCase() !== stored.currency.toUpperCase()) {
    throw new AppError(
      `Payment currency mismatch: expected ${stored.currency}`,
      400,
      'PAYMENT_RECONCILIATION_FAILED'
    );
  }
}
