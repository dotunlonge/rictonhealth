/**
 * Rewards minting cap (TDD RED → GREEN).
 * POST /rewards/internal/earn is service-gated by a shared secret, but any
 * holder (or buggy caller) could mint arbitrary points. A per-call ceiling
 * on basePoints bounds a single mint; idempotency on referenceId already
 * blocks replays.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('rewards earn cap', () => {
  const src = () =>
    fs.readFileSync(
      path.join(root, 'services', 'rewards', 'src', 'controllers', 'rewards.controller.ts'),
      'utf8'
    );

  it('defines a per-call ceiling for basePoints', () => {
    expect(src()).toMatch(/MAX_EARN_BASE_POINTS/);
  });

  it('rejects basePoints above the ceiling in earnPoints', () => {
    const start = src().indexOf('export const earnPoints');
    const body = src().slice(start, src().indexOf('export const ', start + 10));
    expect(body).toMatch(/MAX_EARN_BASE_POINTS/);
  });
});
