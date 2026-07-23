"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetAppointmentsQuerySchema = exports.GetAvailabilityQuerySchema = exports.UpdateAppointmentStatusSchema = exports.CreateAppointmentSchema = exports.ListAppointmentsResponseSchema = exports.GetAppointmentResponseSchema = exports.BookAppointmentInputSchema = exports.GetSlotsResponseSchema = exports.AppointmentSchema = void 0;
const zod_1 = require("./zod");
const openapi_registry_1 = require("./openapi.registry");
exports.AppointmentSchema = openapi_registry_1.registry.register('Appointment', zod_1.z.object({
    id: zod_1.z.string().uuid(),
    patientId: zod_1.z.string().uuid(),
    providerId: zod_1.z.string().uuid(),
    hospitalId: zod_1.z.string().uuid().nullable(),
    scheduledAt: zod_1.z.string(),
    durationMinutes: zod_1.z.number(),
    type: zod_1.z.enum(['IN_PERSON', 'VIDEO']),
    status: zod_1.z.string(),
    notes: zod_1.z.string().nullable(),
    cancellationReason: zod_1.z.string().nullable(),
    reason: zod_1.z.string().nullable(),
    reminderSentAt: zod_1.z.string().nullable(),
    cancelledBy: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
}));
exports.GetSlotsResponseSchema = openapi_registry_1.registry.register('GetSlotsResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.array(zod_1.z.string()),
}));
exports.BookAppointmentInputSchema = openapi_registry_1.registry.register('BookAppointmentInput', zod_1.z.object({
    providerId: zod_1.z.string().uuid(),
    hospitalId: zod_1.z.string().uuid().optional(),
    scheduledAt: zod_1.z.string().datetime(),
    type: zod_1.z.enum(['IN_PERSON', 'VIDEO']),
    notes: zod_1.z.string().optional(),
    reason: zod_1.z.string().optional(),
    durationMinutes: zod_1.z.number().int().positive().optional(),
}));
exports.GetAppointmentResponseSchema = openapi_registry_1.registry.register('GetAppointmentResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: exports.AppointmentSchema,
}));
exports.ListAppointmentsResponseSchema = openapi_registry_1.registry.register('ListAppointmentsResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.object({
        appointments: zod_1.z.array(exports.AppointmentSchema),
        meta: zod_1.z.object({
            total: zod_1.z.number(),
            limit: zod_1.z.number(),
            offset: zod_1.z.number(),
            hasMore: zod_1.z.boolean(),
        }),
    }),
}));
exports.CreateAppointmentSchema = openapi_registry_1.registry.register('CreateAppointment', zod_1.z.object({
    providerId: zod_1.z.string().uuid(),
    scheduledAt: zod_1.z.string().datetime(),
    type: zod_1.z.enum(['IN_PERSON', 'VIDEO']),
    reason: zod_1.z.string().optional(),
    durationMinutes: zod_1.z.number().int().positive().optional(),
    hospitalId: zod_1.z.string().uuid().optional(),
}));
exports.UpdateAppointmentStatusSchema = openapi_registry_1.registry.register('UpdateAppointmentStatus', zod_1.z.object({
    status: zod_1.z.enum(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
    cancellationReason: zod_1.z.string().optional(),
}));
exports.GetAvailabilityQuerySchema = openapi_registry_1.registry.register('GetAvailabilityQuery', zod_1.z.object({
    providerId: zod_1.z.string().uuid(),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}));
exports.GetAppointmentsQuerySchema = openapi_registry_1.registry.register('GetAppointmentsQuery', zod_1.z.object({
    status: zod_1.z.string().optional(),
    type: zod_1.z.string().optional(),
    from: zod_1.z.string().datetime().optional(),
    to: zod_1.z.string().datetime().optional(),
    limit: zod_1.z.string().optional(),
    offset: zod_1.z.string().optional(),
}));
openapi_registry_1.registry.registerPath({
    method: 'post',
    path: '/api/appointments/availability',
    summary: 'Set provider availability',
    security: [{ bearerAuth: [] }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        dayOfWeek: zod_1.z.number().int().min(0).max(6),
                        startTime: zod_1.z.string(),
                        endTime: zod_1.z.string(),
                        slotDurationMinutes: zod_1.z.number().int().positive(),
                    }),
                },
            },
        },
    },
    responses: {
        200: { description: 'Availability set' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'get',
    path: '/api/appointments/slots/{providerId}',
    summary: 'Get available slots for provider',
    security: [{ bearerAuth: [] }],
    parameters: [
        { name: 'providerId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'date', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
    ],
    responses: {
        200: { description: 'Available slots' },
        401: { description: 'Unauthorized' },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'post',
    path: '/api/appointments',
    summary: 'Book appointment',
    security: [{ bearerAuth: [] }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: exports.CreateAppointmentSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Appointment created' },
        400: { description: 'Validation error' },
        409: { description: 'Slot conflict' },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'get',
    path: '/api/appointments',
    summary: 'List appointments',
    security: [{ bearerAuth: [] }],
    parameters: [
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'type', in: 'query', schema: { type: 'string' } },
        { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
        { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
        { name: 'limit', in: 'query', schema: { type: 'string' } },
        { name: 'offset', in: 'query', schema: { type: 'string' } },
    ],
    responses: {
        200: { description: 'Appointments list' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'get',
    path: '/api/appointments/{id}',
    summary: 'Get appointment by ID',
    security: [{ bearerAuth: [] }],
    parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    responses: {
        200: { description: 'Appointment details' },
        404: { description: 'Not found' },
        403: { description: 'Forbidden' },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'patch',
    path: '/api/appointments/{id}/status',
    summary: 'Update appointment status',
    security: [{ bearerAuth: [] }],
    parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: exports.UpdateAppointmentStatusSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Status updated' },
        404: { description: 'Not found' },
        403: { description: 'Forbidden' },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'patch',
    path: '/api/appointments/{id}/cancel',
    summary: 'Cancel appointment',
    security: [{ bearerAuth: [] }],
    parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        reason: zod_1.z.string().optional(),
                    }),
                },
            },
        },
    },
    responses: {
        200: { description: 'Appointment cancelled' },
        404: { description: 'Not found' },
        403: { description: 'Forbidden' },
    },
});
//# sourceMappingURL=appointment.schema.js.map