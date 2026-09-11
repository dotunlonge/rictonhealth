import { Queue } from 'bullmq';
import { redis } from '../redis';

const defaultJobOptions = {
  removeOnComplete: 100,
  removeOnFail: 10,
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  },
};

export const emailQueue = new Queue('email', { connection: redis, defaultJobOptions });
export const smsQueue = new Queue('sms', { connection: redis, defaultJobOptions });
export const notificationQueue = new Queue('notification', {
  connection: redis,
  defaultJobOptions,
});
export const webhookQueue = new Queue('webhook', { connection: redis, defaultJobOptions });

export * from './processors';
export * from './renewals';
export * from './outbox';
