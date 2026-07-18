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
    type: z.enum(['IN_PERSON', 'VIDEO']).optional(),
    notes: z.string().optional(),
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
    data: z.array(AppointmentSchema),
  })
);

registry.registerPath({
  method: 'get',
  path: '/api/appointments/slots',
  summary: 'Retrieve available schedule slots for a provider',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'providerId',
      in: 'query',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
    {
      name: 'date',
      in: 'query',
      required: true,
      schema: { type: 'string', format: 'date' },
    },
  ],
  responses: {
    200: {
      description: 'Slots list retrieved',
      content: { 'application/json': { schema: GetSlotsResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/appointments',
  summary: 'Book a new medical appointment',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: BookAppointmentInputSchema } },
    },
  },
  responses: {
    210: {
      description: 'Appointment created successfully',
      content: { 'application/json': { schema: GetAppointmentResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/appointments',
  summary: 'List authenticated patient/provider appointments',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'List retrieved',
      content: { 'application/json': { schema: ListAppointmentsResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/appointments/{id}/cancel',
  summary: 'Cancel a booked appointment',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
  ],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({ reason: z.string().optional() }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Appointment cancelled successfully',
      content: { 'application/json': { schema: GetAppointmentResponseSchema } },
    },
  },
});
