"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagesListResponseSchema = exports.ConversationsListResponseSchema = exports.MessageResponseSchema = exports.ConversationResponseSchema = exports.MarkMessagesAsReadSchema = exports.SendMessageSchema = exports.CreateConversationSchema = void 0;
const zod_1 = require("zod");
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
(0, zod_to_openapi_1.extendZodWithOpenApi)(zod_1.z);
exports.CreateConversationSchema = zod_1.z.object({
    participantIds: zod_1.z.array(zod_1.z.string().uuid()).min(1).max(10),
    threadType: zod_1.z.enum(['DIRECT', 'GROUP', 'APPOINTMENT', 'MDT']).optional().default('DIRECT'),
    title: zod_1.z.string().max(200).optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.SendMessageSchema = zod_1.z.object({
    body: zod_1.z.string().max(5000).optional(),
    fileUrl: zod_1.z.string().url().optional(),
    fileName: zod_1.z.string().max(255).optional(),
    fileSize: zod_1.z.number().int().positive().optional(),
});
exports.MarkMessagesAsReadSchema = zod_1.z.object({
    messageIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    markAll: zod_1.z.boolean().default(false),
});
exports.ConversationResponseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    threadType: zod_1.z.enum(['DIRECT', 'GROUP', 'APPOINTMENT', 'MDT']),
    title: zod_1.z.string().nullable(),
    participants: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string().uuid(),
        userId: zod_1.z.string().uuid(),
        user: zod_1.z.object({
            id: zod_1.z.string().uuid(),
            firstName: zod_1.z.string(),
            lastName: zod_1.z.string(),
            avatarUrl: zod_1.z.string().nullable(),
            role: zod_1.z.enum(['PATIENT', 'CONSULTANT', 'PHARMACIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']),
        }),
        joinedAt: zod_1.z.string(),
    })),
    lastMessage: zod_1.z
        .object({
        id: zod_1.z.string().uuid(),
        body: zod_1.z.string().nullable(),
        senderId: zod_1.z.string().uuid(),
        createdAt: zod_1.z.string(),
    })
        .nullable(),
    unreadCount: zod_1.z.number().int().nonnegative(),
    updatedAt: zod_1.z.string(),
    createdAt: zod_1.z.string(),
});
exports.MessageResponseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    threadId: zod_1.z.string().uuid(),
    senderId: zod_1.z.string().uuid(),
    sender: zod_1.z.object({
        id: zod_1.z.string().uuid(),
        firstName: zod_1.z.string(),
        lastName: zod_1.z.string(),
        avatarUrl: zod_1.z.string().nullable(),
    }),
    body: zod_1.z.string().nullable(),
    fileUrl: zod_1.z.string().nullable(),
    fileName: zod_1.z.string().nullable(),
    fileSize: zod_1.z.number().nullable(),
    isRead: zod_1.z.boolean(),
    readAt: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string(),
});
exports.ConversationsListResponseSchema = zod_1.z.object({
    conversations: zod_1.z.array(exports.ConversationResponseSchema),
    meta: zod_1.z.object({
        total: zod_1.z.number().int().nonnegative(),
        page: zod_1.z.number().int().positive(),
        limit: zod_1.z.number().int().positive(),
        totalPages: zod_1.z.number().int().nonnegative(),
    }),
});
exports.MessagesListResponseSchema = zod_1.z.object({
    messages: zod_1.z.array(exports.MessageResponseSchema),
    meta: zod_1.z.object({
        total: zod_1.z.number().int().nonnegative(),
        page: zod_1.z.number().int().positive(),
        limit: zod_1.z.number().int().positive(),
        totalPages: zod_1.z.number().int().nonnegative(),
        hasMore: zod_1.z.boolean(),
    }),
});
//# sourceMappingURL=messaging.schema.js.map