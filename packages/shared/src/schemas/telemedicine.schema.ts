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

export const JoinRoomResponseSchema = registry.register(
  'JoinRoomResponse',
  z.object({
    success: z.boolean(),
    data: z.object({
      joined: z.literal(true),
      roomId: z.string().uuid(),
      joinedAt: z.string().datetime(),
    }),
  })
);

// Type exports
export type TelemedicineRoomSchema = z.infer<typeof TelemedicineRoomSchema>;
export type GetTokenResponseSchema = z.infer<typeof GetTokenResponseSchema>;
export type JoinRoomResponseSchema = z.infer<typeof JoinRoomResponseSchema>;

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
  path: '/api/telemedicine/rooms/{id}/join',
  summary: 'Confirm that an authenticated participant connected to the video room',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
    },
  ],
  responses: {
    200: {
      description: 'Participant and room lifecycle updated',
      content: { 'application/json': { schema: JoinRoomResponseSchema } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Not a participant, outside the join window, or room ended' },
    404: { description: 'Room not found' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/telemedicine/meetings/{id}/join',
  summary: 'Confirm that an authenticated participant connected to the video meeting',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
    },
  ],
  responses: {
    200: {
      description: 'Participant and room lifecycle updated',
      content: { 'application/json': { schema: JoinRoomResponseSchema } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Not a participant, outside the join window, or room ended' },
    404: { description: 'Room not found' },
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
