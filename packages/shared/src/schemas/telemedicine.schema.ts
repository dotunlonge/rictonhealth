import { z } from './zod';
import { registry } from './openapi.registry';

export const TelemedicineRoomSchema = registry.register(
  'TelemedicineRoom',
  z.object({
    id: z.string().uuid(),
    appointmentId: z.string().uuid().nullable(),
    providerId: z.string().uuid(),
    roomType: z.enum(['ONE_ON_ONE', 'MDT']),
    externalRoomId: z.string(),
    externalRoomUrl: z.string().nullable(),
    status: z.enum(['CREATED', 'ACTIVE', 'ENDED']),
    startedAt: z.string().nullable(),
    endedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
);

export const GetTokenResponseSchema = registry.register(
  'GetTokenResponse',
  z.object({
    success: z.boolean(),
    data: z.object({
      token: z.string(),
      room: TelemedicineRoomSchema,
    }),
  })
);

registry.registerPath({
  method: 'post',
  path: '/api/telemedicine/rooms',
  summary: 'Initialize a telemedicine video room',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            appointmentId: z.string().uuid().optional(),
            roomType: z.enum(['ONE_ON_ONE', 'MDT']).optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Telemedicine room created successfully',
      content: { 'application/json': { schema: TelemedicineRoomSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/telemedicine/rooms/{id}/token',
  summary: 'Retrieve Twilio Video participant join token',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
  ],
  responses: {
    200: {
      description: 'Join token issued successfully',
      content: { 'application/json': { schema: GetTokenResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/telemedicine/rooms/{id}/end',
  summary: 'End telemedicine consultation room sessions',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
  ],
  responses: {
    200: {
      description: 'Room session ended successfully',
      content: { 'application/json': { schema: TelemedicineRoomSchema } },
    },
  },
});
