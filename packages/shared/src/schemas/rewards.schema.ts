import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const RewardsBalanceResponseSchema = z.object({
  userId: z.string(),
  balance: z.number().int().nonnegative(),
  tier: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']),
  nextTierPoints: z.number().optional(),
  pointsToNextTier: z.number().optional(),
});

export const RewardEarningSchema = z.object({
  id: z.string(),
  points: z.number().int().positive(),
  source: z.enum(['APPOINTMENT', 'PRESCRIPTION', 'PHARMACY_ORDER', 'REFERRAL', 'SIGNUP', 'PROMOTION']),
  description: z.string(),
  referenceId: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const RewardRedemptionSchema = z.object({
  id: z.string(),
  pointsUsed: z.number().int().positive(),
  reward: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    pointsCost: z.number().int().positive(),
  }),
  status: z.enum(['PENDING', 'PROCESSING', 'DELIVERED', 'REDEEMED', 'CANCELLED']),
  deliveredAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const RewardCatalogItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  pointsCost: z.number().int().positive(),
  category: z.string(),
  imageUrl: z.string().url().nullable(),
  stock: z.number().int().nonnegative(),
  isActive: z.boolean(),
  tierRequired: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']).nullable(),
});

export const LoyaltyTierSchema = z.object({
  name: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']),
  minPoints: z.number().int().nonnegative(),
  benefits: z.array(z.string()),
  multiplier: z.number().positive(),
});

// Registry for OpenAPI
import { registry } from './openapi.registry';

export const RewardsBalanceResponse = registry.register(
  'RewardsBalanceResponse',
  RewardsBalanceResponseSchema
);

export const RewardsEarningsListResponse = registry.register(
  'RewardsEarningsListResponse',
  z.object({
    earnings: z.array(RewardEarningSchema),
    meta: z.object({
      total: z.number(),
      page: z.number(),
      limit: z.number(),
    }),
  })
);

export const RewardsRedemptionsListResponse = registry.register(
  'RewardsRedemptionsListResponse',
  z.object({
    redemptions: z.array(RewardRedemptionSchema),
    meta: z.object({
      total: z.number(),
      page: z.number(),
      limit: z.number(),
    }),
  })
);

export const RedeemRewardRequestSchema = registry.register(
  'RedeemRewardRequest',
  z.object({
    rewardId: z.string(),
    shippingAddress: z.object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      country: z.string(),
      postalCode: z.string(),
    }).optional(),
  })
);

export const RedeemRewardResponse = registry.register(
  'RedeemRewardResponse',
  z.object({
    redemption: RewardRedemptionSchema,
    newBalance: z.number().int().nonnegative(),
  })
);

export const RewardsCatalogResponse = registry.register(
  'RewardsCatalogResponse',
  z.object({
    items: z.array(RewardCatalogItemSchema),
    categories: z.array(z.string()),
    meta: z.object({
      total: z.number(),
      page: z.number(),
      limit: z.number(),
    }),
  })
);

export const LoyaltyTiersResponse = registry.register(
  'LoyaltyTiersResponse',
  z.object({
    tiers: z.array(LoyaltyTierSchema),
    userTier: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']),
  })
);

export const EarnPointsRequestSchema = registry.register(
  'EarnPointsRequest',
  z.object({
    userId: z.string(),
    source: z.enum(['APPOINTMENT', 'PRESCRIPTION', 'PHARMACY_ORDER', 'REFERRAL', 'SIGNUP', 'PROMOTION']),
    referenceId: z.string(),
    basePoints: z.number().int().positive(),
  })
);
