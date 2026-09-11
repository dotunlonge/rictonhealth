import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { registry } from './openapi.registry';
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

export const MessagingMarkAsReadSchema = z.object({
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

registry.registerPath({
  method: 'get',
  path: '/api/messages/conversations',
  summary: 'List conversations',
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Conversations list' },
    401: { description: 'Unauthorized' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/messages/conversations',
  summary: 'Create conversation',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateConversationSchema,
        },
      },
    },
  },
  responses: {
    201: { description: 'Conversation created' },
    400: { description: 'Validation error' },
    401: { description: 'Unauthorized' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/messages/conversations/{id}',
  summary: 'Get conversation messages',
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
  ],
  responses: {
    200: { description: 'Conversation messages' },
    401: { description: 'Unauthorized' },
    404: { description: 'Conversation not found' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/messages/conversations/{id}/messages',
  summary: 'Send message',
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
  ],
  request: {
    body: {
      content: {
        'application/json': {
          schema: SendMessageSchema,
        },
      },
    },
  },
  responses: {
    201: { description: 'Message sent' },
    400: { description: 'Validation error' },
    401: { description: 'Unauthorized' },
    404: { description: 'Conversation not found' },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/messages/conversations/{id}/read',
  summary: 'Mark conversation as read',
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
  ],
  responses: {
    200: { description: 'Conversation marked as read' },
    401: { description: 'Unauthorized' },
    404: { description: 'Conversation not found' },
  },
});
