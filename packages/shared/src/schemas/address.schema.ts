import { z } from './zod';
import { registry } from './openapi.registry';

// Address schema for OpenAPI documentation
export const AddressSchema = registry.register(
  'Address',
  z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    addressLine1: z.string(),
    addressLine2: z.string().nullable(),
    city: z.string(),
    state: z.string(),
    country: z.string(),
    postalCode: z.string().nullable(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    isDefault: z.boolean(),
    createdAt: z.string().datetime(),
  })
);

export const CreateAddressInputSchema = registry.register(
  'CreateAddressInput',
  z.object({
    addressLine1: z.string().min(5, 'Address line 1 must be at least 5 characters'),
    addressLine2: z.string().optional(),
    city: z.string().min(2, 'City must be at least 2 characters'),
    state: z.string().min(2, 'State must be at least 2 characters'),
    country: z.string().optional().default('Nigeria'),
    postalCode: z
      .string()
      .regex(/^\d{6}$/, 'Postal code must be 6 digits (Nigerian format)')
      .optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    isDefault: z.boolean().optional().default(false),
  })
);

export const UpdateAddressInputSchema = registry.register(
  'UpdateAddressInput',
  z.object({
    addressLine1: z.string().min(5).optional(),
    addressLine2: z.string().optional(),
    city: z.string().min(2).optional(),
    state: z.string().min(2).optional(),
    country: z.string().optional(),
    postalCode: z
      .string()
      .regex(/^\d{6}$/)
      .optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    isDefault: z.boolean().optional(),
  })
);

export const ValidateAddressInputSchema = registry.register(
  'ValidateAddressInput',
  z.object({
    addressLine1: z.string(),
    city: z.string(),
    state: z.string(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
  })
);

export const AddressListResponseSchema = registry.register(
  'AddressListResponse',
  z.object({
    addresses: z.array(AddressSchema),
  })
);

// Type exports
export type AddressSchema = z.infer<typeof AddressSchema>;
export type CreateAddressInputSchema = z.infer<typeof CreateAddressInputSchema>;
export type UpdateAddressInputSchema = z.infer<typeof UpdateAddressInputSchema>;
export type ValidateAddressInputSchema = z.infer<typeof ValidateAddressInputSchema>;
export type AddressListResponseSchema = z.infer<typeof AddressListResponseSchema>;

// Register OpenAPI paths
registry.registerPath({
  method: 'get',
  path: '/api/addresses',
  description: 'List all addresses for the current user',
  tags: ['Addresses'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'List of user addresses',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: AddressListResponseSchema,
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/addresses',
  description: 'Create a new address',
  tags: ['Addresses'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateAddressInputSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Address created successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: AddressSchema,
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/addresses/{id}',
  description: 'Get address by ID',
  tags: ['Addresses'],
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
      description: 'Address details',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: AddressSchema,
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/addresses/{id}',
  description: 'Update an existing address',
  tags: ['Addresses'],
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
          schema: UpdateAddressInputSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Address updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: AddressSchema,
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/addresses/{id}',
  description: 'Delete an address',
  tags: ['Addresses'],
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
      description: 'Address deleted successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/addresses/{id}/set-default',
  description: 'Set an address as the default',
  tags: ['Addresses'],
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
      description: 'Address set as default',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: AddressSchema,
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/addresses/validate',
  description: 'Validate an address format',
  tags: ['Addresses'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: ValidateAddressInputSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Validation result',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              isValid: z.boolean(),
              normalizedAddress: z.object({
                addressLine1: z.string(),
                city: z.string(),
                state: z.string(),
                country: z.string(),
                postalCode: z.string().nullable(),
              }),
            }),
          }),
        },
      },
    },
  },
});
