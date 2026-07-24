"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressListResponseSchema = exports.ValidateAddressInputSchema = exports.UpdateAddressInputSchema = exports.CreateAddressInputSchema = exports.AddressSchema = void 0;
const zod_1 = require("./zod");
const openapi_registry_1 = require("./openapi.registry");
// Address schema for OpenAPI documentation
exports.AddressSchema = openapi_registry_1.registry.register('Address', zod_1.z.object({
    id: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    addressLine1: zod_1.z.string(),
    addressLine2: zod_1.z.string().nullable(),
    city: zod_1.z.string(),
    state: zod_1.z.string(),
    country: zod_1.z.string(),
    postalCode: zod_1.z.string().nullable(),
    latitude: zod_1.z.number().nullable(),
    longitude: zod_1.z.number().nullable(),
    isDefault: zod_1.z.boolean(),
    createdAt: zod_1.z.string().datetime(),
}));
exports.CreateAddressInputSchema = openapi_registry_1.registry.register('CreateAddressInput', zod_1.z.object({
    addressLine1: zod_1.z.string().min(5, 'Address line 1 must be at least 5 characters'),
    addressLine2: zod_1.z.string().optional(),
    city: zod_1.z.string().min(2, 'City must be at least 2 characters'),
    state: zod_1.z.string().min(2, 'State must be at least 2 characters'),
    country: zod_1.z.string().optional().default('Nigeria'),
    postalCode: zod_1.z
        .string()
        .regex(/^\d{6}$/, 'Postal code must be 6 digits (Nigerian format)')
        .optional(),
    latitude: zod_1.z.number().min(-90).max(90).optional(),
    longitude: zod_1.z.number().min(-180).max(180).optional(),
    isDefault: zod_1.z.boolean().optional().default(false),
}));
exports.UpdateAddressInputSchema = openapi_registry_1.registry.register('UpdateAddressInput', zod_1.z.object({
    addressLine1: zod_1.z.string().min(5).optional(),
    addressLine2: zod_1.z.string().optional(),
    city: zod_1.z.string().min(2).optional(),
    state: zod_1.z.string().min(2).optional(),
    country: zod_1.z.string().optional(),
    postalCode: zod_1.z
        .string()
        .regex(/^\d{6}$/)
        .optional(),
    latitude: zod_1.z.number().min(-90).max(90).optional(),
    longitude: zod_1.z.number().min(-180).max(180).optional(),
    isDefault: zod_1.z.boolean().optional(),
}));
exports.ValidateAddressInputSchema = openapi_registry_1.registry.register('ValidateAddressInput', zod_1.z.object({
    addressLine1: zod_1.z.string(),
    city: zod_1.z.string(),
    state: zod_1.z.string(),
    country: zod_1.z.string().optional(),
    postalCode: zod_1.z.string().optional(),
}));
exports.AddressListResponseSchema = openapi_registry_1.registry.register('AddressListResponse', zod_1.z.object({
    addresses: zod_1.z.array(exports.AddressSchema),
}));
// Register OpenAPI paths
openapi_registry_1.registry.registerPath({
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
                    schema: zod_1.z.object({
                        success: zod_1.z.boolean(),
                        data: exports.AddressListResponseSchema,
                    }),
                },
            },
        },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'post',
    path: '/api/addresses',
    description: 'Create a new address',
    tags: ['Addresses'],
    security: [{ bearerAuth: [] }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: exports.CreateAddressInputSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: 'Address created successfully',
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        success: zod_1.z.boolean(),
                        data: exports.AddressSchema,
                    }),
                },
            },
        },
    },
});
openapi_registry_1.registry.registerPath({
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
                    schema: zod_1.z.object({
                        success: zod_1.z.boolean(),
                        data: exports.AddressSchema,
                    }),
                },
            },
        },
    },
});
openapi_registry_1.registry.registerPath({
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
                    schema: exports.UpdateAddressInputSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Address updated successfully',
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        success: zod_1.z.boolean(),
                        data: exports.AddressSchema,
                    }),
                },
            },
        },
    },
});
openapi_registry_1.registry.registerPath({
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
                    schema: zod_1.z.object({
                        success: zod_1.z.boolean(),
                        message: zod_1.z.string(),
                    }),
                },
            },
        },
    },
});
openapi_registry_1.registry.registerPath({
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
                    schema: zod_1.z.object({
                        success: zod_1.z.boolean(),
                        data: exports.AddressSchema,
                    }),
                },
            },
        },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'post',
    path: '/api/addresses/validate',
    description: 'Validate an address format',
    tags: ['Addresses'],
    security: [{ bearerAuth: [] }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: exports.ValidateAddressInputSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Validation result',
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        success: zod_1.z.boolean(),
                        data: zod_1.z.object({
                            isValid: zod_1.z.boolean(),
                            normalizedAddress: zod_1.z.object({
                                addressLine1: zod_1.z.string(),
                                city: zod_1.z.string(),
                                state: zod_1.z.string(),
                                country: zod_1.z.string(),
                                postalCode: zod_1.z.string().nullable(),
                            }),
                        }),
                    }),
                },
            },
        },
    },
});
//# sourceMappingURL=address.schema.js.map