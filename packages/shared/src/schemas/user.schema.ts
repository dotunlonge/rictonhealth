import { z } from './zod';
import { registry } from './openapi.registry';

export const UserProfileSchema = registry.register(
  'UserProfile',
  z.object({
    id: z.string().uuid(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    role: z.string(),
    status: z.string(),
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
    dateOfBirth: z.string().optional(),
    gender: z.string().optional(),
    bloodType: z.string().optional(),
    allergies: z.array(z.string()).optional(),
    specialty: z.string().optional(),
    consultationFee: z.number().optional(),
    title: z.string().optional(),
    pharmacyName: z.string().optional(),
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
  path: '/api/users/providers/:id',
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
