(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';

import { isSlotConflictError } from '../src/controllers/appointment.controller';

// The controller pulls in the lifecycle notifier (BullMQ queues): stub them.
jest.mock('@ricton/shared/jobs', () => ({
  __esModule: true,
  emailQueue: { add: jest.fn().mockResolvedValue(undefined) },
  smsQueue: { add: jest.fn().mockResolvedValue(undefined) },
}));

describe('isSlotConflictError (TDD RED)', () => {
  it('maps Prisma P2034 serialization conflict', () => {
    expect(isSlotConflictError({ code: 'P2034', message: 'write conflict' })).toBe(true);
  });

  it('maps Postgres exclusion violation 23P01 / P2010 with constraint name', () => {
    expect(
      isSlotConflictError({
        code: 'P2010',
        message:
          'Raw query failed. Code: `23P01`. Message: `conflicting key value violates exclusion constraint "no_overlapping_provider_bookings"`',
      })
    ).toBe(true);
  });

  it('maps bare exclusion message without code', () => {
    expect(
      isSlotConflictError({
        message: 'conflicting key value violates exclusion constraint',
      })
    ).toBe(true);
  });

  it('maps serialization SQLSTATE 40001 and deadlock 40P01', () => {
    expect(isSlotConflictError({ code: '40001', message: 'could not serialize' })).toBe(true);
    expect(isSlotConflictError({ code: '40P01', message: 'deadlock detected' })).toBe(true);
  });

  it('does not map unrelated errors', () => {
    expect(isSlotConflictError({ code: 'P2025', message: 'not found' })).toBe(false);
    expect(isSlotConflictError(new Error('boom'))).toBe(false);
    expect(isSlotConflictError(null)).toBe(false);
  });
});
