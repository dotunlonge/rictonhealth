"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PharmacyMetricsResponseSchema = exports.ProviderPerformanceResponseSchema = exports.UserGrowthResponseSchema = exports.RevenueResponseSchema = exports.AppointmentsTrendResponseSchema = exports.OverviewResponseSchema = exports.RangeQuerySchema = void 0;
const zod_1 = require("zod");
const openapi_registry_1 = require("./openapi.registry");
exports.RangeQuerySchema = openapi_registry_1.registry.register('AnalyticsRangeQuery', zod_1.z.object({
    range: zod_1.z.enum(['7d', '30d', '90d', '12m', 'all']).default('30d'),
    from: zod_1.z.string().datetime().optional(),
    to: zod_1.z.string().datetime().optional(),
}));
exports.OverviewResponseSchema = openapi_registry_1.registry.register('AnalyticsOverviewResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.object({
        totalUsers: zod_1.z.number(),
        totalPatients: zod_1.z.number(),
        totalProviders: zod_1.z.number(),
        totalPharmacists: zod_1.z.number(),
        totalHospitals: zod_1.z.number(),
        totalAppointments: zod_1.z.number(),
        completedAppointments: zod_1.z.number(),
        totalRevenue: zod_1.z.number(),
        activeSubscriptions: zod_1.z.number(),
    }),
}));
exports.AppointmentsTrendResponseSchema = openapi_registry_1.registry.register('AnalyticsAppointmentsTrendResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.object({
        total: zod_1.z.number(),
        byStatus: zod_1.z.record(zod_1.z.string(), zod_1.z.number()),
        byType: zod_1.z.record(zod_1.z.string(), zod_1.z.number()),
        trend: zod_1.z.array(zod_1.z.object({
            period: zod_1.z.string(),
            count: zod_1.z.number(),
        })),
    }),
}));
exports.RevenueResponseSchema = openapi_registry_1.registry.register('AnalyticsRevenueResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.object({
        totalRevenue: zod_1.z.number(),
        byType: zod_1.z.record(zod_1.z.string(), zod_1.z.number()),
        trend: zod_1.z.array(zod_1.z.object({
            period: zod_1.z.string(),
            amount: zod_1.z.number(),
        })),
    }),
}));
exports.UserGrowthResponseSchema = openapi_registry_1.registry.register('AnalyticsUserGrowthResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.object({
        totalUsers: zod_1.z.number(),
        byRole: zod_1.z.record(zod_1.z.string(), zod_1.z.number()),
        trend: zod_1.z.array(zod_1.z.object({
            period: zod_1.z.string(),
            count: zod_1.z.number(),
        })),
    }),
}));
exports.ProviderPerformanceResponseSchema = openapi_registry_1.registry.register('AnalyticsProviderPerformanceResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.object({
        providers: zod_1.z.array(zod_1.z.object({
            providerId: zod_1.z.string(),
            name: zod_1.z.string(),
            specialty: zod_1.z.string().nullable(),
            appointmentCount: zod_1.z.number(),
            completedCount: zod_1.z.number(),
            rating: zod_1.z.number().nullable(),
        })),
        total: zod_1.z.number(),
    }),
}));
exports.PharmacyMetricsResponseSchema = openapi_registry_1.registry.register('AnalyticsPharmacyMetricsResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.object({
        totalPharmacies: zod_1.z.number(),
        verifiedPharmacies: zod_1.z.number(),
        totalOrders: zod_1.z.number(),
        ordersByStatus: zod_1.z.record(zod_1.z.string(), zod_1.z.number()),
        totalOrderValue: zod_1.z.number(),
    }),
}));
openapi_registry_1.registry.registerPath({
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
openapi_registry_1.registry.registerPath({
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
openapi_registry_1.registry.registerPath({
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
openapi_registry_1.registry.registerPath({
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
openapi_registry_1.registry.registerPath({
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
openapi_registry_1.registry.registerPath({
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
//# sourceMappingURL=analytics.schema.js.map