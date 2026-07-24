"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListPrescriptionsResponseSchema = exports.GetPrescriptionResponseSchema = exports.SignPrescriptionInputSchema = exports.CreatePrescriptionInputSchema = exports.PrescriptionSchema = exports.PrescriptionItemSchema = void 0;
const zod_1 = require("./zod");
const openapi_registry_1 = require("./openapi.registry");
exports.PrescriptionItemSchema = openapi_registry_1.registry.register('PrescriptionItem', zod_1.z.object({
    id: zod_1.z.string().uuid(),
    prescriptionId: zod_1.z.string().uuid(),
    drugName: zod_1.z.string(),
    dosage: zod_1.z.string(),
    quantity: zod_1.z.number(),
    frequency: zod_1.z.string(),
    duration: zod_1.z.string(),
    instructions: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string(),
}));
exports.PrescriptionSchema = openapi_registry_1.registry.register('Prescription', zod_1.z.object({
    id: zod_1.z.string().uuid(),
    appointmentId: zod_1.z.string().uuid().nullable(),
    patientId: zod_1.z.string().uuid(),
    providerId: zod_1.z.string().uuid(),
    pharmacyId: zod_1.z.string().uuid().nullable(),
    status: zod_1.z.string(),
    signedAt: zod_1.z.string().nullable(),
    notes: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
    items: zod_1.z.array(exports.PrescriptionItemSchema).optional(),
}));
exports.CreatePrescriptionInputSchema = openapi_registry_1.registry.register('CreatePrescriptionInput', zod_1.z.object({
    patientId: zod_1.z.string().uuid(),
    appointmentId: zod_1.z.string().uuid().optional(),
    notes: zod_1.z.string().optional(),
    items: zod_1.z.array(zod_1.z.object({
        drugName: zod_1.z.string().min(1),
        dosage: zod_1.z.string().min(1),
        quantity: zod_1.z.number().int().positive(),
        frequency: zod_1.z.string().min(1),
        duration: zod_1.z.string().min(1),
        instructions: zod_1.z.string().optional(),
    })),
}));
exports.SignPrescriptionInputSchema = openapi_registry_1.registry.register('SignPrescriptionInput', zod_1.z.object({
    otpCode: zod_1.z.string().length(6),
}));
exports.GetPrescriptionResponseSchema = openapi_registry_1.registry.register('GetPrescriptionResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: exports.PrescriptionSchema,
}));
exports.ListPrescriptionsResponseSchema = openapi_registry_1.registry.register('ListPrescriptionsResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.array(exports.PrescriptionSchema),
}));
openapi_registry_1.registry.registerPath({
    method: 'post',
    path: '/api/prescriptions',
    summary: 'Create a new prescription in DRAFT status',
    security: [{ bearerAuth: [] }],
    request: {
        body: {
            content: { 'application/json': { schema: exports.CreatePrescriptionInputSchema } },
        },
    },
    responses: {
        201: {
            description: 'Prescription drafted successfully',
            content: { 'application/json': { schema: exports.GetPrescriptionResponseSchema } },
        },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'get',
    path: '/api/prescriptions',
    summary: 'List patient/provider/pharmacist accessible prescriptions',
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'List retrieved successfully',
            content: { 'application/json': { schema: exports.ListPrescriptionsResponseSchema } },
        },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'get',
    path: '/api/prescriptions/{id}',
    summary: 'Get full prescription details including line items',
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
            description: 'Details retrieved successfully',
            content: { 'application/json': { schema: exports.GetPrescriptionResponseSchema } },
        },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'post',
    path: '/api/prescriptions/{id}/sign',
    summary: 'Digitally sign a DRAFT prescription with clinical license check and OTP',
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
            content: { 'application/json': { schema: exports.SignPrescriptionInputSchema } },
        },
    },
    responses: {
        200: {
            description: 'Prescription signed successfully',
            content: { 'application/json': { schema: exports.GetPrescriptionResponseSchema } },
        },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'patch',
    path: '/api/prescriptions/{id}/dispense',
    summary: 'Mark a prescription as dispensed by a pharmacist',
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
            description: 'Prescription marked as dispensed successfully',
            content: { 'application/json': { schema: exports.GetPrescriptionResponseSchema } },
        },
    },
});
//# sourceMappingURL=prescription.schema.js.map