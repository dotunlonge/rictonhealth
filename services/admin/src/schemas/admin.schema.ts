import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const AdminUserListQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  role: z.enum(['PATIENT', 'CONSULTANT', 'PHARMACIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'DEACTIVATED']).optional(),
  search: z.string().optional(),
});

export const AdminUserResponseSchema = z.object({
  id: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum(['PATIENT', 'CONSULTANT', 'PHARMACIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'DEACTIVATED']),
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

export const AdminHospitalCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  country: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10),
  website: z.string().url().optional(),
});

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
        documents: z.array(z.object({
          type: z.string(),
          url: z.string(),
          status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
        })),
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
    description: z.string().nullable(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    country: z.string(),
    email: z.string(),
    phone: z.string(),
    website: z.string().nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE']),
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
