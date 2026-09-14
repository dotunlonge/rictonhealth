import { Queue } from 'bullmq';
import { bullmqConnection } from '../redis';

const defaultJobOptions = {
  removeOnComplete: 100,
  removeOnFail: 10,
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  },
};

export const emailQueue = new Queue('email', { connection: bullmqConnection, defaultJobOptions });
export const smsQueue = new Queue('sms', { connection: bullmqConnection, defaultJobOptions });
export const notificationQueue = new Queue('notification', {
  connection: bullmqConnection,
  defaultJobOptions,
});
export const webhookQueue = new Queue('webhook', {
  connection: bullmqConnection,
  defaultJobOptions,
});

export * from './processors';
export * from './renewals';
export * from './outbox';
