/**
 * BullMQ requires maxRetriesPerRequest: null on its blocking connections.
 * Regression: notification-service and the delivery workers crashed at boot with
 * "BullMQ: Your redis options maxRetriesPerRequest must be null" because every
 * Queue/Worker shared the general-purpose redis client (maxRetriesPerRequest: 3).
 * Hermetic: points at a dead port before import; never touches real Redis.
 * Run: npx jest packages/shared/tests/redis-bullmq.test.ts (no DB/Redis needed)
 */
import { Worker } from 'bullmq';

process.env.REDIS_URL = 'redis://127.0.0.1:6399';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { bullmqConnection } = require('../src/redis');

describe('BullMQ redis connection', () => {
  it('uses maxRetriesPerRequest: null', () => {
    expect(bullmqConnection.options.maxRetriesPerRequest).toBeNull();
  });

  it('constructs a Worker without the maxRetriesPerRequest crash', async () => {
    let worker: Worker | undefined;
    expect(() => {
      worker = new Worker('test-noop', async () => undefined, {
        connection: bullmqConnection,
        autorun: false,
      });
    }).not.toThrow();
    await worker!.disconnect().catch(() => undefined);
  });
});
