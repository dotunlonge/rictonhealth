import { z } from './zod';
import { registry } from './openapi.registry';

export const AppointmentSchema = registry.register(
  'Appointment',
  z.object({
    id: z.string().uuid(),
    patientId: z.string().uuid(),
    providerId: z.string().uuid(),
    hospitalId: z.string().uuid().nullable(),
    scheduledAt: z.string(),
    durationMinutes: z.number(),
    type: z.enum(['IN_PERSON', 'VIDEO']),
    status: z.string(),
    notes: z.string().nullable(),
    cancellationReason: z.string().nullable(),
    reason: z.string().nullable(),
    reminderSentAt: z.string().nullable(),
    cancelledBy: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
);

export const GetSlotsResponseSchema = registry.register(
  'GetSlotsResponse',
  z.object({
    success: z.boolean(),
    data: z.array(z.string()),
  })
);

export const BookAppointmentInputSchema = registry.register(
  'BookAppointmentInput',
  z.object({
    providerId: z.string().uuid(),
    hospitalId: z.string().uuid().optional(),
    scheduledAt: z.string().datetime(),
    type: z.enum(['IN_PERSON', 'VIDEO']),
    notes: z.string().optional(),
    reason: z.string().optional(),
    durationMinutes: z.number().int().positive().optional(),
  })
);

export const GetAppointmentResponseSchema = registry.register(
  'GetAppointmentResponse',
  z.object({
    success: z.boolean(),
    data: AppointmentSchema,
  })
);

export const ListAppointmentsResponseSchema = registry.register(
  'ListAppointmentsResponse',
  z.object({
    success: z.boolean(),
    data: z.object({
      appointments: z.array(AppointmentSchema),
      meta: z.object({
        total: z.number(),
        limit: z.number(),
        offset: z.number(),
        hasMore: z.boolean(),
      }),
    }),
  })
);

export const CreateAppointmentSchema = registry.register(
  'CreateAppointment',
  z.object({
    providerId: z.string().uuid(),
    scheduledAt: z.string().datetime(),
    type: z.enum(['IN_PERSON', 'VIDEO']),
    reason: z.string().optional(),
    durationMinutes: z.number().int().positive().optional(),
    hospitalId: z.string().uuid().optional(),
  })
);

export const UpdateAppointmentStatusSchema = registry.register(
  'UpdateAppointmentStatus',
  z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
    cancellationReason: z.string().optional(),
  })
);

export const GetAvailabilityQuerySchema = registry.register(
  'GetAvailabilityQuery',
  z.object({
    // Optional: providerId travels as a path param on GET /slots/:providerId
    // (web) and as a query param on GET /slots (mobile). Requiring it here
    // rejected every web slots request with a bare "Validation error"
    // because validateQuery only sees req.query.
    providerId: z.string().uuid().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
);

export const SetAvailabilityInputSchema = registry.register(
  'SetAvailabilityInput',
  z.object({
    dayOfWeek: z.number().int().min(0).max(6).describe('0=Monday..6=Sunday, evaluated in UTC'),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}(:\d{2})?$/)
      .describe('Window start, UTC HH:MM'),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}(:\d{2})?$/)
      .describe('Window end, UTC HH:MM'),
    slotDurationMinutes: z.number().int().positive().max(480).default(30),
    isActive: z.boolean().default(true),
  })
);

export const GetAppointmentsQuerySchema = registry.register(
  'GetAppointmentsQuery',
  z.object({
    status: z.string().optional(),
    type: z.string().optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    limit: z.string().optional(),
    offset: z.string().optional(),
  })
);

// Type exports
export type AppointmentSchema = z.infer<typeof AppointmentSchema>;
export type GetSlotsResponseSchema = z.infer<typeof GetSlotsResponseSchema>;
export type BookAppointmentInputSchema = z.infer<typeof BookAppointmentInputSchema>;
export type GetAppointmentResponseSchema = z.infer<typeof GetAppointmentResponseSchema>;
export type ListAppointmentsResponseSchema = z.infer<typeof ListAppointmentsResponseSchema>;
export type CreateAppointmentSchema = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentStatusSchema = z.infer<typeof UpdateAppointmentStatusSchema>;
export type GetAvailabilityQuerySchema = z.infer<typeof GetAvailabilityQuerySchema>;
export type SetAvailabilityInputSchema = z.infer<typeof SetAvailabilityInputSchema>;
export type GetAppointmentsQuerySchema = z.infer<typeof GetAppointmentsQuerySchema>;

registry.registerPath({
  method: 'post',
  path: '/api/appointments/availability',
  summary: 'Set provider availability',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            dayOfWeek: z.number().int().min(0).max(6),
            startTime: z.string(),
            endTime: z.string(),
            slotDurationMinutes: z.number().int().positive(),
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

registry.registerPath({
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

registry.registerPath({
  method: 'post',
  path: '/api/appointments',
  summary: 'Book appointment',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateAppointmentSchema,
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

registry.registerPath({
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

registry.registerPath({
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

registry.registerPath({
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
          schema: UpdateAppointmentStatusSchema,
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

registry.registerPath({
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
          schema: z.object({
            reason: z.string().optional(),
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
