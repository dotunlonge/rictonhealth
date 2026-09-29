import { z } from './zod';
import { registry } from './openapi.registry';

export const UserProfileSchema = registry.register(
  'UserProfile',
  z.object({
    id: z.string().uuid(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    // #C1: mirror UserRole / UserStatus prisma enums — no free-form strings.
    role: z.enum(['PATIENT', 'CONSULTANT', 'PHARMACIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']),
    status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED']),
    patientProfile: z
      .object({
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        dateOfBirth: z.string().nullable(),
        gender: z.string().nullable(),
        bloodType: z.string().nullable(),
        allergies: z.array(z.string()).nullable().optional(),
        medicalHistory: z
          .array(
            z.object({
              condition: z.string().min(1, 'Condition must be a non-empty string'),
              diagnosedAt: z
                .string()
                .regex(/^\d{4}-\d{2}-\d{2}$/, 'Diagnosed date must be in YYYY-MM-DD format')
                .optional(),
              notes: z.string().optional(),
            })
          )
          .nullable()
          .optional(),
        emergencyContact: z
          .object({
            name: z.string(),
            relationship: z.string(),
            phone: z.string(),
          })
          .nullable()
          .optional(),
      })
      .nullable()
      .optional(),
    providerProfile: z
      .object({
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        specialty: z.string().nullable(),
        consultationFee: z.number().nullable(),
      })
      .nullable()
      .optional(),
    pharmacyProfile: z
      .object({
        pharmacyName: z.string(),
        licenseNumber: z.string().nullable().optional(),
        isVerified: z.boolean().optional(),
      })
      .nullable()
      .optional(),
  })
);

export const GetUserResponseSchema = registry.register(
  'GetUserResponse',
  z.object({
    success: z.boolean(),
    data: UserProfileSchema,
  })
);

export const UpdateProfileInputSchema = registry.register(
  'UpdateProfileInput',
  z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    avatarUrl: z
      .string()
      .url()
      .refine((url) => url.startsWith('https://'), 'Avatar URL must use HTTPS')
      .optional(),
    dateOfBirth: z.string().optional(),
    gender: z.string().optional(),
    bloodType: z.string().optional(),
    allergies: z.array(z.string()).optional(),
    specialty: z.string().optional(),
    consultationFee: z.coerce.number().int().min(500).max(500000).finite().optional(),
    title: z.string().optional(),
    licenseNumber: z.string().optional(),
    pharmacyName: z.string().optional(),
    // Hospital Onboarding fields
    hospitalName: z.string().optional(),
    registrationNumber: z.string().optional(),
    cacNumber: z.string().optional(),
    facilityTier: z.string().optional(),
    ownershipType: z.string().optional(),
    address: z.union([z.string(), z.record(z.unknown())]).optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    emergencyPhone: z.string().optional(),
    supportEmail: z.string().optional(),
    website: z.string().optional(),
    totalBeds: z.union([z.string(), z.number()]).optional(),
    icuBeds: z.union([z.string(), z.number()]).optional(),
    operatingRooms: z.union([z.string(), z.number()]).optional(),
    ambulances: z.union([z.string(), z.number()]).optional(),
    departments: z.array(z.string()).optional(),
    medicalDirector: z.record(z.unknown()).optional(),
    documents: z.record(z.unknown()).optional(),
    // Bank details
    bankName: z.string().optional(),
    bankCode: z.string().optional(),
    accountNumber: z.string().optional(),
    accountName: z.string().optional(),
    bankDetails: z.record(z.unknown()).optional(),
    settlementFrequency: z.string().optional(),
  })
);

export const AvatarUploadInputSchema = registry.register(
  'AvatarUploadInput',
  z.object({
    fileType: z.string().min(1),
  })
);

export const MedicalHistoryInputSchema = registry.register(
  'MedicalHistoryInput',
  z.object({
    medicalHistory: z.array(
      z.object({
        condition: z.string().min(1, 'Condition must be a non-empty string'),
        diagnosedAt: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'Diagnosed date must be in YYYY-MM-DD format')
          .optional(),
        notes: z.string().optional(),
      })
    ),
  })
);

