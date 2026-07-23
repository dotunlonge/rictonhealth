import { z } from 'zod';
export declare const NotificationSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    type: z.ZodEnum<["EMAIL", "SMS", "PUSH", "IN_APP"]>;
    channel: z.ZodEnum<["EMAIL", "SMS", "PUSH", "IN_APP"]>;
    title: z.ZodString;
    message: z.ZodString;
    data: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodAny>>;
    isRead: z.ZodBoolean;
    readAt: z.ZodNullable<z.ZodString>;
    sentAt: z.ZodNullable<z.ZodString>;
    deliveredAt: z.ZodNullable<z.ZodString>;
    failedAt: z.ZodNullable<z.ZodString>;
    failureReason: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    type: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
    title: string;
    data: Record<string, any> | null;
    id: string;
    createdAt: string;
    userId: string;
    channel: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
    isRead: boolean;
    readAt: string | null;
    sentAt: string | null;
    deliveredAt: string | null;
    failedAt: string | null;
    failureReason: string | null;
}, {
    message: string;
    type: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
    title: string;
    data: Record<string, any> | null;
    id: string;
    createdAt: string;
    userId: string;
    channel: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
    isRead: boolean;
    readAt: string | null;
    sentAt: string | null;
    deliveredAt: string | null;
    failedAt: string | null;
    failureReason: string | null;
}>;
export declare const SendNotificationSchema: z.ZodObject<{
    userId: z.ZodString;
    type: z.ZodEnum<["EMAIL", "SMS", "PUSH", "IN_APP"]>;
    title: z.ZodString;
    message: z.ZodString;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    message: string;
    type: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
    title: string;
    userId: string;
    data?: Record<string, any> | undefined;
}, {
    message: string;
    type: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
    title: string;
    userId: string;
    data?: Record<string, any> | undefined;
}>;
export declare const SendBulkNotificationSchema: z.ZodObject<{
    userIds: z.ZodArray<z.ZodString, "many">;
    type: z.ZodEnum<["EMAIL", "SMS", "PUSH", "IN_APP"]>;
    title: z.ZodString;
    message: z.ZodString;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    message: string;
    type: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
    title: string;
    userIds: string[];
    data?: Record<string, any> | undefined;
}, {
    message: string;
    type: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
    title: string;
    userIds: string[];
    data?: Record<string, any> | undefined;
}>;
export declare const MarkAsReadSchema: z.ZodObject<{
    notificationIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    markAll: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    markAll: boolean;
    notificationIds?: string[] | undefined;
}, {
    notificationIds?: string[] | undefined;
    markAll?: boolean | undefined;
}>;
export type NotificationSchema = z.infer<typeof NotificationSchema>;
export type SendNotificationSchema = z.infer<typeof SendNotificationSchema>;
export type SendBulkNotificationSchema = z.infer<typeof SendBulkNotificationSchema>;
export type MarkAsReadSchema = z.infer<typeof MarkAsReadSchema>;
export declare const NotificationsListResponse: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        notifications: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            userId: z.ZodString;
            type: z.ZodEnum<["EMAIL", "SMS", "PUSH", "IN_APP"]>;
            channel: z.ZodEnum<["EMAIL", "SMS", "PUSH", "IN_APP"]>;
            title: z.ZodString;
            message: z.ZodString;
            data: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodAny>>;
            isRead: z.ZodBoolean;
            readAt: z.ZodNullable<z.ZodString>;
            sentAt: z.ZodNullable<z.ZodString>;
            deliveredAt: z.ZodNullable<z.ZodString>;
            failedAt: z.ZodNullable<z.ZodString>;
            failureReason: z.ZodNullable<z.ZodString>;
            createdAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            message: string;
            type: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
            title: string;
            data: Record<string, any> | null;
            id: string;
            createdAt: string;
            userId: string;
            channel: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
            isRead: boolean;
            readAt: string | null;
            sentAt: string | null;
            deliveredAt: string | null;
            failedAt: string | null;
            failureReason: string | null;
        }, {
            message: string;
            type: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
            title: string;
            data: Record<string, any> | null;
            id: string;
            createdAt: string;
            userId: string;
            channel: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
            isRead: boolean;
            readAt: string | null;
            sentAt: string | null;
            deliveredAt: string | null;
            failedAt: string | null;
            failureReason: string | null;
        }>, "many">;
        total: z.ZodNumber;
        unreadCount: z.ZodNumber;
        limit: z.ZodNumber;
        offset: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        offset: number;
        total: number;
        notifications: {
            message: string;
            type: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
            title: string;
            data: Record<string, any> | null;
            id: string;
            createdAt: string;
            userId: string;
            channel: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
            isRead: boolean;
            readAt: string | null;
            sentAt: string | null;
            deliveredAt: string | null;
            failedAt: string | null;
            failureReason: string | null;
        }[];
        unreadCount: number;
    }, {
        limit: number;
        offset: number;
        total: number;
        notifications: {
            message: string;
            type: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
            title: string;
            data: Record<string, any> | null;
            id: string;
            createdAt: string;
            userId: string;
            channel: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
            isRead: boolean;
            readAt: string | null;
            sentAt: string | null;
            deliveredAt: string | null;
            failedAt: string | null;
            failureReason: string | null;
        }[];
        unreadCount: number;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        limit: number;
        offset: number;
        total: number;
        notifications: {
            message: string;
            type: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
            title: string;
            data: Record<string, any> | null;
            id: string;
            createdAt: string;
            userId: string;
            channel: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
            isRead: boolean;
            readAt: string | null;
            sentAt: string | null;
            deliveredAt: string | null;
            failedAt: string | null;
            failureReason: string | null;
        }[];
        unreadCount: number;
    };
}, {
    success: boolean;
    data: {
        limit: number;
        offset: number;
        total: number;
        notifications: {
            message: string;
            type: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
            title: string;
            data: Record<string, any> | null;
            id: string;
            createdAt: string;
            userId: string;
            channel: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
            isRead: boolean;
            readAt: string | null;
            sentAt: string | null;
            deliveredAt: string | null;
            failedAt: string | null;
            failureReason: string | null;
        }[];
        unreadCount: number;
    };
}>;
export declare const NotificationDetailResponse: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        type: z.ZodEnum<["EMAIL", "SMS", "PUSH", "IN_APP"]>;
        channel: z.ZodEnum<["EMAIL", "SMS", "PUSH", "IN_APP"]>;
        title: z.ZodString;
        message: z.ZodString;
        data: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodAny>>;
        isRead: z.ZodBoolean;
        readAt: z.ZodNullable<z.ZodString>;
        sentAt: z.ZodNullable<z.ZodString>;
        deliveredAt: z.ZodNullable<z.ZodString>;
        failedAt: z.ZodNullable<z.ZodString>;
        failureReason: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        message: string;
        type: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
        title: string;
        data: Record<string, any> | null;
        id: string;
        createdAt: string;
        userId: string;
        channel: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
        isRead: boolean;
        readAt: string | null;
        sentAt: string | null;
        deliveredAt: string | null;
        failedAt: string | null;
        failureReason: string | null;
    }, {
        message: string;
        type: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
        title: string;
        data: Record<string, any> | null;
        id: string;
        createdAt: string;
        userId: string;
        channel: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
        isRead: boolean;
        readAt: string | null;
        sentAt: string | null;
        deliveredAt: string | null;
        failedAt: string | null;
        failureReason: string | null;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        message: string;
        type: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
        title: string;
        data: Record<string, any> | null;
        id: string;
        createdAt: string;
        userId: string;
        channel: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
        isRead: boolean;
        readAt: string | null;
        sentAt: string | null;
        deliveredAt: string | null;
        failedAt: string | null;
        failureReason: string | null;
    };
}, {
    success: boolean;
    data: {
        message: string;
        type: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
        title: string;
        data: Record<string, any> | null;
        id: string;
        createdAt: string;
        userId: string;
        channel: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
        isRead: boolean;
        readAt: string | null;
        sentAt: string | null;
        deliveredAt: string | null;
        failedAt: string | null;
        failureReason: string | null;
    };
}>;
export declare const SendNotificationResponse: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        type: z.ZodEnum<["EMAIL", "SMS", "PUSH", "IN_APP"]>;
        channel: z.ZodEnum<["EMAIL", "SMS", "PUSH", "IN_APP"]>;
        title: z.ZodString;
        message: z.ZodString;
        data: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodAny>>;
        isRead: z.ZodBoolean;
        readAt: z.ZodNullable<z.ZodString>;
        sentAt: z.ZodNullable<z.ZodString>;
        deliveredAt: z.ZodNullable<z.ZodString>;
        failedAt: z.ZodNullable<z.ZodString>;
        failureReason: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        message: string;
        type: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
        title: string;
        data: Record<string, any> | null;
        id: string;
        createdAt: string;
        userId: string;
        channel: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
        isRead: boolean;
        readAt: string | null;
        sentAt: string | null;
        deliveredAt: string | null;
        failedAt: string | null;
        failureReason: string | null;
    }, {
        message: string;
        type: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
        title: string;
        data: Record<string, any> | null;
        id: string;
        createdAt: string;
        userId: string;
        channel: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
        isRead: boolean;
        readAt: string | null;
        sentAt: string | null;
        deliveredAt: string | null;
        failedAt: string | null;
        failureReason: string | null;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        message: string;
        type: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
        title: string;
        data: Record<string, any> | null;
        id: string;
        createdAt: string;
        userId: string;
        channel: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
        isRead: boolean;
        readAt: string | null;
        sentAt: string | null;
        deliveredAt: string | null;
        failedAt: string | null;
        failureReason: string | null;
    };
}, {
    success: boolean;
    data: {
        message: string;
        type: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
        title: string;
        data: Record<string, any> | null;
        id: string;
        createdAt: string;
        userId: string;
        channel: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
        isRead: boolean;
        readAt: string | null;
        sentAt: string | null;
        deliveredAt: string | null;
        failedAt: string | null;
        failureReason: string | null;
    };
}>;
export declare const UnreadCountResponse: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        count: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        count: number;
    }, {
        count: number;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        count: number;
    };
}, {
    success: boolean;
    data: {
        count: number;
    };
}>;
