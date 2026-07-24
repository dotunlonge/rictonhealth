"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetTokenResponseSchema = exports.TelemedicineRoomSchema = void 0;
const zod_1 = require("./zod");
const openapi_registry_1 = require("./openapi.registry");
exports.TelemedicineRoomSchema = openapi_registry_1.registry.register('TelemedicineRoom', zod_1.z.object({
    id: zod_1.z.string().uuid(),
    appointmentId: zod_1.z.string().uuid().nullable(),
    providerId: zod_1.z.string().uuid(),
    roomType: zod_1.z.enum(['ONE_ON_ONE', 'MDT']),
    externalRoomId: zod_1.z.string(),
    externalRoomUrl: zod_1.z.string().nullable(),
    status: zod_1.z.enum(['CREATED', 'ACTIVE', 'ENDED']),
    startedAt: zod_1.z.string().nullable(),
    endedAt: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
}));
exports.GetTokenResponseSchema = openapi_registry_1.registry.register('GetTokenResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.object({
        token: zod_1.z.string(),
        room: exports.TelemedicineRoomSchema,
    }),
}));
openapi_registry_1.registry.registerPath({
    method: 'post',
    path: '/api/telemedicine/rooms',
    summary: 'Initialize a telemedicine video room',
    security: [{ bearerAuth: [] }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        appointmentId: zod_1.z.string().uuid().optional(),
                        roomType: zod_1.z.enum(['ONE_ON_ONE', 'MDT']).optional(),
                    }),
                },
            },
        },
    },
    responses: {
        201: {
            description: 'Telemedicine room created successfully',
            content: { 'application/json': { schema: exports.TelemedicineRoomSchema } },
        },
    },
});
openapi_registry_1.registry.registerPath({
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
            content: { 'application/json': { schema: exports.GetTokenResponseSchema } },
        },
    },
});
openapi_registry_1.registry.registerPath({
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
            content: { 'application/json': { schema: exports.TelemedicineRoomSchema } },
        },
    },
});
//# sourceMappingURL=telemedicine.schema.js.map