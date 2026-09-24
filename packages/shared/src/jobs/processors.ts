import { Worker } from 'bullmq';
import { prisma } from '@ricton/db';
import { logger } from '../logger';
import { bullmqConnection } from '../redis';
import { EmailJob, SmsJob, NotificationJob, WebhookJob } from './types';
import { startRenewalWorker, scheduleRenewalSweep } from './renewals';
import { startReminderWorker, scheduleReminderSweep } from './reminders';
import { startOutboxWorker, scheduleOutboxRelay } from './outbox';

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL);
}

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}

export async function sendEmailViaProvider(input: {
  to: string;
  subject: string;
  templateId?: string;
  body?: string;
  html?: string;
}): Promise<{ to: string; subject: string; status: 'sent' | 'skipped' }> {
  const { to, subject, templateId, body, html } = input;
  logger.info(`[EmailWorker] Sending email to ${to}: ${subject}`);

  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM_EMAIL;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SendGrid is not configured; email job will retry');
    }
    logger.warn('[EmailWorker] SendGrid unconfigured — skipping delivery (non-production)');
    return { to, subject, status: 'skipped' as const };
  }

  const response = await fetch(SENDGRID_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      content: [
        {
          type: 'text/plain',
          value: body ?? `Ricton Health notification: ${subject}`,
        },
        ...(html || templateId ? [{ type: 'text/html', value: html ?? `<p>${subject}</p>` }] : []),
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`SendGrid delivery failed: ${response.status} ${response.statusText}`);
  }

  logger.info(`[EmailWorker] Email sent to ${to}`);
  return { to, subject, status: 'sent' as const };
}

const processEmail = async (job: { data: EmailJob }) => sendEmailViaProvider(job.data);

export async function sendSmsViaProvider(input: {
  to: string;
  message: string;
}): Promise<{ to: string; status: 'sent' | 'skipped' }> {
  const { to, message } = input;
  logger.info(`[SmsWorker] Sending SMS to ${to}: ${message.slice(0, 50)}...`);

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !from) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Twilio is not configured; SMS job will retry');
    }
    logger.warn('[SmsWorker] Twilio unconfigured — skipping delivery (non-production)');
    return { to, status: 'skipped' as const };
  }

  const params = new URLSearchParams({ To: to, From: from, Body: message });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  );

  if (!response.ok) {
    throw new Error(`Twilio delivery failed: ${response.status} ${response.statusText}`);
  }

  logger.info(`[SmsWorker] SMS sent to ${to}`);
  return { to, status: 'sent' as const };
}

const processSms = async (job: { data: SmsJob }) => sendSmsViaProvider(job.data);

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
  const emailWorker = new Worker('email', processEmail, { connection: bullmqConnection });
  emailWorker.on('completed', (job: any) => {
    logger.info(`[EmailWorker] Job ${job.id} completed`);
  });
  emailWorker.on('failed', (job: any, err: any) => {
    logger.error(`[EmailWorker] Job ${job?.id} failed: ${err.message}`);
  });

  const smsWorker = new Worker('sms', processSms, { connection: bullmqConnection });
  smsWorker.on('completed', (job: any) => {
    logger.info(`[SmsWorker] Job ${job.id} completed`);
  });
  smsWorker.on('failed', (job: any, err: any) => {
    logger.error(`[SmsWorker] Job ${job?.id} failed: ${err.message}`);
  });

  const notificationWorker = new Worker('notification', processNotification, {
    connection: bullmqConnection,
  });
  notificationWorker.on('completed', (job: any) => {
    logger.info(`[NotificationWorker] Job ${job.id} completed`);
  });
  notificationWorker.on('failed', (job: any, err: any) => {
    logger.error(`[NotificationWorker] Job ${job?.id} failed: ${err.message}`);
  });

  const webhookWorker = new Worker('webhook', processWebhook, { connection: bullmqConnection });
  webhookWorker.on('completed', (job: any) => {
    logger.info(`[WebhookWorker] Job ${job.id} completed`);
  });
  webhookWorker.on('failed', (job: any, err: any) => {
    logger.error(`[WebhookWorker] Job ${job?.id} failed: ${err.message}`);
  });

  const renewalWorker = startRenewalWorker();
  scheduleRenewalSweep().catch((err) =>
    logger.error({ err }, 'Failed to schedule subscription renewal sweep')
  );

  const reminderWorker = startReminderWorker();
  scheduleReminderSweep().catch((err) =>
    logger.error({ err }, 'Failed to schedule appointment reminder sweep')
  );

  const outboxWorker = startOutboxWorker();
  scheduleOutboxRelay().catch((err) => logger.error({ err }, 'Failed to schedule outbox relay'));

  logger.info('[JobProcessors] All workers started');
  return {
    emailWorker,
    smsWorker,
    notificationWorker,
    webhookWorker,
    renewalWorker,
    reminderWorker,
    outboxWorker,
  };
};
