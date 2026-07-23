import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
extendZodWithOpenApi(z);

export const CreateConversationSchema = z.object({
  participantIds: z.array(z.string().uuid()).min(1).max(10),
  threadType: z.enum(['DIRECT', 'GROUP', 'APPOINTMENT', 'MDT']).optional().default('DIRECT'),
  title: z.string().max(200).optional(),
  metadata: z.record(z.any()).optional(),
});

export const SendMessageSchema = z.object({
  body: z.string().max(5000).optional(),
  fileUrl: z.string().url().optional(),
  fileName: z.string().max(255).optional(),
  fileSize: z.number().int().positive().optional(),
});

export const MarkAsReadSchema = z.object({
  messageIds: z.array(z.string().uuid()).optional(),
  markAll: z.boolean().default(false),
});

export const ConversationResponseSchema = z.object({
  id: z.string().uuid(),
  threadType: z.enum(['DIRECT', 'GROUP', 'APPOINTMENT', 'MDT']),
  title: z.string().nullable(),
  participants: z.array(
    z.object({
      id: z.string().uuid(),
      userId: z.string().uuid(),
      user: z.object({
        id: z.string().uuid(),
        firstName: z.string(),
        lastName: z.string(),
        avatarUrl: z.string().nullable(),
        role: z.enum(['PATIENT', 'CONSULTANT', 'PHARMACIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']),
      }),
      joinedAt: z.string(),
    })
  ),
  lastMessage: z
    .object({
      id: z.string().uuid(),
      body: z.string().nullable(),
      senderId: z.string().uuid(),
      createdAt: z.string(),
    })
    .nullable(),
  unreadCount: z.number().int().nonnegative(),
  updatedAt: z.string(),
  createdAt: z.string(),
});

export const MessageResponseSchema = z.object({
  id: z.string().uuid(),
  threadId: z.string().uuid(),
  senderId: z.string().uuid(),
  sender: z.object({
    id: z.string().uuid(),
    firstName: z.string(),
    lastName: z.string(),
    avatarUrl: z.string().nullable(),
  }),
  body: z.string().nullable(),
  fileUrl: z.string().nullable(),
  fileName: z.string().nullable(),
  fileSize: z.number().nullable(),
  isRead: z.boolean(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});

export const ConversationsListResponseSchema = z.object({
  conversations: z.array(ConversationResponseSchema),
  meta: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export const MessagesListResponseSchema = z.object({
  messages: z.array(MessageResponseSchema),
  meta: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  }),
});
