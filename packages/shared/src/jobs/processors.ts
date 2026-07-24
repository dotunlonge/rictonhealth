import { Worker } from 'bullmq';
import { prisma } from '@ricton/db';
import { logger } from '../logger';
import { redis } from '../redis';
import { EmailJob, SmsJob, NotificationJob, WebhookJob } from './types';

const processEmail = async (job: { data: EmailJob }) => {
  const { to, subject, templateId } = job.data;
  logger.info(`[EmailWorker] Sending email to ${to}: ${subject}`);

  if (templateId) {
    logger.info(`[EmailWorker] Using template ${templateId}`);
  }

  await new Promise((resolve) => setTimeout(resolve, 500));

  logger.info(`[EmailWorker] Email sent to ${to}`);
  return { to, subject, status: 'sent' };
};

const processSms = async (job: { data: SmsJob }) => {
  const { to, message } = job.data;
  logger.info(`[SmsWorker] Sending SMS to ${to}: ${message.slice(0, 50)}...`);

  await new Promise((resolve) => setTimeout(resolve, 300));

  logger.info(`[SmsWorker] SMS sent to ${to}`);
  return { to, status: 'sent' };
};

const processNotification = async (job: { data: NotificationJob }) => {
  const { userId, type, title, body, channel, metadata } = job.data;
  logger.info(`[NotificationWorker] Creating ${channel} notification for ${userId}: ${title}`);

  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      channel,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
    },
  });

  logger.info(`[NotificationWorker] Notification ${notification.id} created`);
  return { notificationId: notification.id, channel };
};

const processWebhook = async (job: { data: WebhookJob }) => {
  const { url, payload, headers } = job.data;
  logger.info(`[WebhookWorker] Delivering webhook to ${url}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
  }

  logger.info(`[WebhookWorker] Webhook delivered to ${url}`);
  return { url, status: response.status };
};

export const startJobProcessors = () => {
  const emailWorker = new Worker('email', processEmail, { connection: redis });
  emailWorker.on('completed', (job: any) => {
    logger.info(`[EmailWorker] Job ${job.id} completed`);
  });
  emailWorker.on('failed', (job: any, err: any) => {
    logger.error(`[EmailWorker] Job ${job?.id} failed: ${err.message}`);
  });

  const smsWorker = new Worker('sms', processSms, { connection: redis });
  smsWorker.on('completed', (job: any) => {
    logger.info(`[SmsWorker] Job ${job.id} completed`);
  });
  smsWorker.on('failed', (job: any, err: any) => {
    logger.error(`[SmsWorker] Job ${job?.id} failed: ${err.message}`);
  });

  const notificationWorker = new Worker('notification', processNotification, { connection: redis });
  notificationWorker.on('completed', (job: any) => {
    logger.info(`[NotificationWorker] Job ${job.id} completed`);
  });
  notificationWorker.on('failed', (job: any, err: any) => {
    logger.error(`[NotificationWorker] Job ${job?.id} failed: ${err.message}`);
  });

  const webhookWorker = new Worker('webhook', processWebhook, { connection: redis });
  webhookWorker.on('completed', (job: any) => {
    logger.info(`[WebhookWorker] Job ${job.id} completed`);
  });
  webhookWorker.on('failed', (job: any, err: any) => {
    logger.error(`[WebhookWorker] Job ${job?.id} failed: ${err.message}`);
  });

  logger.info('[JobProcessors] All workers started');
  return { emailWorker, smsWorker, notificationWorker, webhookWorker };
};
