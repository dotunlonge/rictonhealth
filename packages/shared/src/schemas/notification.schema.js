"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnreadCountResponse = exports.SendNotificationResponse = exports.NotificationDetailResponse = exports.NotificationsListResponse = exports.MarkAsReadSchema = exports.SendBulkNotificationSchema = exports.SendNotificationSchema = exports.NotificationSchema = void 0;
const zod_1 = require("zod");
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
(0, zod_to_openapi_1.extendZodWithOpenApi)(zod_1.z);
exports.NotificationSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    type: zod_1.z.enum(['EMAIL', 'SMS', 'PUSH', 'IN_APP']),
    channel: zod_1.z.enum(['EMAIL', 'SMS', 'PUSH', 'IN_APP']),
    title: zod_1.z.string(),
    message: zod_1.z.string(),
    data: zod_1.z.record(zod_1.z.any()).nullable(),
    isRead: zod_1.z.boolean(),
    readAt: zod_1.z.string().datetime().nullable(),
    sentAt: zod_1.z.string().datetime().nullable(),
    deliveredAt: zod_1.z.string().datetime().nullable(),
    failedAt: zod_1.z.string().datetime().nullable(),
    failureReason: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string().datetime(),
});
exports.SendNotificationSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    type: zod_1.z.enum(['EMAIL', 'SMS', 'PUSH', 'IN_APP']),
    title: zod_1.z.string(),
    message: zod_1.z.string(),
    data: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.SendBulkNotificationSchema = zod_1.z.object({
    userIds: zod_1.z.array(zod_1.z.string().uuid()).min(1),
    type: zod_1.z.enum(['EMAIL', 'SMS', 'PUSH', 'IN_APP']),
    title: zod_1.z.string(),
    message: zod_1.z.string(),
    data: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.MarkAsReadSchema = zod_1.z.object({
    notificationIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    markAll: zod_1.z.boolean().default(false),
});
const openapi_registry_1 = require("./openapi.registry");
exports.NotificationsListResponse = openapi_registry_1.registry.register('NotificationsListResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.object({
        notifications: zod_1.z.array(exports.NotificationSchema),
        total: zod_1.z.number(),
        unreadCount: zod_1.z.number(),
        limit: zod_1.z.number(),
        offset: zod_1.z.number(),
    }),
}));
exports.NotificationDetailResponse = openapi_registry_1.registry.register('NotificationDetailResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: exports.NotificationSchema,
}));
exports.SendNotificationResponse = openapi_registry_1.registry.register('SendNotificationResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: exports.NotificationSchema,
}));
exports.UnreadCountResponse = openapi_registry_1.registry.register('UnreadCountResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.object({
        count: zod_1.z.number(),
    }),
}));
//# sourceMappingURL=notification.schema.js.map