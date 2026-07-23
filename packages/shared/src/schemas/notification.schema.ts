import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(['EMAIL', 'SMS', 'PUSH', 'IN_APP']),
  channel: z.enum(['EMAIL', 'SMS', 'PUSH', 'IN_APP']),
  title: z.string(),
  message: z.string(),
  data: z.record(z.any()).nullable(),
  isRead: z.boolean(),
  readAt: z.string().datetime().nullable(),
  sentAt: z.string().datetime().nullable(),
  deliveredAt: z.string().datetime().nullable(),
  failedAt: z.string().datetime().nullable(),
  failureReason: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const SendNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(['EMAIL', 'SMS', 'PUSH', 'IN_APP']),
  title: z.string(),
  message: z.string(),
  data: z.record(z.any()).optional(),
});

export const SendBulkNotificationSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1),
  type: z.enum(['EMAIL', 'SMS', 'PUSH', 'IN_APP']),
  title: z.string(),
  message: z.string(),
  data: z.record(z.any()).optional(),
});

export const MarkNotificationAsReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).optional(),
  markAll: z.boolean().default(false),
});

// Type exports
export type NotificationSchema = z.infer<typeof NotificationSchema>;
export type SendNotificationSchema = z.infer<typeof SendNotificationSchema>;
export type SendBulkNotificationSchema = z.infer<typeof SendBulkNotificationSchema>;
export type MarkAsReadSchema = z.infer<typeof MarkAsReadSchema>;

import { registry } from './openapi.registry';

export const NotificationsListResponse = registry.register(
  'NotificationsListResponse',
  z.object({
    success: z.boolean(),
    data: z.object({
      notifications: z.array(NotificationSchema),
      total: z.number(),
      unreadCount: z.number(),
      limit: z.number(),
      offset: z.number(),
    }),
  })
);

export const NotificationDetailResponse = registry.register(
  'NotificationDetailResponse',
  z.object({
    success: z.boolean(),
    data: NotificationSchema,
  })
);

export const SendNotificationResponse = registry.register(
  'SendNotificationResponse',
  z.object({
    success: z.boolean(),
    data: NotificationSchema,
  })
);

export const UnreadCountResponse = registry.register(
  'UnreadCountResponse',
  z.object({
    success: z.boolean(),
    data: z.object({
      count: z.number(),
    }),
  })
);
