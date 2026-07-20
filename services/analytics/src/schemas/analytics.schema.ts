import { z } from '@ricton/shared';
import { registry } from './registry';

export const RangeQuerySchema = registry.register(
  'AnalyticsRangeQuery',
  z.object({
    range: z.enum(['7d', '30d', '90d', '12m', 'all']).default('30d'),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
);

export const OverviewResponseSchema = registry.register(
  'AnalyticsOverviewResponse',
  z.object({
    success: z.boolean(),
    data: z.object({
      totalUsers: z.number(),
      totalPatients: z.number(),
      totalProviders: z.number(),
      totalPharmacists: z.number(),
      totalHospitals: z.number(),
      totalAppointments: z.number(),
      completedAppointments: z.number(),
      totalRevenue: z.number(),
      activeSubscriptions: z.number(),
    }),
  })
);

export const AppointmentsTrendResponseSchema = registry.register(
  'AnalyticsAppointmentsTrendResponse',
  z.object({
    success: z.boolean(),
    data: z.object({
      total: z.number(),
      byStatus: z.record(z.string(), z.number()),
      byType: z.record(z.string(), z.number()),
      trend: z.array(
        z.object({
          period: z.string(),
          count: z.number(),
        })
      ),
    }),
  })
);

export const RevenueResponseSchema = registry.register(
  'AnalyticsRevenueResponse',
  z.object({
    success: z.boolean(),
    data: z.object({
      totalRevenue: z.number(),
      byType: z.record(z.string(), z.number()),
      trend: z.array(
        z.object({
          period: z.string(),
          amount: z.number(),
        })
      ),
    }),
  })
);

export const UserGrowthResponseSchema = registry.register(
  'AnalyticsUserGrowthResponse',
  z.object({
    success: z.boolean(),
    data: z.object({
      totalUsers: z.number(),
      byRole: z.record(z.string(), z.number()),
      trend: z.array(
        z.object({
          period: z.string(),
          count: z.number(),
        })
      ),
    }),
  })
);

export const ProviderPerformanceResponseSchema = registry.register(
  'AnalyticsProviderPerformanceResponse',
  z.object({
    success: z.boolean(),
    data: z.object({
      providers: z.array(
        z.object({
          providerId: z.string(),
          name: z.string(),
          specialty: z.string().nullable(),
          appointmentCount: z.number(),
          completedCount: z.number(),
          rating: z.number().nullable(),
        })
      ),
      total: z.number(),
    }),
  })
);

export const PharmacyMetricsResponseSchema = registry.register(
  'AnalyticsPharmacyMetricsResponse',
  z.object({
    success: z.boolean(),
    data: z.object({
      totalPharmacies: z.number(),
      verifiedPharmacies: z.number(),
      totalOrders: z.number(),
      ordersByStatus: z.record(z.string(), z.number()),
      totalOrderValue: z.number(),
    }),
  })
);

registry.registerPath({
  method: 'get',
  path: '/api/analytics/overview',
  summary: 'Platform overview analytics',
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Platform overview' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/analytics/appointments',
  summary: 'Appointment trends analytics',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'range',
      in: 'query',
      schema: { type: 'string', enum: ['7d', '30d', '90d', '12m', 'all'] },
    },
    { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
    { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
  ],
  responses: {
    200: { description: 'Appointment trends' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/analytics/revenue',
  summary: 'Revenue analytics',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'range',
      in: 'query',
      schema: { type: 'string', enum: ['7d', '30d', '90d', '12m', 'all'] },
    },
    { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
    { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
  ],
  responses: {
    200: { description: 'Revenue analytics' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/analytics/users',
  summary: 'User growth analytics',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'range',
      in: 'query',
      schema: { type: 'string', enum: ['7d', '30d', '90d', '12m', 'all'] },
    },
    { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
    { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
  ],
  responses: {
    200: { description: 'User growth stats' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/analytics/providers',
  summary: 'Provider performance analytics',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'range',
      in: 'query',
      schema: { type: 'string', enum: ['7d', '30d', '90d', '12m', 'all'] },
    },
    { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
    { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
  ],
  responses: {
    200: { description: 'Provider performance' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/analytics/pharmacies',
  summary: 'Pharmacy metrics analytics',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'range',
      in: 'query',
      schema: { type: 'string', enum: ['7d', '30d', '90d', '12m', 'all'] },
    },
    { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
    { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
  ],
  responses: {
    200: { description: 'Pharmacy metrics' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});
