"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EarnPointsRequestSchema = exports.LoyaltyTiersResponse = exports.RewardsCatalogResponse = exports.RedeemRewardResponse = exports.RedeemRewardRequestSchema = exports.RewardsRedemptionsListResponse = exports.RewardsEarningsListResponse = exports.RewardsBalanceResponse = exports.LoyaltyTierSchema = exports.RewardCatalogItemSchema = exports.RewardRedemptionSchema = exports.RewardEarningSchema = exports.RewardsBalanceResponseSchema = void 0;
const zod_1 = require("zod");
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
(0, zod_to_openapi_1.extendZodWithOpenApi)(zod_1.z);
exports.RewardsBalanceResponseSchema = zod_1.z.object({
    userId: zod_1.z.string(),
    balance: zod_1.z.number().int().nonnegative(),
    tier: zod_1.z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']),
    nextTierPoints: zod_1.z.number().optional(),
    pointsToNextTier: zod_1.z.number().optional(),
});
exports.RewardEarningSchema = zod_1.z.object({
    id: zod_1.z.string(),
    points: zod_1.z.number().int().positive(),
    source: zod_1.z.enum([
        'APPOINTMENT',
        'PRESCRIPTION',
        'PHARMACY_ORDER',
        'REFERRAL',
        'SIGNUP',
        'PROMOTION',
    ]),
    description: zod_1.z.string(),
    referenceId: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string().datetime(),
});
exports.RewardRedemptionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    pointsUsed: zod_1.z.number().int().positive(),
    reward: zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        description: zod_1.z.string(),
        pointsCost: zod_1.z.number().int().positive(),
    }),
    status: zod_1.z.enum(['PENDING', 'PROCESSING', 'DELIVERED', 'REDEEMED', 'CANCELLED']),
    deliveredAt: zod_1.z.string().datetime().nullable(),
    createdAt: zod_1.z.string().datetime(),
});
exports.RewardCatalogItemSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    pointsCost: zod_1.z.number().int().positive(),
    category: zod_1.z.string(),
    imageUrl: zod_1.z.string().url().nullable(),
    stock: zod_1.z.number().int().nonnegative(),
    isActive: zod_1.z.boolean(),
    tierRequired: zod_1.z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']).nullable(),
});
exports.LoyaltyTierSchema = zod_1.z.object({
    name: zod_1.z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']),
    minPoints: zod_1.z.number().int().nonnegative(),
    benefits: zod_1.z.array(zod_1.z.string()),
    multiplier: zod_1.z.number().positive(),
});
// Registry for OpenAPI
const openapi_registry_1 = require("./openapi.registry");
exports.RewardsBalanceResponse = openapi_registry_1.registry.register('RewardsBalanceResponse', exports.RewardsBalanceResponseSchema);
exports.RewardsEarningsListResponse = openapi_registry_1.registry.register('RewardsEarningsListResponse', zod_1.z.object({
    earnings: zod_1.z.array(exports.RewardEarningSchema),
    meta: zod_1.z.object({
        total: zod_1.z.number(),
        page: zod_1.z.number(),
        limit: zod_1.z.number(),
    }),
}));
exports.RewardsRedemptionsListResponse = openapi_registry_1.registry.register('RewardsRedemptionsListResponse', zod_1.z.object({
    redemptions: zod_1.z.array(exports.RewardRedemptionSchema),
    meta: zod_1.z.object({
        total: zod_1.z.number(),
        page: zod_1.z.number(),
        limit: zod_1.z.number(),
    }),
}));
exports.RedeemRewardRequestSchema = openapi_registry_1.registry.register('RedeemRewardRequest', zod_1.z.object({
    rewardId: zod_1.z.string(),
    shippingAddress: zod_1.z
        .object({
        street: zod_1.z.string(),
        city: zod_1.z.string(),
        state: zod_1.z.string(),
        country: zod_1.z.string(),
        postalCode: zod_1.z.string(),
    })
        .optional(),
}));
exports.RedeemRewardResponse = openapi_registry_1.registry.register('RedeemRewardResponse', zod_1.z.object({
    redemption: exports.RewardRedemptionSchema,
    newBalance: zod_1.z.number().int().nonnegative(),
}));
exports.RewardsCatalogResponse = openapi_registry_1.registry.register('RewardsCatalogResponse', zod_1.z.object({
    items: zod_1.z.array(exports.RewardCatalogItemSchema),
    categories: zod_1.z.array(zod_1.z.string()),
    meta: zod_1.z.object({
        total: zod_1.z.number(),
        page: zod_1.z.number(),
        limit: zod_1.z.number(),
    }),
}));
exports.LoyaltyTiersResponse = openapi_registry_1.registry.register('LoyaltyTiersResponse', zod_1.z.object({
    tiers: zod_1.z.array(exports.LoyaltyTierSchema),
    userTier: zod_1.z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']),
}));
exports.EarnPointsRequestSchema = openapi_registry_1.registry.register('EarnPointsRequest', zod_1.z.object({
    userId: zod_1.z.string(),
    source: zod_1.z.enum([
        'APPOINTMENT',
        'PRESCRIPTION',
        'PHARMACY_ORDER',
        'REFERRAL',
        'SIGNUP',
        'PROMOTION',
    ]),
    referenceId: zod_1.z.string(),
    basePoints: zod_1.z.number().int().positive(),
}));
//# sourceMappingURL=rewards.schema.js.map