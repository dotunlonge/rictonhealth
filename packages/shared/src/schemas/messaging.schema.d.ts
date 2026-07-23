import { z } from 'zod';
export declare const CreateConversationSchema: z.ZodObject<{
    participantIds: z.ZodArray<z.ZodString, "many">;
    threadType: z.ZodDefault<z.ZodOptional<z.ZodEnum<["DIRECT", "GROUP", "APPOINTMENT", "MDT"]>>>;
    title: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    participantIds: string[];
    threadType: "MDT" | "APPOINTMENT" | "DIRECT" | "GROUP";
    title?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    participantIds: string[];
    title?: string | undefined;
    threadType?: "MDT" | "APPOINTMENT" | "DIRECT" | "GROUP" | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const SendMessageSchema: z.ZodObject<{
    body: z.ZodOptional<z.ZodString>;
    fileUrl: z.ZodOptional<z.ZodString>;
    fileName: z.ZodOptional<z.ZodString>;
    fileSize: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    body?: string | undefined;
    fileUrl?: string | undefined;
    fileName?: string | undefined;
    fileSize?: number | undefined;
}, {
    body?: string | undefined;
    fileUrl?: string | undefined;
    fileName?: string | undefined;
    fileSize?: number | undefined;
}>;
export declare const MarkMessagesAsReadSchema: z.ZodObject<{
    messageIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    markAll: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    markAll: boolean;
    messageIds?: string[] | undefined;
}, {
    markAll?: boolean | undefined;
    messageIds?: string[] | undefined;
}>;
export declare const ConversationResponseSchema: z.ZodObject<{
    id: z.ZodString;
    threadType: z.ZodEnum<["DIRECT", "GROUP", "APPOINTMENT", "MDT"]>;
    title: z.ZodNullable<z.ZodString>;
    participants: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        user: z.ZodObject<{
            id: z.ZodString;
            firstName: z.ZodString;
            lastName: z.ZodString;
            avatarUrl: z.ZodNullable<z.ZodString>;
            role: z.ZodEnum<["PATIENT", "CONSULTANT", "PHARMACIST", "HOSPITAL_ADMIN", "SUPER_ADMIN"]>;
        }, "strip", z.ZodTypeAny, {
            role: "PATIENT" | "CONSULTANT" | "PHARMACIST" | "HOSPITAL_ADMIN" | "SUPER_ADMIN";
            firstName: string;
            lastName: string;
            id: string;
            avatarUrl: string | null;
        }, {
            role: "PATIENT" | "CONSULTANT" | "PHARMACIST" | "HOSPITAL_ADMIN" | "SUPER_ADMIN";
            firstName: string;
            lastName: string;
            id: string;
            avatarUrl: string | null;
        }>;
        joinedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        user: {
            role: "PATIENT" | "CONSULTANT" | "PHARMACIST" | "HOSPITAL_ADMIN" | "SUPER_ADMIN";
            firstName: string;
            lastName: string;
            id: string;
            avatarUrl: string | null;
        };
        id: string;
        userId: string;
        joinedAt: string;
    }, {
        user: {
            role: "PATIENT" | "CONSULTANT" | "PHARMACIST" | "HOSPITAL_ADMIN" | "SUPER_ADMIN";
            firstName: string;
            lastName: string;
            id: string;
            avatarUrl: string | null;
        };
        id: string;
        userId: string;
        joinedAt: string;
    }>, "many">;
    lastMessage: z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        body: z.ZodNullable<z.ZodString>;
        senderId: z.ZodString;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        body: string | null;
        senderId: string;
    }, {
        id: string;
        createdAt: string;
        body: string | null;
        senderId: string;
    }>>;
    unreadCount: z.ZodNumber;
    updatedAt: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title: string | null;
    id: string;
    createdAt: string;
    updatedAt: string;
    unreadCount: number;
    threadType: "MDT" | "APPOINTMENT" | "DIRECT" | "GROUP";
    participants: {
        user: {
            role: "PATIENT" | "CONSULTANT" | "PHARMACIST" | "HOSPITAL_ADMIN" | "SUPER_ADMIN";
            firstName: string;
            lastName: string;
            id: string;
            avatarUrl: string | null;
        };
        id: string;
        userId: string;
        joinedAt: string;
    }[];
    lastMessage: {
        id: string;
        createdAt: string;
        body: string | null;
        senderId: string;
    } | null;
}, {
    title: string | null;
    id: string;
    createdAt: string;
    updatedAt: string;
    unreadCount: number;
    threadType: "MDT" | "APPOINTMENT" | "DIRECT" | "GROUP";
    participants: {
        user: {
            role: "PATIENT" | "CONSULTANT" | "PHARMACIST" | "HOSPITAL_ADMIN" | "SUPER_ADMIN";
            firstName: string;
            lastName: string;
            id: string;
            avatarUrl: string | null;
        };
        id: string;
        userId: string;
        joinedAt: string;
    }[];
    lastMessage: {
        id: string;
        createdAt: string;
        body: string | null;
        senderId: string;
    } | null;
}>;
export declare const MessageResponseSchema: z.ZodObject<{
    id: z.ZodString;
    threadId: z.ZodString;
    senderId: z.ZodString;
    sender: z.ZodObject<{
        id: z.ZodString;
        firstName: z.ZodString;
        lastName: z.ZodString;
        avatarUrl: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        firstName: string;
        lastName: string;
        id: string;
        avatarUrl: string | null;
    }, {
        firstName: string;
        lastName: string;
        id: string;
        avatarUrl: string | null;
    }>;
    body: z.ZodNullable<z.ZodString>;
    fileUrl: z.ZodNullable<z.ZodString>;
    fileName: z.ZodNullable<z.ZodString>;
    fileSize: z.ZodNullable<z.ZodNumber>;
    isRead: z.ZodBoolean;
    readAt: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    isRead: boolean;
    readAt: string | null;
    body: string | null;
    fileUrl: string | null;
    fileName: string | null;
    fileSize: number | null;
    senderId: string;
    threadId: string;
    sender: {
        firstName: string;
        lastName: string;
        id: string;
        avatarUrl: string | null;
    };
}, {
    id: string;
    createdAt: string;
    isRead: boolean;
    readAt: string | null;
    body: string | null;
    fileUrl: string | null;
    fileName: string | null;
    fileSize: number | null;
    senderId: string;
    threadId: string;
    sender: {
        firstName: string;
        lastName: string;
        id: string;
        avatarUrl: string | null;
    };
}>;
export declare const ConversationsListResponseSchema: z.ZodObject<{
    conversations: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        threadType: z.ZodEnum<["DIRECT", "GROUP", "APPOINTMENT", "MDT"]>;
        title: z.ZodNullable<z.ZodString>;
        participants: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            userId: z.ZodString;
            user: z.ZodObject<{
                id: z.ZodString;
                firstName: z.ZodString;
                lastName: z.ZodString;
                avatarUrl: z.ZodNullable<z.ZodString>;
                role: z.ZodEnum<["PATIENT", "CONSULTANT", "PHARMACIST", "HOSPITAL_ADMIN", "SUPER_ADMIN"]>;
            }, "strip", z.ZodTypeAny, {
                role: "PATIENT" | "CONSULTANT" | "PHARMACIST" | "HOSPITAL_ADMIN" | "SUPER_ADMIN";
                firstName: string;
                lastName: string;
                id: string;
                avatarUrl: string | null;
            }, {
                role: "PATIENT" | "CONSULTANT" | "PHARMACIST" | "HOSPITAL_ADMIN" | "SUPER_ADMIN";
                firstName: string;
                lastName: string;
                id: string;
                avatarUrl: string | null;
            }>;
            joinedAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            user: {
                role: "PATIENT" | "CONSULTANT" | "PHARMACIST" | "HOSPITAL_ADMIN" | "SUPER_ADMIN";
                firstName: string;
                lastName: string;
                id: string;
                avatarUrl: string | null;
            };
            id: string;
            userId: string;
            joinedAt: string;
        }, {
            user: {
                role: "PATIENT" | "CONSULTANT" | "PHARMACIST" | "HOSPITAL_ADMIN" | "SUPER_ADMIN";
                firstName: string;
                lastName: string;
                id: string;
                avatarUrl: string | null;
            };
            id: string;
            userId: string;
            joinedAt: string;
        }>, "many">;
        lastMessage: z.ZodNullable<z.ZodObject<{
            id: z.ZodString;
            body: z.ZodNullable<z.ZodString>;
            senderId: z.ZodString;
            createdAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            createdAt: string;
            body: string | null;
            senderId: string;
        }, {
            id: string;
            createdAt: string;
            body: string | null;
            senderId: string;
        }>>;
        unreadCount: z.ZodNumber;
        updatedAt: z.ZodString;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        title: string | null;
        id: string;
        createdAt: string;
        updatedAt: string;
        unreadCount: number;
        threadType: "MDT" | "APPOINTMENT" | "DIRECT" | "GROUP";
        participants: {
            user: {
                role: "PATIENT" | "CONSULTANT" | "PHARMACIST" | "HOSPITAL_ADMIN" | "SUPER_ADMIN";
                firstName: string;
                lastName: string;
                id: string;
                avatarUrl: string | null;
            };
            id: string;
            userId: string;
            joinedAt: string;
        }[];
        lastMessage: {
            id: string;
            createdAt: string;
            body: string | null;
            senderId: string;
        } | null;
    }, {
        title: string | null;
        id: string;
        createdAt: string;
        updatedAt: string;
        unreadCount: number;
        threadType: "MDT" | "APPOINTMENT" | "DIRECT" | "GROUP";
        participants: {
            user: {
                role: "PATIENT" | "CONSULTANT" | "PHARMACIST" | "HOSPITAL_ADMIN" | "SUPER_ADMIN";
                firstName: string;
                lastName: string;
                id: string;
                avatarUrl: string | null;
            };
            id: string;
            userId: string;
            joinedAt: string;
        }[];
        lastMessage: {
            id: string;
            createdAt: string;
            body: string | null;
            senderId: string;
        } | null;
    }>, "many">;
    meta: z.ZodObject<{
        total: z.ZodNumber;
        page: z.ZodNumber;
        limit: z.ZodNumber;
        totalPages: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        total: number;
        page: number;
        totalPages: number;
    }, {
        limit: number;
        total: number;
        page: number;
        totalPages: number;
    }>;
}, "strip", z.ZodTypeAny, {
    meta: {
        limit: number;
        total: number;
        page: number;
        totalPages: number;
    };
    conversations: {
        title: string | null;
        id: string;
        createdAt: string;
        updatedAt: string;
        unreadCount: number;
        threadType: "MDT" | "APPOINTMENT" | "DIRECT" | "GROUP";
        participants: {
            user: {
                role: "PATIENT" | "CONSULTANT" | "PHARMACIST" | "HOSPITAL_ADMIN" | "SUPER_ADMIN";
                firstName: string;
                lastName: string;
                id: string;
                avatarUrl: string | null;
            };
            id: string;
            userId: string;
            joinedAt: string;
        }[];
        lastMessage: {
            id: string;
            createdAt: string;
            body: string | null;
            senderId: string;
        } | null;
    }[];
}, {
    meta: {
        limit: number;
        total: number;
        page: number;
        totalPages: number;
    };
    conversations: {
        title: string | null;
        id: string;
        createdAt: string;
        updatedAt: string;
        unreadCount: number;
        threadType: "MDT" | "APPOINTMENT" | "DIRECT" | "GROUP";
        participants: {
            user: {
                role: "PATIENT" | "CONSULTANT" | "PHARMACIST" | "HOSPITAL_ADMIN" | "SUPER_ADMIN";
                firstName: string;
                lastName: string;
                id: string;
                avatarUrl: string | null;
            };
            id: string;
            userId: string;
            joinedAt: string;
        }[];
        lastMessage: {
            id: string;
            createdAt: string;
            body: string | null;
            senderId: string;
        } | null;
    }[];
}>;
export declare const MessagesListResponseSchema: z.ZodObject<{
    messages: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        threadId: z.ZodString;
        senderId: z.ZodString;
        sender: z.ZodObject<{
            id: z.ZodString;
            firstName: z.ZodString;
            lastName: z.ZodString;
            avatarUrl: z.ZodNullable<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            firstName: string;
            lastName: string;
            id: string;
            avatarUrl: string | null;
        }, {
            firstName: string;
            lastName: string;
            id: string;
            avatarUrl: string | null;
        }>;
        body: z.ZodNullable<z.ZodString>;
        fileUrl: z.ZodNullable<z.ZodString>;
        fileName: z.ZodNullable<z.ZodString>;
        fileSize: z.ZodNullable<z.ZodNumber>;
        isRead: z.ZodBoolean;
        readAt: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        isRead: boolean;
        readAt: string | null;
        body: string | null;
        fileUrl: string | null;
        fileName: string | null;
        fileSize: number | null;
        senderId: string;
        threadId: string;
        sender: {
            firstName: string;
            lastName: string;
            id: string;
            avatarUrl: string | null;
        };
    }, {
        id: string;
        createdAt: string;
        isRead: boolean;
        readAt: string | null;
        body: string | null;
        fileUrl: string | null;
        fileName: string | null;
        fileSize: number | null;
        senderId: string;
        threadId: string;
        sender: {
            firstName: string;
            lastName: string;
            id: string;
            avatarUrl: string | null;
        };
    }>, "many">;
    meta: z.ZodObject<{
        total: z.ZodNumber;
        page: z.ZodNumber;
        limit: z.ZodNumber;
        totalPages: z.ZodNumber;
        hasMore: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        total: number;
        hasMore: boolean;
        page: number;
        totalPages: number;
    }, {
        limit: number;
        total: number;
        hasMore: boolean;
        page: number;
        totalPages: number;
    }>;
}, "strip", z.ZodTypeAny, {
    meta: {
        limit: number;
        total: number;
        hasMore: boolean;
        page: number;
        totalPages: number;
    };
    messages: {
        id: string;
        createdAt: string;
        isRead: boolean;
        readAt: string | null;
        body: string | null;
        fileUrl: string | null;
        fileName: string | null;
        fileSize: number | null;
        senderId: string;
        threadId: string;
        sender: {
            firstName: string;
            lastName: string;
            id: string;
            avatarUrl: string | null;
        };
    }[];
}, {
    meta: {
        limit: number;
        total: number;
        hasMore: boolean;
        page: number;
        totalPages: number;
    };
    messages: {
        id: string;
        createdAt: string;
        isRead: boolean;
        readAt: string | null;
        body: string | null;
        fileUrl: string | null;
        fileName: string | null;
        fileSize: number | null;
        senderId: string;
        threadId: string;
        sender: {
            firstName: string;
            lastName: string;
            id: string;
            avatarUrl: string | null;
        };
    }[];
}>;
export type CreateConversationSchema = z.infer<typeof CreateConversationSchema>;
export type SendMessageSchema = z.infer<typeof SendMessageSchema>;
export type MarkMessagesAsReadSchema = z.infer<typeof MarkMessagesAsReadSchema>;
export type ConversationResponseSchema = z.infer<typeof ConversationResponseSchema>;
export type MessageResponseSchema = z.infer<typeof MessageResponseSchema>;
export type ConversationsListResponseSchema = z.infer<typeof ConversationsListResponseSchema>;
export type MessagesListResponseSchema = z.infer<typeof MessagesListResponseSchema>;
