"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderDashboardResponseSchema = exports.HospitalDashboardResponseSchema = exports.GetProvidersQuerySchema = exports.MedicalHistoryInputSchema = exports.AvatarUploadInputSchema = exports.UpdateProfileInputSchema = exports.GetUserResponseSchema = exports.UserProfileSchema = void 0;
const zod_1 = require("./zod");
const openapi_registry_1 = require("./openapi.registry");
exports.UserProfileSchema = openapi_registry_1.registry.register('UserProfile', zod_1.z.object({
    id: zod_1.z.string().uuid(),
    email: zod_1.z.string().nullable(),
    phone: zod_1.z.string().nullable(),
    role: zod_1.z.string(),
    status: zod_1.z.string(),
    patientProfile: zod_1.z
        .object({
        firstName: zod_1.z.string().nullable(),
        lastName: zod_1.z.string().nullable(),
        dateOfBirth: zod_1.z.string().nullable(),
        gender: zod_1.z.string().nullable(),
        bloodType: zod_1.z.string().nullable(),
        allergies: zod_1.z.array(zod_1.z.string()).nullable().optional(),
        medicalHistory: zod_1.z
            .array(zod_1.z.object({
            condition: zod_1.z.string().min(1, 'Condition must be a non-empty string'),
            diagnosedAt: zod_1.z
                .string()
                .regex(/^\d{4}-\d{2}-\d{2}$/, 'Diagnosed date must be in YYYY-MM-DD format')
                .optional(),
            notes: zod_1.z.string().optional(),
        }))
            .nullable()
            .optional(),
        emergencyContact: zod_1.z
            .object({
            name: zod_1.z.string(),
            relationship: zod_1.z.string(),
            phone: zod_1.z.string(),
        })
            .nullable()
            .optional(),
    })
        .nullable()
        .optional(),
    providerProfile: zod_1.z
        .object({
        firstName: zod_1.z.string().nullable(),
        lastName: zod_1.z.string().nullable(),
        specialty: zod_1.z.string().nullable(),
        consultationFee: zod_1.z.number().nullable(),
    })
        .nullable()
        .optional(),
    pharmacyProfile: zod_1.z
        .object({
        pharmacyName: zod_1.z.string(),
        licenseNumber: zod_1.z.string().nullable().optional(),
        isVerified: zod_1.z.boolean().optional(),
    })
        .nullable()
        .optional(),
}));
exports.GetUserResponseSchema = openapi_registry_1.registry.register('GetUserResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: exports.UserProfileSchema,
}));
exports.UpdateProfileInputSchema = openapi_registry_1.registry.register('UpdateProfileInput', zod_1.z.object({
    firstName: zod_1.z.string().optional(),
    lastName: zod_1.z.string().optional(),
    dateOfBirth: zod_1.z.string().optional(),
    gender: zod_1.z.string().optional(),
    bloodType: zod_1.z.string().optional(),
    allergies: zod_1.z.array(zod_1.z.string()).optional(),
    specialty: zod_1.z.string().optional(),
    consultationFee: zod_1.z.number().optional(),
    title: zod_1.z.string().optional(),
    pharmacyName: zod_1.z.string().optional(),
}));
exports.AvatarUploadInputSchema = openapi_registry_1.registry.register('AvatarUploadInput', zod_1.z.object({
    fileType: zod_1.z.string().min(1),
}));
exports.MedicalHistoryInputSchema = openapi_registry_1.registry.register('MedicalHistoryInput', zod_1.z.object({
    medicalHistory: zod_1.z.array(zod_1.z.object({
        condition: zod_1.z.string().min(1, 'Condition must be a non-empty string'),
        diagnosedAt: zod_1.z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Diagnosed date must be in YYYY-MM-DD format')
            .optional(),
        notes: zod_1.z.string().optional(),
    })),
}));
exports.GetProvidersQuerySchema = openapi_registry_1.registry.register('GetProvidersQuery', zod_1.z.object({
    specialty: zod_1.z.string().optional(),
    name: zod_1.z.string().optional(),
    limit: zod_1.z.string().optional(),
    offset: zod_1.z.string().optional(),
}));
openapi_registry_1.registry.registerPath({
    method: 'get',
    path: '/api/users/me',
    summary: 'Get current user profile',
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'User profile retrieved successfully',
            content: {
                'application/json': {
                    schema: exports.GetUserResponseSchema,
                },
            },
        },
        401: {
            description: 'Unauthorized',
        },
    },
});
exports.HospitalDashboardResponseSchema = openapi_registry_1.registry.register('HospitalDashboardResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.object({
        hospital: zod_1.z.object({
            id: zod_1.z.string().uuid(),
            name: zod_1.z.string(),
            phone: zod_1.z.string().nullable(),
            email: zod_1.z.string().nullable(),
            logoUrl: zod_1.z.string().nullable(),
            isActive: zod_1.z.boolean(),
            createdAt: zod_1.z.string(),
        }),
        stats: zod_1.z.object({
            totalDoctors: zod_1.z.number(),
            totalAppointments: zod_1.z.number(),
            activePatients: zod_1.z.number(),
        }),
    }),
}));
exports.ProviderDashboardResponseSchema = openapi_registry_1.registry.register('ProviderDashboardResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.object({
        stats: zod_1.z.object({
            totalAppointments: zod_1.z.number(),
            pendingAppointments: zod_1.z.number(),
            completedAppointments: zod_1.z.number(),
            totalEarnings: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]),
        }),
        upcomingAppointments: zod_1.z.array(zod_1.z.any()),
    }),
}));
openapi_registry_1.registry.registerPath({
    method: 'get',
    path: '/api/users/dashboard/hospital',
    summary: 'Get dashboard statistics for Hospital Admin portal',
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Hospital Admin dashboard analytics',
            content: {
                'application/json': {
                    schema: exports.HospitalDashboardResponseSchema,
                },
            },
        },
        401: {
            description: 'Unauthorized',
        },
        403: {
            description: 'Forbidden',
        },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'get',
    path: '/api/users/providers',
    summary: 'Search providers',
    parameters: [
        { name: 'specialty', in: 'query', schema: { type: 'string' } },
        { name: 'name', in: 'query', schema: { type: 'string' } },
        { name: 'limit', in: 'query', schema: { type: 'string' } },
        { name: 'offset', in: 'query', schema: { type: 'string' } },
    ],
    responses: {
        200: { description: 'Providers list' },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'get',
    path: '/api/users/providers/{id}',
    summary: 'Get provider by ID',
    parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    responses: {
        200: { description: 'Provider details' },
        404: { description: 'Provider not found' },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'get',
    path: '/api/users/dashboard/provider',
    summary: 'Get dashboard analytics and schedule for Consultant/Doctor portal',
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Provider dashboard analytics and schedule queue',
            content: {
                'application/json': {
                    schema: exports.ProviderDashboardResponseSchema,
                },
            },
        },
        401: {
            description: 'Unauthorized',
        },
        403: {
            description: 'Forbidden',
        },
    },
});
//# sourceMappingURL=user.schema.js.map