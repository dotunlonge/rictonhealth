import { Worker } from 'bullmq';
import { prisma } from '@ricton/db';
import { EmailJob, SmsJob, NotificationJob, WebhookJob } from './types';

const processEmail = async (job: { data: EmailJob }) => {
  const { to, subject } = job.data;
  console.log(`[EmailWorker] Sending email to ${to}: ${subject}`);

  if (templateId) {
    console.log(`[EmailWorker] Using template ${templateId}`);
  }

  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log(`[EmailWorker] Email sent to ${to}`);
  return { to, subject, status: 'sent' };
};

const processSms = async (job: { data: SmsJob }) => {
  const { to, message } = job.data;
  console.log(`[SmsWorker] Sending SMS to ${to}: ${message.slice(0, 50)}...`);

  await new Promise((resolve) => setTimeout(resolve, 300));

  console.log(`[SmsWorker] SMS sent to ${to}`);
  return { to, status: 'sent' };
};

const processNotification = async (job: { data: NotificationJob }) => {
  const { userId, type, title, body, channel, metadata } = job.data;
  console.log(`[NotificationWorker] Creating ${channel} notification for ${userId}: ${title}`);

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

  console.log(`[NotificationWorker] Notification ${notification.id} created`);
  return { notificationId: notification.id, channel };
};

const processWebhook = async (job: { data: WebhookJob }) => {
  const { url, payload, headers } = job.data;
  console.log(`[WebhookWorker] Delivering webhook to ${url}`);

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

  console.log(`[WebhookWorker] Webhook delivered to ${url}`);
  return { url, status: response.status };
};

export const startJobProcessors = () => {
  const emailWorker = new Worker('email', processEmail);
  emailWorker.on('completed', (job) => {
    console.log(`[EmailWorker] Job ${job.id} completed`);
  });
  emailWorker.on('failed', (job, err) => {
    console.error(`[EmailWorker] Job ${job?.id} failed:`, err.message);
  });

  const smsWorker = new Worker('sms', processSms);
  smsWorker.on('completed', (job) => {
    console.log(`[SmsWorker] Job ${job.id} completed`);
  });
  smsWorker.on('failed', (job, err) => {
    console.error(`[SmsWorker] Job ${job?.id} failed:`, err.message);
  });

  const notificationWorker = new Worker('notification', processNotification);
  notificationWorker.on('completed', (job) => {
    console.log(`[NotificationWorker] Job ${job.id} completed`);
  });
  notificationWorker.on('failed', (job, err) => {
    console.error(`[NotificationWorker] Job ${job?.id} failed:`, err.message);
  });

  const webhookWorker = new Worker('webhook', processWebhook);
  webhookWorker.on('completed', (job) => {
    console.log(`[WebhookWorker] Job ${job.id} completed`);
  });
  webhookWorker.on('failed', (job, err) => {
    console.error(`[WebhookWorker] Job ${job?.id} failed:`, err.message);
  });

  console.log('[JobProcessors] All workers started');
  return { emailWorker, smsWorker, notificationWorker, webhookWorker };
};
