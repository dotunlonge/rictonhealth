import { z } from 'zod';
import { registry } from '@ricton/shared';

export const PrescriptionItemSchema = registry.register(
  'PrescriptionItem',
  z.object({
    id: z.string().uuid(),
    prescriptionId: z.string().uuid(),
    drugName: z.string(),
    dosage: z.string(),
    quantity: z.number().int(),
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
    items: z
      .array(
        z.object({
          drugName: z.string().min(1),
          dosage: z.string().min(1),
          quantity: z.number().int().positive(),
          frequency: z.string().min(1),
          duration: z.string().min(1),
          instructions: z.string().optional(),
        })
      )
      .min(1, 'At least one prescription item is required'),
  })
);

export const SignPrescriptionInputSchema = registry.register(
  'SignPrescriptionInput',
  z.object({
    otpCode: z.string().length(6, 'OTP must be exactly 6 characters'),
  })
);

export const UpdatePrescriptionStatusInputSchema = registry.register(
  'UpdatePrescriptionStatusInput',
  z.object({
    status: z.enum(['DRAFT', 'SIGNED', 'SENT_TO_PHARMACY', 'DISPENSED', 'CANCELLED']),
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

export const UpdatePrescriptionStatusResponseSchema = registry.register(
  'UpdatePrescriptionStatusResponse',
  z.object({
    success: z.boolean(),
    data: PrescriptionSchema,
  })
);

registry.registerPath({
  method: 'post',
  path: '/api/prescriptions',
  summary: 'Create a new prescription (CONSULTANT only)',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: CreatePrescriptionInputSchema } },
    },
  },
  responses: {
    201: {
      description: 'Prescription drafted successfully',
      content: { 'application/json': { schema: GetPrescriptionResponseSchema } },
    },
    403: { description: 'Forbidden - requires CONSULTANT role' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/prescriptions',
  summary: 'List prescriptions filtered by caller role',
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
    404: { description: 'Not Found' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/prescriptions/{id}/sign',
  summary: 'Digitally sign a DRAFT prescription with OTP (CONSULTANT only)',
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
    401: { description: 'Invalid signature verification OTP' },
    403: { description: 'Unverified license forbidden' },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/prescriptions/{id}/status',
  summary: 'Update prescription status (PHARMACIST only)',
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
      content: { 'application/json': { schema: UpdatePrescriptionStatusInputSchema } },
    },
  },
  responses: {
    200: {
      description: 'Prescription status updated successfully',
      content: { 'application/json': { schema: UpdatePrescriptionStatusResponseSchema } },
    },
    403: { description: 'Forbidden - requires PHARMACIST role' },
  },
});
