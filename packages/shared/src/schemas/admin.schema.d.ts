import { z } from 'zod';
export declare const AdminUserListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    role: z.ZodOptional<z.ZodEnum<["PATIENT", "CONSULTANT", "PHARMACIST", "HOSPITAL_ADMIN", "SUPER_ADMIN"]>>;
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "SUSPENDED", "PENDING", "DEACTIVATED"]>>;
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: string;
    page: string;
    search?: string | undefined;
    role?: "PATIENT" | "CONSULTANT" | "PHARMACIST" | "HOSPITAL_ADMIN" | "SUPER_ADMIN" | undefined;
    status?: "PENDING" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED" | undefined;
}, {
    search?: string | undefined;
    role?: "PATIENT" | "CONSULTANT" | "PHARMACIST" | "HOSPITAL_ADMIN" | "SUPER_ADMIN" | undefined;
    status?: "PENDING" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED" | undefined;
    limit?: string | undefined;
    page?: string | undefined;
}>;
export declare const AdminUserResponseSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodNullable<z.ZodString>;
    phone: z.ZodNullable<z.ZodString>;
    firstName: z.ZodString;
    lastName: z.ZodString;
    role: z.ZodEnum<["PATIENT", "CONSULTANT", "PHARMACIST", "HOSPITAL_ADMIN", "SUPER_ADMIN"]>;
    status: z.ZodEnum<["ACTIVE", "SUSPENDED", "PENDING", "DEACTIVATED"]>;
    isVerified: z.ZodBoolean;
    createdAt: z.ZodString;
    lastLoginAt: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string | null;
    phone: string | null;
    role: "PATIENT" | "CONSULTANT" | "PHARMACIST" | "HOSPITAL_ADMIN" | "SUPER_ADMIN";
    status: "PENDING" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
    firstName: string;
    lastName: string;
    id: string;
    isVerified: boolean;
    createdAt: string;
    lastLoginAt: string | null;
}, {
    email: string | null;
    phone: string | null;
    role: "PATIENT" | "CONSULTANT" | "PHARMACIST" | "HOSPITAL_ADMIN" | "SUPER_ADMIN";
    status: "PENDING" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
    firstName: string;
    lastName: string;
    id: string;
    isVerified: boolean;
    createdAt: string;
    lastLoginAt: string | null;
}>;
export declare const AdminUpdateUserStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["ACTIVE", "SUSPENDED", "DEACTIVATED"]>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
    reason?: string | undefined;
}, {
    status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
    reason?: string | undefined;
}>;
export declare const AdminVerifyProviderSchema: z.ZodObject<{
    verified: z.ZodBoolean;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    verified: boolean;
    notes?: string | undefined;
}, {
    verified: boolean;
    notes?: string | undefined;
}>;
export declare const AdminHospitalCreateSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    address: z.ZodString;
    city: z.ZodString;
    state: z.ZodString;
    country: z.ZodString;
    email: z.ZodString;
    phone: z.ZodString;
    website: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    address: string;
    email: string;
    name: string;
    phone: string;
    city: string;
    state: string;
    country: string;
    description?: string | undefined;
    website?: string | undefined;
}, {
    address: string;
    email: string;
    name: string;
    phone: string;
    city: string;
    state: string;
    country: string;
    description?: string | undefined;
    website?: string | undefined;
}>;
export declare const AdminHospitalUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    address: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    website: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    address?: string | undefined;
    email?: string | undefined;
    description?: string | undefined;
    name?: string | undefined;
    phone?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    country?: string | undefined;
    website?: string | undefined;
}, {
    address?: string | undefined;
    email?: string | undefined;
    description?: string | undefined;
    name?: string | undefined;
    phone?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    country?: string | undefined;
    website?: string | undefined;
}>;
export declare const AdminAuditLogQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    userId: z.ZodOptional<z.ZodString>;
    action: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: string;
    page: string;
    userId?: string | undefined;
    action?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    limit?: string | undefined;
    userId?: string | undefined;
    page?: string | undefined;
    action?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export declare const AdminAnalyticsQuerySchema: z.ZodObject<{
    period: z.ZodDefault<z.ZodEnum<["day", "week", "month", "year"]>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    period: "day" | "week" | "month" | "year";
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    period?: "day" | "week" | "month" | "year" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export declare const AdminUserListResponseSchema: z.ZodObject<{
    users: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        email: z.ZodNullable<z.ZodString>;
        phone: z.ZodNullable<z.ZodString>;
        firstName: z.ZodString;
        lastName: z.ZodString;
        role: z.ZodEnum<["PATIENT", "CONSULTANT", "PHARMACIST", "HOSPITAL_ADMIN", "SUPER_ADMIN"]>;
        status: z.ZodEnum<["ACTIVE", "SUSPENDED", "PENDING", "DEACTIVATED"]>;
        isVerified: z.ZodBoolean;
        createdAt: z.ZodString;
        lastLoginAt: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        email: string | null;
        phone: string | null;
        role: "PATIENT" | "CONSULTANT" | "PHARMACIST" | "HOSPITAL_ADMIN" | "SUPER_ADMIN";
        status: "PENDING" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
        firstName: string;
        lastName: string;
        id: string;
        isVerified: boolean;
        createdAt: string;
        lastLoginAt: string | null;
    }, {
        email: string | null;
        phone: string | null;
        role: "PATIENT" | "CONSULTANT" | "PHARMACIST" | "HOSPITAL_ADMIN" | "SUPER_ADMIN";
        status: "PENDING" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
        firstName: string;
        lastName: string;
        id: string;
        isVerified: boolean;
        createdAt: string;
        lastLoginAt: string | null;
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
    users: {
        email: string | null;
        phone: string | null;
        role: "PATIENT" | "CONSULTANT" | "PHARMACIST" | "HOSPITAL_ADMIN" | "SUPER_ADMIN";
        status: "PENDING" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
        firstName: string;
        lastName: string;
        id: string;
        isVerified: boolean;
        createdAt: string;
        lastLoginAt: string | null;
    }[];
}, {
    meta: {
        limit: number;
        total: number;
        page: number;
        totalPages: number;
    };
    users: {
        email: string | null;
        phone: string | null;
        role: "PATIENT" | "CONSULTANT" | "PHARMACIST" | "HOSPITAL_ADMIN" | "SUPER_ADMIN";
        status: "PENDING" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
        firstName: string;
        lastName: string;
        id: string;
        isVerified: boolean;
        createdAt: string;
        lastLoginAt: string | null;
    }[];
}>;
export declare const AdminProviderPendingListResponseSchema: z.ZodObject<{
    providers: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        firstName: z.ZodString;
        lastName: z.ZodString;
        specialty: z.ZodString;
        licenseNumber: z.ZodString;
        submittedAt: z.ZodString;
        documents: z.ZodArray<z.ZodObject<{
            type: z.ZodString;
            url: z.ZodString;
            status: z.ZodEnum<["PENDING", "APPROVED", "REJECTED"]>;
        }, "strip", z.ZodTypeAny, {
            type: string;
            url: string;
            status: "PENDING" | "APPROVED" | "REJECTED";
        }, {
            type: string;
            url: string;
            status: "PENDING" | "APPROVED" | "REJECTED";
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        firstName: string;
        lastName: string;
        id: string;
        specialty: string;
        licenseNumber: string;
        userId: string;
        submittedAt: string;
        documents: {
            type: string;
            url: string;
            status: "PENDING" | "APPROVED" | "REJECTED";
        }[];
    }, {
        firstName: string;
        lastName: string;
        id: string;
        specialty: string;
        licenseNumber: string;
        userId: string;
        submittedAt: string;
        documents: {
            type: string;
            url: string;
            status: "PENDING" | "APPROVED" | "REJECTED";
        }[];
    }>, "many">;
    meta: z.ZodObject<{
        total: z.ZodNumber;
        page: z.ZodNumber;
        limit: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        total: number;
        page: number;
    }, {
        limit: number;
        total: number;
        page: number;
    }>;
}, "strip", z.ZodTypeAny, {
    meta: {
        limit: number;
        total: number;
        page: number;
    };
    providers: {
        firstName: string;
        lastName: string;
        id: string;
        specialty: string;
        licenseNumber: string;
        userId: string;
        submittedAt: string;
        documents: {
            type: string;
            url: string;
            status: "PENDING" | "APPROVED" | "REJECTED";
        }[];
    }[];
}, {
    meta: {
        limit: number;
        total: number;
        page: number;
    };
    providers: {
        firstName: string;
        lastName: string;
        id: string;
        specialty: string;
        licenseNumber: string;
        userId: string;
        submittedAt: string;
        documents: {
            type: string;
            url: string;
            status: "PENDING" | "APPROVED" | "REJECTED";
        }[];
    }[];
}>;
export declare const AdminHospitalResponseSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    address: z.ZodString;
    city: z.ZodString;
    state: z.ZodString;
    country: z.ZodString;
    email: z.ZodString;
    phone: z.ZodString;
    website: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["ACTIVE", "INACTIVE"]>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    address: string;
    email: string;
    description: string | null;
    name: string;
    phone: string;
    status: "ACTIVE" | "INACTIVE";
    id: string;
    createdAt: string;
    city: string;
    state: string;
    country: string;
    website: string | null;
}, {
    address: string;
    email: string;
    description: string | null;
    name: string;
    phone: string;
    status: "ACTIVE" | "INACTIVE";
    id: string;
    createdAt: string;
    city: string;
    state: string;
    country: string;
    website: string | null;
}>;
export declare const AdminAuditLogResponseSchema: z.ZodObject<{
    logs: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        action: z.ZodString;
        resource: z.ZodString;
        resourceId: z.ZodNullable<z.ZodString>;
        details: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        ipAddress: z.ZodString;
        userAgent: z.ZodString;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        details: Record<string, unknown>;
        id: string;
        createdAt: string;
        userId: string;
        action: string;
        resource: string;
        resourceId: string | null;
        ipAddress: string;
        userAgent: string;
    }, {
        details: Record<string, unknown>;
        id: string;
        createdAt: string;
        userId: string;
        action: string;
        resource: string;
        resourceId: string | null;
        ipAddress: string;
        userAgent: string;
    }>, "many">;
    meta: z.ZodObject<{
        total: z.ZodNumber;
        page: z.ZodNumber;
        limit: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        total: number;
        page: number;
    }, {
        limit: number;
        total: number;
        page: number;
    }>;
}, "strip", z.ZodTypeAny, {
    meta: {
        limit: number;
        total: number;
        page: number;
    };
    logs: {
        details: Record<string, unknown>;
        id: string;
        createdAt: string;
        userId: string;
        action: string;
        resource: string;
        resourceId: string | null;
        ipAddress: string;
        userAgent: string;
    }[];
}, {
    meta: {
        limit: number;
        total: number;
        page: number;
    };
    logs: {
        details: Record<string, unknown>;
        id: string;
        createdAt: string;
        userId: string;
        action: string;
        resource: string;
        resourceId: string | null;
        ipAddress: string;
        userAgent: string;
    }[];
}>;
export declare const AdminAnalyticsResponseSchema: z.ZodObject<{
    overview: z.ZodObject<{
        totalUsers: z.ZodNumber;
        totalProviders: z.ZodNumber;
        totalHospitals: z.ZodNumber;
        totalAppointments: z.ZodNumber;
        totalRevenue: z.ZodNumber;
        activeSubscriptions: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        totalAppointments: number;
        totalUsers: number;
        totalProviders: number;
        totalHospitals: number;
        totalRevenue: number;
        activeSubscriptions: number;
    }, {
        totalAppointments: number;
        totalUsers: number;
        totalProviders: number;
        totalHospitals: number;
        totalRevenue: number;
        activeSubscriptions: number;
    }>;
    growth: z.ZodObject<{
        userGrowth: z.ZodArray<z.ZodObject<{
            date: z.ZodString;
            count: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            date: string;
            count: number;
        }, {
            date: string;
            count: number;
        }>, "many">;
        appointmentGrowth: z.ZodArray<z.ZodObject<{
            date: z.ZodString;
            count: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            date: string;
            count: number;
        }, {
            date: string;
            count: number;
        }>, "many">;
        revenueGrowth: z.ZodArray<z.ZodObject<{
            date: z.ZodString;
            amount: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            date: string;
            amount: number;
        }, {
            date: string;
            amount: number;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        userGrowth: {
            date: string;
            count: number;
        }[];
        appointmentGrowth: {
            date: string;
            count: number;
        }[];
        revenueGrowth: {
            date: string;
            amount: number;
        }[];
    }, {
        userGrowth: {
            date: string;
            count: number;
        }[];
        appointmentGrowth: {
            date: string;
            count: number;
        }[];
        revenueGrowth: {
            date: string;
            amount: number;
        }[];
    }>;
    topProviders: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        appointmentsCount: z.ZodNumber;
        revenue: z.ZodNumber;
        rating: z.ZodNullable<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        rating: number | null;
        appointmentsCount: number;
        revenue: number;
    }, {
        name: string;
        id: string;
        rating: number | null;
        appointmentsCount: number;
        revenue: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    overview: {
        totalAppointments: number;
        totalUsers: number;
        totalProviders: number;
        totalHospitals: number;
        totalRevenue: number;
        activeSubscriptions: number;
    };
    growth: {
        userGrowth: {
            date: string;
            count: number;
        }[];
        appointmentGrowth: {
            date: string;
            count: number;
        }[];
        revenueGrowth: {
            date: string;
            amount: number;
        }[];
    };
    topProviders: {
        name: string;
        id: string;
        rating: number | null;
        appointmentsCount: number;
        revenue: number;
    }[];
}, {
    overview: {
        totalAppointments: number;
        totalUsers: number;
        totalProviders: number;
        totalHospitals: number;
        totalRevenue: number;
        activeSubscriptions: number;
    };
    growth: {
        userGrowth: {
            date: string;
            count: number;
        }[];
        appointmentGrowth: {
            date: string;
            count: number;
        }[];
        revenueGrowth: {
            date: string;
            amount: number;
        }[];
    };
    topProviders: {
        name: string;
        id: string;
        rating: number | null;
        appointmentsCount: number;
        revenue: number;
    }[];
}>;
export type AdminUserListQuerySchema = z.infer<typeof AdminUserListQuerySchema>;
export type AdminUserResponseSchema = z.infer<typeof AdminUserResponseSchema>;
export type AdminUpdateUserStatusSchema = z.infer<typeof AdminUpdateUserStatusSchema>;
export type AdminVerifyProviderSchema = z.infer<typeof AdminVerifyProviderSchema>;
export type AdminHospitalCreateSchema = z.infer<typeof AdminHospitalCreateSchema>;
export type AdminHospitalUpdateSchema = z.infer<typeof AdminHospitalUpdateSchema>;
export type AdminAuditLogQuerySchema = z.infer<typeof AdminAuditLogQuerySchema>;
export type AdminAnalyticsQuerySchema = z.infer<typeof AdminAnalyticsQuerySchema>;
export type AdminUserListResponseSchema = z.infer<typeof AdminUserListResponseSchema>;
export type AdminProviderPendingListResponseSchema = z.infer<typeof AdminProviderPendingListResponseSchema>;
export type AdminHospitalResponseSchema = z.infer<typeof AdminHospitalResponseSchema>;
export type AdminAuditLogResponseSchema = z.infer<typeof AdminAuditLogResponseSchema>;
export type AdminAnalyticsResponseSchema = z.infer<typeof AdminAnalyticsResponseSchema>;
