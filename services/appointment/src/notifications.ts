import { prisma } from '@ricton/db';
import { emailQueue, smsQueue } from '@ricton/shared/jobs';

export type AppointmentNotificationType =
  | 'APPOINTMENT_BOOKED'
  | 'APPOINTMENT_CONFIRMED'
  | 'APPOINTMENT_CANCELLED'
  | 'APPOINTMENT_RESCHEDULED'
  | 'APPOINTMENT_REMINDER'
  | 'APPOINTMENT_NO_SHOW';

export interface AppointmentNudgeInput {
  userId: string;
  type: AppointmentNotificationType;
  title: string;
  body: string;
  email?: string | null;
  phone?: string | null;
}

function formatSlot(when: Date): string {
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos',
  }).format(when);
}

export function slotLabel(scheduledAt: Date | string): string {
  return `${formatSlot(new Date(scheduledAt))} (WAT)`;
}

async function channelPrefs(userId: string): Promise<{ email: boolean; sms: boolean }> {
  try {
    const prefs = await prisma.notificationPreference.findUnique({ where: { userId } });
    // Platform default is all-channels-on; a missing row means defaults.
    return { email: prefs?.emailEnabled ?? true, sms: prefs?.smsEnabled ?? true };
  } catch {
    return { email: true, sms: true };
  }
}

/**
 * Durable IN_APP record. DB-only and fast: callers await this BEFORE the HTTP
 * response (inside try/catch) so the inbox is consistent the moment the
 * client refreshes. THROWS on failure — the caller decides (log + continue).
 */
export async function createAppointmentNotification(data: {
  userId: string;
  type: AppointmentNotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      channel: 'IN_APP',
      metadata: (data.metadata ?? {}) as never,
    },
  });
}

/**
 * Best-effort EMAIL/SMS nudges. Queue-backed (Redis): callers fire these
 * AFTER the HTTP response so a sick queue can never stall a booking.
 * NEVER throws.
 */
export async function sendAppointmentNudges(input: AppointmentNudgeInput): Promise<void> {
  const { userId, type, title, body, email, phone } = input;
  const prefs = await channelPrefs(userId);
  if (prefs.email && email) {
    try {
      await emailQueue.add(type.toLowerCase().replaceAll('_', '-'), {
        to: email,
        subject: `Ricton Health — ${title}`,
        body,
      });
    } catch (err) {
      console.warn(`[appointment] email enqueue failed for ${userId}`, err);
    }
  }
  if (prefs.sms && phone) {
    try {
      await smsQueue.add(type.toLowerCase().replaceAll('_', '-'), { to: phone, message: body });
    } catch (err) {
      console.warn(`[appointment] sms enqueue failed for ${userId}`, err);
    }
  }
}
