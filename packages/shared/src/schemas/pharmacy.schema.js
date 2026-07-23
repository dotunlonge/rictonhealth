"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateOrderResponse = exports.OrderDetailResponse = exports.OrdersListResponse = exports.CategoriesResponse = exports.ProductDetailResponse = exports.ProductsListResponse = exports.CreateOrderSchema = exports.CartItemSchema = exports.PharmacyOrderSchema = exports.ProductSchema = void 0;
const zod_1 = require("zod");
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
(0, zod_to_openapi_1.extendZodWithOpenApi)(zod_1.z);
const openapi_registry_1 = require("./openapi.registry");
exports.ProductSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    price: zod_1.z.number().positive(),
    category: zod_1.z.string(),
    imageUrl: zod_1.z.string().url().nullable(),
    stock: zod_1.z.number().int().nonnegative(),
    isActive: zod_1.z.boolean(),
    pharmacyId: zod_1.z.string().uuid(),
    createdAt: zod_1.z.string().datetime(),
});
exports.PharmacyOrderSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    pharmacyId: zod_1.z.string().uuid(),
    status: zod_1.z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
    totalAmount: zod_1.z.number().positive(),
    deliveryType: zod_1.z.enum(['HOME_DELIVERY', 'PICKUP']),
    deliveryAddress: zod_1.z.string().nullable(),
    items: zod_1.z.array(zod_1.z.object({
        productId: zod_1.z.string().uuid(),
        quantity: zod_1.z.number().int().positive(),
        unitPrice: zod_1.z.number().positive(),
    })),
    createdAt: zod_1.z.string().datetime(),
});
exports.CartItemSchema = zod_1.z.object({
    productId: zod_1.z.string().uuid(),
    quantity: zod_1.z.number().int().positive(),
});
exports.CreateOrderSchema = zod_1.z.object({
    pharmacyId: zod_1.z.string().uuid(),
    items: zod_1.z.array(exports.CartItemSchema).min(1),
    deliveryType: zod_1.z.enum(['HOME_DELIVERY', 'PICKUP']),
    deliveryAddress: zod_1.z.string().optional(),
});
exports.ProductsListResponse = openapi_registry_1.registry.register('ProductsListResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.object({
        products: zod_1.z.array(exports.ProductSchema),
        total: zod_1.z.number(),
        limit: zod_1.z.number(),
        offset: zod_1.z.number(),
    }),
}));
exports.ProductDetailResponse = openapi_registry_1.registry.register('ProductDetailResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: exports.ProductSchema,
}));
exports.CategoriesResponse = openapi_registry_1.registry.register('CategoriesResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.array(zod_1.z.string()),
}));
exports.OrdersListResponse = openapi_registry_1.registry.register('OrdersListResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.object({
        orders: zod_1.z.array(exports.PharmacyOrderSchema),
        total: zod_1.z.number(),
        limit: zod_1.z.number(),
        offset: zod_1.z.number(),
    }),
}));
exports.OrderDetailResponse = openapi_registry_1.registry.register('OrderDetailResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: exports.PharmacyOrderSchema,
}));
exports.CreateOrderResponse = openapi_registry_1.registry.register('CreateOrderResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: exports.PharmacyOrderSchema,
}));
//# sourceMappingURL=pharmacy.schema.js.map