export const GetProvidersQuerySchema = registry.register(
  'GetProvidersQuery',
  z.object({
    specialty: z.string().optional(),
    name: z.string().optional(),
    search: z.string().optional(),
    limit: z.string().optional(),
    offset: z.string().optional(),
  })
);

registry.registerPath({
  method: 'get',
  path: '/api/users/me',
  summary: 'Get current user profile',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'User profile retrieved successfully',
      content: {
        'application/json': {
          schema: GetUserResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
    },
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/users/me',
  summary: 'Update current user profile',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpdateProfileInputSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'User profile updated successfully',
      content: {
        'application/json': {
          schema: GetUserResponseSchema,
        },
      },
    },
    400: {
      description: 'Validation error',
    },
    401: {
      description: 'Unauthorized',
    },
  },
});

export const HospitalDashboardResponseSchema = registry.register(
  'HospitalDashboardResponse',
  z.object({
    success: z.boolean(),
    data: z.object({
      hospital: z.object({
        id: z.string().uuid(),
        name: z.string(),
        phone: z.string().nullable(),
        email: z.string().nullable(),
        logoUrl: z.string().nullable(),
        isActive: z.boolean(),
        createdAt: z.string(),
      }),
      stats: z.object({
        totalDoctors: z.number(),
        totalAppointments: z.number(),
        activePatients: z.number(),
      }),
    }),
  })
);

export const ProviderDashboardResponseSchema = registry.register(
  'ProviderDashboardResponse',
  z.object({
    success: z.boolean(),
    data: z.object({
      stats: z.object({
        totalAppointments: z.number(),
        pendingAppointments: z.number(),
        completedAppointments: z.number(),
        totalEarnings: z.union([z.number(), z.string()]),
      }),
      upcomingAppointments: z.array(z.any()),
    }),
  })
);

export const PatientDashboardResponseSchema = registry.register(
  'PatientDashboardResponse',
  z.object({
    success: z.boolean(),
    data: z.object({
      stats: z.object({
        totalAppointments: z.number(),
        pendingAppointments: z.number(),
        completedAppointments: z.number(),
      }),
      upcomingAppointments: z.array(z.any()),
    }),
  })
);

// Type exports
export type UserProfileSchema = z.infer<typeof UserProfileSchema>;
export type GetUserResponseSchema = z.infer<typeof GetUserResponseSchema>;
export type UpdateProfileInputSchema = z.infer<typeof UpdateProfileInputSchema>;
export type AvatarUploadInputSchema = z.infer<typeof AvatarUploadInputSchema>;
export type MedicalHistoryInputSchema = z.infer<typeof MedicalHistoryInputSchema>;
export type GetProvidersQuerySchema = z.infer<typeof GetProvidersQuerySchema>;
export type HospitalDashboardResponseSchema = z.infer<typeof HospitalDashboardResponseSchema>;
export type ProviderDashboardResponseSchema = z.infer<typeof ProviderDashboardResponseSchema>;
export type PatientDashboardResponseSchema = z.infer<typeof PatientDashboardResponseSchema>;

registry.registerPath({
  method: 'get',
  path: '/api/users/dashboard/hospital',
  summary: 'Get dashboard statistics for Hospital Admin portal',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Hospital Admin dashboard analytics',
      content: {
        'application/json': {
          schema: HospitalDashboardResponseSchema,
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

registry.registerPath({
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

registry.registerPath({
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

registry.registerPath({
  method: 'get',
  path: '/api/users/dashboard/provider',
  summary: 'Get dashboard analytics and schedule for Consultant/Doctor portal',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Provider dashboard analytics and schedule queue',
      content: {
        'application/json': {
          schema: ProviderDashboardResponseSchema,
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

registry.registerPath({
  method: 'get',
  path: '/api/users/dashboard/patient',
  summary: 'Get dashboard analytics and schedule for Patient portal',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Patient dashboard analytics and schedule queue',
      content: {
        'application/json': {
          schema: PatientDashboardResponseSchema,
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
