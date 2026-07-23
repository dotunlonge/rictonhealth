"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAnalyticsResponseSchema = exports.AdminAuditLogResponseSchema = exports.AdminHospitalResponseSchema = exports.AdminProviderPendingListResponseSchema = exports.AdminUserListResponseSchema = exports.AdminAnalyticsQuerySchema = exports.AdminAuditLogQuerySchema = exports.AdminHospitalUpdateSchema = exports.AdminHospitalCreateSchema = exports.AdminVerifyProviderSchema = exports.AdminUpdateUserStatusSchema = exports.AdminUserResponseSchema = exports.AdminUserListQuerySchema = void 0;
const zod_1 = require("zod");
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
(0, zod_to_openapi_1.extendZodWithOpenApi)(zod_1.z);
exports.AdminUserListQuerySchema = zod_1.z.object({
    page: zod_1.z.string().optional().default('1'),
    limit: zod_1.z.string().optional().default('20'),
    role: zod_1.z.enum(['PATIENT', 'CONSULTANT', 'PHARMACIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']).optional(),
    status: zod_1.z.enum(['ACTIVE', 'SUSPENDED', 'PENDING', 'DEACTIVATED']).optional(),
    search: zod_1.z.string().optional(),
});
exports.AdminUserResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    email: zod_1.z.string().email().nullable(),
    phone: zod_1.z.string().nullable(),
    firstName: zod_1.z.string(),
    lastName: zod_1.z.string(),
    role: zod_1.z.enum(['PATIENT', 'CONSULTANT', 'PHARMACIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']),
    status: zod_1.z.enum(['ACTIVE', 'SUSPENDED', 'PENDING', 'DEACTIVATED']),
    isVerified: zod_1.z.boolean(),
    createdAt: zod_1.z.string().datetime(),
    lastLoginAt: zod_1.z.string().datetime().nullable(),
});
exports.AdminUpdateUserStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED']),
    reason: zod_1.z.string().optional(),
});
exports.AdminVerifyProviderSchema = zod_1.z.object({
    verified: zod_1.z.boolean(),
    notes: zod_1.z.string().optional(),
});
exports.AdminHospitalCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    address: zod_1.z.string().min(1),
    city: zod_1.z.string().min(1),
    state: zod_1.z.string().min(1),
    country: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().min(10),
    website: zod_1.z.string().url().optional(),
});
// Update schema - all fields optional as updates are partial
exports.AdminHospitalUpdateSchema = exports.AdminHospitalCreateSchema.partial();
exports.AdminAuditLogQuerySchema = zod_1.z.object({
    page: zod_1.z.string().optional().default('1'),
    limit: zod_1.z.string().optional().default('50'),
    userId: zod_1.z.string().optional(),
    action: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
});
exports.AdminAnalyticsQuerySchema = zod_1.z.object({
    period: zod_1.z.enum(['day', 'week', 'month', 'year']).default('month'),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
});
// Registry for OpenAPI
const openapi_registry_1 = require("./openapi.registry");
exports.AdminUserListResponseSchema = openapi_registry_1.registry.register('AdminUserListResponse', zod_1.z.object({
    users: zod_1.z.array(exports.AdminUserResponseSchema),
    meta: zod_1.z.object({
        total: zod_1.z.number(),
        page: zod_1.z.number(),
        limit: zod_1.z.number(),
        totalPages: zod_1.z.number(),
    }),
}));
exports.AdminProviderPendingListResponseSchema = openapi_registry_1.registry.register('AdminProviderPendingListResponse', zod_1.z.object({
    providers: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        userId: zod_1.z.string(),
        firstName: zod_1.z.string(),
        lastName: zod_1.z.string(),
        specialty: zod_1.z.string(),
        licenseNumber: zod_1.z.string(),
        submittedAt: zod_1.z.string().datetime(),
        documents: zod_1.z.array(zod_1.z.object({
            type: zod_1.z.string(),
            url: zod_1.z.string(),
            status: zod_1.z.enum(['PENDING', 'APPROVED', 'REJECTED']),
        })),
    })),
    meta: zod_1.z.object({
        total: zod_1.z.number(),
        page: zod_1.z.number(),
        limit: zod_1.z.number(),
    }),
}));
exports.AdminHospitalResponseSchema = openapi_registry_1.registry.register('AdminHospitalResponse', zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    address: zod_1.z.string(),
    city: zod_1.z.string(),
    state: zod_1.z.string(),
    country: zod_1.z.string(),
    email: zod_1.z.string(),
    phone: zod_1.z.string(),
    website: zod_1.z.string().nullable(),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE']),
    createdAt: zod_1.z.string().datetime(),
}));
exports.AdminAuditLogResponseSchema = openapi_registry_1.registry.register('AdminAuditLogResponse', zod_1.z.object({
    logs: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        userId: zod_1.z.string(),
        action: zod_1.z.string(),
        resource: zod_1.z.string(),
        resourceId: zod_1.z.string().nullable(),
        details: zod_1.z.record(zod_1.z.unknown()),
        ipAddress: zod_1.z.string(),
        userAgent: zod_1.z.string(),
        createdAt: zod_1.z.string().datetime(),
    })),
    meta: zod_1.z.object({
        total: zod_1.z.number(),
        page: zod_1.z.number(),
        limit: zod_1.z.number(),
    }),
}));
exports.AdminAnalyticsResponseSchema = openapi_registry_1.registry.register('AdminAnalyticsResponse', zod_1.z.object({
    overview: zod_1.z.object({
        totalUsers: zod_1.z.number(),
        totalProviders: zod_1.z.number(),
        totalHospitals: zod_1.z.number(),
        totalAppointments: zod_1.z.number(),
        totalRevenue: zod_1.z.number(),
        activeSubscriptions: zod_1.z.number(),
    }),
    growth: zod_1.z.object({
        userGrowth: zod_1.z.array(zod_1.z.object({ date: zod_1.z.string(), count: zod_1.z.number() })),
        appointmentGrowth: zod_1.z.array(zod_1.z.object({ date: zod_1.z.string(), count: zod_1.z.number() })),
        revenueGrowth: zod_1.z.array(zod_1.z.object({ date: zod_1.z.string(), amount: zod_1.z.number() })),
    }),
    topProviders: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        appointmentsCount: zod_1.z.number(),
        revenue: zod_1.z.number(),
        rating: zod_1.z.number().nullable(),
    })),
}));
//# sourceMappingURL=admin.schema.js.map