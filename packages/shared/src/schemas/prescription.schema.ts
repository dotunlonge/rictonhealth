import { z } from './zod';
import { registry } from './openapi.registry';

export const PrescriptionItemSchema = registry.register(
  'PrescriptionItem',
  z.object({
    id: z.string().uuid(),
    prescriptionId: z.string().uuid(),
    drugName: z.string(),
    dosage: z.string(),
    quantity: z.number(),
    frequency: z.string(),
    duration: z.string(),
    instructions: z.string().nullable(),
    createdAt: z.string(),
  })
);

export const PrescriptionSchema = registry.register(
  'Prescription',
  z.object({
    id: z.string().uuid(),
    appointmentId: z.string().uuid().nullable(),
    patientId: z.string().uuid(),
    providerId: z.string().uuid(),
    pharmacyId: z.string().uuid().nullable(),
    status: z.string(),
    signedAt: z.string().nullable(),
    notes: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    items: z.array(PrescriptionItemSchema).optional(),
  })
);

export const CreatePrescriptionInputSchema = registry.register(
  'CreatePrescriptionInput',
  z.object({
    patientId: z.string().uuid(),
    appointmentId: z.string().uuid().optional(),
    notes: z.string().optional(),
    items: z.array(
      z.object({
        drugName: z.string().min(1),
        dosage: z.string().min(1),
        quantity: z.number().int().positive(),
        frequency: z.string().min(1),
        duration: z.string().min(1),
        instructions: z.string().optional(),
      })
    ),
  })
);

export const SignPrescriptionInputSchema = registry.register(
  'SignPrescriptionInput',
  z.object({
    otpCode: z.string().length(6),
  })
);

export const GetPrescriptionResponseSchema = registry.register(
  'GetPrescriptionResponse',
  z.object({
    success: z.boolean(),
    data: PrescriptionSchema,
  })
);

export const ListPrescriptionsResponseSchema = registry.register(
  'ListPrescriptionsResponse',
  z.object({
    success: z.boolean(),
    data: z.array(PrescriptionSchema),
  })
);

registry.registerPath({
  method: 'post',
  path: '/api/prescriptions',
  summary: 'Create a new prescription in DRAFT status',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: CreatePrescriptionInputSchema } },
    },
  },
  responses: {
    210: {
      description: 'Prescription drafted successfully',
      content: { 'application/json': { schema: GetPrescriptionResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/prescriptions',
  summary: 'List patient/provider/pharmacist accessible prescriptions',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'List retrieved successfully',
      content: { 'application/json': { schema: ListPrescriptionsResponseSchema } },
    },
  },
});

registry.registerPath({
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
      content: { 'application/json': { schema: GetPrescriptionResponseSchema } },
    },
  },
});

registry.registerPath({
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
      content: { 'application/json': { schema: SignPrescriptionInputSchema } },
    },
  },
  responses: {
    200: {
      description: 'Prescription signed successfully',
      content: { 'application/json': { schema: GetPrescriptionResponseSchema } },
    },
  },
});

registry.registerPath({
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
      content: { 'application/json': { schema: GetPrescriptionResponseSchema } },
    },
  },
});
