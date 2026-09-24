import { Worker, Queue } from 'bullmq';
import { prisma } from '@ricton/db';
import { logger } from '../logger';
import { bullmqConnection } from '../redis';
import { emailQueue } from './index';

/** Visits starting within this window get reminded (mobile promises reminders). */
export const REMINDER_WINDOW_HOURS = 24;
/** Upper bound per sweep so one run cannot monopolize the worker. */
const REMINDER_BATCH_SIZE = 500;

export interface ReminderSweepResult {
  reminded: number;
  skipped: number;
}

function formatSlot(when: Date): string {
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(when);
}

/**
 * Hourly reminder sweep. Candidate = PENDING/CONFIRMED, unreminded,
 * starting within 24h. Cancelled/completed/past/already-reminded visits are
 * not candidates (excluded at query, not counted).
 *
 * Idempotent across replicas: each visit is claimed with a conditional
 * updateMany (reminderSentAt null → now) so overlapping runs never
 * double-notify. IN_APP write failure releases nothing (already claimed) but
 * is counted skipped; email is a non-blocking nudge.
 */
export async function runAppointmentReminders(now = new Date()): Promise<ReminderSweepResult> {
  const result: ReminderSweepResult = { reminded: 0, skipped: 0 };
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

  const due = await prisma.appointment.findMany({
    where: {
      status: { in: ['PENDING', 'CONFIRMED'] },
      reminderSentAt: null,
      scheduledAt: { gt: now },
    },
    include: {
      patient: { select: { id: true, email: true } },
    },
    orderBy: { scheduledAt: 'asc' },
    take: REMINDER_BATCH_SIZE,
  });

  for (const appt of due) {
    if (appt.scheduledAt > windowEnd) {
      result.skipped += 1;
      continue;
    }
    const claimed = await prisma.appointment.updateMany({
      where: { id: appt.id, reminderSentAt: null },
      data: { reminderSentAt: now },
    });
    if (claimed.count === 0) {
      result.skipped += 1;
      continue;
    }
    const when = formatSlot(appt.scheduledAt);
    try {
      await prisma.notification.create({
        data: {
          userId: appt.patientId,
          type: 'APPOINTMENT_REMINDER',
          title: 'Upcoming visit reminder',
          body: `Reminder: your visit is on ${when} (UTC). Join from your appointments list when it is time.`,
          channel: 'IN_APP',
          metadata: { appointmentId: appt.id } as never,
        },
      });
    } catch (err) {
      logger.warn({ err, appointmentId: appt.id }, 'Reminder IN_APP write failed');
      result.skipped += 1;
      continue;
    }
    try {
      if (appt.patient.email) {
        await emailQueue.add('appointment-reminder', {
          to: appt.patient.email,
          subject: 'Ricton Health — upcoming visit reminder',
          body: `Reminder: your visit is on ${when} (UTC).`,
        });
      }
    } catch (err) {
      logger.warn({ err, appointmentId: appt.id }, 'Reminder email enqueue failed (non-blocking)');
    }
    result.reminded += 1;
  }

  return result;
}

export const appointmentReminderQueue = new Queue('appointment-reminders', {
  connection: bullmqConnection,
  defaultJobOptions: { removeOnComplete: 50, removeOnFail: 20, attempts: 3 },
});

export function startReminderWorker() {
  const worker = new Worker(
    'appointment-reminders',
    async () => {
      const result = await runAppointmentReminders();
      logger.info(result, 'Appointment reminder sweep completed');
      return result;
    },
    { connection: bullmqConnection }
  );
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err?.message }, 'Reminder sweep failed');
  });
  return worker;
}

export async function scheduleReminderSweep() {
  await appointmentReminderQueue.add(
    'hourly-sweep',
    {},
    { repeat: { pattern: '0 * * * *' }, jobId: 'appointment-reminder-hourly' }
  );
}
