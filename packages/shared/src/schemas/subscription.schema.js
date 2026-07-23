"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CancelSubscriptionResponse = exports.UpgradeSubscriptionResponse = exports.SubscriptionDetailResponse = exports.PlansListResponse = exports.UpgradeSubscriptionSchema = exports.SubscriptionSchema = exports.SubscriptionPlanSchema = void 0;
const zod_1 = require("zod");
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
(0, zod_to_openapi_1.extendZodWithOpenApi)(zod_1.z);
exports.SubscriptionPlanSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    code: zod_1.z.enum(['FREE', 'PREMIUM']),
    price: zod_1.z.number().nonnegative(),
    currency: zod_1.z.string(),
    billingPeriod: zod_1.z.string(),
    features: zod_1.z.array(zod_1.z.string()),
    limitations: zod_1.z.array(zod_1.z.string()),
});
exports.SubscriptionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    plan: zod_1.z.enum(['FREE', 'PREMIUM']),
    status: zod_1.z.enum(['ACTIVE', 'CANCELLED', 'EXPIRED', 'PAST_DUE']),
    currentPeriodStart: zod_1.z.string().datetime(),
    currentPeriodEnd: zod_1.z.string().datetime(),
    cancelAtPeriodEnd: zod_1.z.boolean(),
    cancelledAt: zod_1.z.string().datetime().nullable(),
    payment: zod_1.z
        .object({
        amount: zod_1.z.number(),
        providerReference: zod_1.z.string(),
        createdAt: zod_1.z.string().datetime(),
    })
        .nullable(),
    createdAt: zod_1.z.string().datetime(),
});
exports.UpgradeSubscriptionSchema = zod_1.z.object({
    plan: zod_1.z.enum(['PREMIUM']),
    paymentMethod: zod_1.z.enum(['CARD', 'BANK_TRANSFER']).default('CARD'),
});
const openapi_registry_1 = require("./openapi.registry");
exports.PlansListResponse = openapi_registry_1.registry.register('PlansListResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.object({
        plans: zod_1.z.array(exports.SubscriptionPlanSchema),
    }),
}));
exports.SubscriptionDetailResponse = openapi_registry_1.registry.register('SubscriptionDetailResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: exports.SubscriptionSchema,
}));
exports.UpgradeSubscriptionResponse = openapi_registry_1.registry.register('UpgradeSubscriptionResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.object({
        authorizationUrl: zod_1.z.string().url(),
        reference: zod_1.z.string(),
    }),
}));
exports.CancelSubscriptionResponse = openapi_registry_1.registry.register('CancelSubscriptionResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string(),
}));
//# sourceMappingURL=subscription.schema.js.map