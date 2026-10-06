import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const AdminUserListQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  role: z.enum(['PATIENT', 'CONSULTANT', 'PHARMACIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING', 'DEACTIVATED']).optional(),
  search: z.string().optional(),
});

export const AdminUserResponseSchema = z.object({
  id: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum(['PATIENT', 'CONSULTANT', 'PHARMACIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING', 'DEACTIVATED']),
  isVerified: z.boolean(),
  createdAt: z.string().datetime(),
  lastLoginAt: z.string().datetime().nullable(),
});

export const AdminUpdateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED']),
  reason: z.string().optional(),
});

export const AdminVerifyProviderSchema = z.object({
  verified: z.boolean(),
  notes: z.string().optional(),
});

// Provisioning (SUPER_ADMIN only): the ONLY way privileged roles come into
// existence, since public registration and OAuth are capped at self-serve
// roles. Provisioned users start ACTIVE (admin identity-proofed).
// NOTE: HOSPITAL_ADMIN has no profile model yet, so display names derive
// from the email local-part until one is introduced.
export const AdminProvisionUserSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().min(7).optional(),
    password: z.string().min(8),
    role: z.enum(['HOSPITAL_ADMIN']),
    hospitalId: z.string().uuid(),
  })
  .refine((data) => data.email || data.phone, {
    message: 'Either email or phone is required',
    path: ['email'],
  });

export const AdminHospitalCreateSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  country: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10),
});

// Update schema - all fields optional as updates are partial
export const AdminHospitalUpdateSchema = AdminHospitalCreateSchema.partial();

export const AdminAuditLogQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
  userId: z.string().optional(),
  action: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const AdminAnalyticsQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year']).default('month'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// Registry for OpenAPI
import { registry } from '@ricton/shared';

export const AdminUserListResponseSchema = registry.register(
  'AdminUserListResponse',
  z.object({
    users: z.array(AdminUserResponseSchema),
    meta: z.object({
      total: z.number(),
      page: z.number(),
      limit: z.number(),
      totalPages: z.number(),
    }),
  })
);

export const AdminProviderPendingListResponseSchema = registry.register(
  'AdminProviderPendingListResponse',
  z.object({
    providers: z.array(
      z.object({
        id: z.string(),
        userId: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        specialty: z.string(),
        licenseNumber: z.string(),
        submittedAt: z.string().datetime(),
        documents: z.array(
          z.object({
            type: z.string(),
            url: z.string(),
            status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
          })
        ),
      })
    ),
    meta: z.object({
      total: z.number(),
      page: z.number(),
      limit: z.number(),
    }),
  })
);

export const AdminHospitalResponseSchema = registry.register(
  'AdminHospitalResponse',
  z.object({
    id: z.string(),
    name: z.string(),
    address: z.record(z.unknown()).nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
  })
);

export const AdminAuditLogResponseSchema = registry.register(
  'AdminAuditLogResponse',
  z.object({
    logs: z.array(
      z.object({
        id: z.string(),
        userId: z.string(),
        action: z.string(),
        resource: z.string(),
        resourceId: z.string().nullable(),
        details: z.record(z.unknown()),
        ipAddress: z.string(),
        userAgent: z.string(),
        createdAt: z.string().datetime(),
      })
    ),
    meta: z.object({
      total: z.number(),
      page: z.number(),
      limit: z.number(),
    }),
  })
);

export const AdminAnalyticsResponseSchema = registry.register(
  'AdminAnalyticsResponse',
  z.object({
    overview: z.object({
      totalUsers: z.number(),
      totalProviders: z.number(),
      totalHospitals: z.number(),
      totalAppointments: z.number(),
      totalRevenue: z.number(),
      activeSubscriptions: z.number(),
    }),
    growth: z.object({
      userGrowth: z.array(z.object({ date: z.string(), count: z.number() })),
      appointmentGrowth: z.array(z.object({ date: z.string(), count: z.number() })),
      revenueGrowth: z.array(z.object({ date: z.string(), amount: z.number() })),
    }),
    topProviders: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        appointmentsCount: z.number(),
        revenue: z.number(),
        rating: z.number().nullable(),
      })
    ),
  })
);

// Type exports
export type AdminUserListQuerySchema = z.infer<typeof AdminUserListQuerySchema>;
export type AdminUserResponseSchema = z.infer<typeof AdminUserResponseSchema>;
export type AdminUpdateUserStatusSchema = z.infer<typeof AdminUpdateUserStatusSchema>;
export type AdminVerifyProviderSchema = z.infer<typeof AdminVerifyProviderSchema>;
export type AdminProvisionUserSchema = z.infer<typeof AdminProvisionUserSchema>;
export type AdminHospitalCreateSchema = z.infer<typeof AdminHospitalCreateSchema>;
export type AdminHospitalUpdateSchema = z.infer<typeof AdminHospitalUpdateSchema>;
export type AdminAuditLogQuerySchema = z.infer<typeof AdminAuditLogQuerySchema>;
export type AdminAnalyticsQuerySchema = z.infer<typeof AdminAnalyticsQuerySchema>;
export type AdminUserListResponseSchema = z.infer<typeof AdminUserListResponseSchema>;
export type AdminProviderPendingListResponseSchema = z.infer<
  typeof AdminProviderPendingListResponseSchema
>;
export type AdminHospitalResponseSchema = z.infer<typeof AdminHospitalResponseSchema>;
export type AdminAuditLogResponseSchema = z.infer<typeof AdminAuditLogResponseSchema>;
export type AdminAnalyticsResponseSchema = z.infer<typeof AdminAnalyticsResponseSchema>;
