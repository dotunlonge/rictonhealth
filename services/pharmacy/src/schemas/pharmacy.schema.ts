import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number().positive(),
  category: z.string(),
  imageUrl: z.string().url().nullable(),
  stock: z.number().int().nonnegative(),
  isActive: z.boolean(),
  pharmacyId: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export const PharmacyOrderSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  pharmacyId: z.string().uuid(),
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  totalAmount: z.number().positive(),
  deliveryType: z.enum(['HOME_DELIVERY', 'PICKUP']),
  deliveryAddress: z.string().nullable(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive(),
      unitPrice: z.number().positive(),
    })
  ),
  createdAt: z.string().datetime(),
});

export const CartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const CreateOrderSchema = z.object({
  pharmacyId: z.string().uuid(),
  items: z.array(CartItemSchema).min(1),
  deliveryType: z.enum(['HOME_DELIVERY', 'PICKUP']),
  deliveryAddress: z.string().optional(),
});

import { registry } from '@ricton/shared';

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

// Type exports
export type ProductSchema = z.infer<typeof ProductSchema>;
export type PharmacyOrderSchema = z.infer<typeof PharmacyOrderSchema>;
export type CartItemSchema = z.infer<typeof CartItemSchema>;
export type CreateOrderSchema = z.infer<typeof CreateOrderSchema>;
export type ProductsListResponse = z.infer<typeof ProductsListResponse>;
export type ProductDetailResponse = z.infer<typeof ProductDetailResponse>;
export type CategoriesResponse = z.infer<typeof CategoriesResponse>;
export type OrdersListResponse = z.infer<typeof OrdersListResponse>;
export type OrderDetailResponse = z.infer<typeof OrderDetailResponse>;
export type CreateOrderResponse = z.infer<typeof CreateOrderResponse>;
