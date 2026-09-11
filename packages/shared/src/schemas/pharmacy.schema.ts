import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

import { registry } from './openapi.registry';

export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.union([z.number().nonnegative(), z.string().regex(/^\d+(\.\d+)?$/)]),
  category: z.string().nullable(),
  imageUrl: z.string().url().nullable(),
  stock: z.number().int().nonnegative(),
  requiresPrescription: z.boolean(),
  isActive: z.boolean(),
  pharmacyId: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export const PharmacyOrderSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  pharmacyId: z.string().uuid(),
  prescriptionId: z.string().uuid().nullable(),
  status: z.enum([
    'PLACED',
    'CONFIRMED',
    'PREPARING',
    'READY_FOR_PICKUP',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
  ]),
  totalAmount: z.union([z.number().nonnegative(), z.string().regex(/^\d+(\.\d+)?$/)]),
  deliveryType: z.enum(['DELIVERY', 'PICKUP']),
  deliveryAddress: z.unknown().nullable(),
  notes: z.string().nullable(),
  items: z.array(
    z.object({
      id: z.string().uuid(),
      productId: z.string().uuid().nullable(),
      drugName: z.string(),
      quantity: z.number().int().positive(),
      unitPrice: z.union([z.number().nonnegative(), z.string().regex(/^\d+(\.\d+)?$/)]),
      subtotal: z.union([z.number().nonnegative(), z.string().regex(/^\d+(\.\d+)?$/)]),
    })
  ),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const CreateOrderSchema = z.object({
  items: z.array(CartItemSchema).min(1),
  prescriptionId: z.string().uuid().optional(),
  deliveryType: z.enum(['DELIVERY', 'PICKUP']).optional(),
  deliveryAddress: z.unknown().optional(),
  notes: z.string().max(2000).optional(),
});

export const PharmacyDirectoryEntrySchema = registry.register(
  'PharmacyDirectoryEntry',
  z.object({
    id: z.string().uuid(),
    pharmacyProfile: z.object({
      pharmacyName: z.string(),
      address: z.unknown().nullable(),
    }),
  })
);

export const PharmacyDirectoryResponse = registry.register(
  'PharmacyDirectoryResponse',
  z.object({
    success: z.boolean(),
    data: z.array(PharmacyDirectoryEntrySchema),
  })
);

export const ProductsListResponse = registry.register(
  'ProductsListResponse',
  z.object({
    success: z.boolean(),
    data: z.object({
      products: z.array(ProductSchema),
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
    }),
  })
);

export const ProductDetailResponse = registry.register(
  'ProductDetailResponse',
  z.object({
    success: z.boolean(),
    data: ProductSchema,
  })
);

export const CategoriesResponse = registry.register(
  'CategoriesResponse',
  z.object({
    success: z.boolean(),
    data: z.array(z.string()),
  })
);

export const OrdersListResponse = registry.register(
  'OrdersListResponse',
  z.object({
    success: z.boolean(),
    data: z.object({
      orders: z.array(PharmacyOrderSchema),
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
    }),
  })
);

export const OrderDetailResponse = registry.register(
  'OrderDetailResponse',
  z.object({
    success: z.boolean(),
    data: PharmacyOrderSchema,
  })
);

export const CreateOrderResponse = registry.register(
  'CreateOrderResponse',
  z.object({
    success: z.boolean(),
    data: PharmacyOrderSchema,
  })
);

registry.registerPath({
  method: 'get',
  path: '/api/pharmacy/products',
  summary: 'Browse pharmacy products',
  parameters: [
    { name: 'search', in: 'query', schema: { type: 'string' } },
    { name: 'limit', in: 'query', schema: { type: 'string' } },
    { name: 'offset', in: 'query', schema: { type: 'string' } },
  ],
  responses: {
    200: {
      description: 'Products list',
      content: { 'application/json': { schema: ProductsListResponse } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/pharmacy/pharmacies',
  summary: 'List active pharmacies available for prescription assignment',
  responses: {
    200: {
      description: 'Active pharmacy directory',
      content: { 'application/json': { schema: PharmacyDirectoryResponse } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/pharmacy/inventory',
  summary: "List the authenticated pharmacist's complete inventory",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 200 } },
    { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0 } },
  ],
  responses: {
    200: {
      description: 'Tenant-scoped inventory including inactive products',
      content: { 'application/json': { schema: ProductsListResponse } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Pharmacist role required' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/pharmacy/inventory/{id}',
  summary: "Get a product from the authenticated pharmacist's inventory",
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
      description: 'Inventory product',
      content: { 'application/json': { schema: ProductDetailResponse } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Product belongs to another pharmacy' },
    404: { description: 'Product not found' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/pharmacy/orders',
  summary: 'List pharmacy orders',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Orders list',
      content: { 'application/json': { schema: OrdersListResponse } },
    },
    401: { description: 'Unauthorized' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/pharmacy/orders',
  summary: 'Create pharmacy order (server-calculated totals)',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: CreateOrderSchema } },
    },
  },
  responses: {
    201: {
      description: 'Order created',
      content: { 'application/json': { schema: CreateOrderResponse } },
    },
    400: { description: 'Validation error' },
    401: { description: 'Unauthorized' },
    409: { description: 'Insufficient stock' },
  },
});

// Type exports
export type ProductSchema = z.infer<typeof ProductSchema>;
