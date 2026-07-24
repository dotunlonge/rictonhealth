import { z } from 'zod';
export declare const RewardsBalanceResponseSchema: z.ZodObject<{
    userId: z.ZodString;
    balance: z.ZodNumber;
    tier: z.ZodEnum<["BRONZE", "SILVER", "GOLD", "PLATINUM"]>;
    nextTierPoints: z.ZodOptional<z.ZodNumber>;
    pointsToNextTier: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    balance: number;
    tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
    nextTierPoints?: number | undefined;
    pointsToNextTier?: number | undefined;
}, {
    userId: string;
    balance: number;
    tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
    nextTierPoints?: number | undefined;
    pointsToNextTier?: number | undefined;
}>;
export declare const RewardEarningSchema: z.ZodObject<{
    id: z.ZodString;
    points: z.ZodNumber;
    source: z.ZodEnum<["APPOINTMENT", "PRESCRIPTION", "PHARMACY_ORDER", "REFERRAL", "SIGNUP", "PROMOTION"]>;
    description: z.ZodString;
    referenceId: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    description: string;
    id: string;
    createdAt: string;
    points: number;
    source: "APPOINTMENT" | "PRESCRIPTION" | "PHARMACY_ORDER" | "REFERRAL" | "SIGNUP" | "PROMOTION";
    referenceId: string | null;
}, {
    description: string;
    id: string;
    createdAt: string;
    points: number;
    source: "APPOINTMENT" | "PRESCRIPTION" | "PHARMACY_ORDER" | "REFERRAL" | "SIGNUP" | "PROMOTION";
    referenceId: string | null;
}>;
export declare const RewardRedemptionSchema: z.ZodObject<{
    id: z.ZodString;
    pointsUsed: z.ZodNumber;
    reward: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        pointsCost: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        description: string;
        name: string;
        id: string;
        pointsCost: number;
    }, {
        description: string;
        name: string;
        id: string;
        pointsCost: number;
    }>;
    status: z.ZodEnum<["PENDING", "PROCESSING", "DELIVERED", "REDEEMED", "CANCELLED"]>;
    deliveredAt: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "PENDING" | "CANCELLED" | "PROCESSING" | "DELIVERED" | "REDEEMED";
    id: string;
    createdAt: string;
    deliveredAt: string | null;
    pointsUsed: number;
    reward: {
        description: string;
        name: string;
        id: string;
        pointsCost: number;
    };
}, {
    status: "PENDING" | "CANCELLED" | "PROCESSING" | "DELIVERED" | "REDEEMED";
    id: string;
    createdAt: string;
    deliveredAt: string | null;
    pointsUsed: number;
    reward: {
        description: string;
        name: string;
        id: string;
        pointsCost: number;
    };
}>;
export declare const RewardCatalogItemSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    pointsCost: z.ZodNumber;
    category: z.ZodString;
    imageUrl: z.ZodNullable<z.ZodString>;
    stock: z.ZodNumber;
    isActive: z.ZodBoolean;
    tierRequired: z.ZodNullable<z.ZodEnum<["BRONZE", "SILVER", "GOLD", "PLATINUM"]>>;
}, "strip", z.ZodTypeAny, {
    description: string;
    name: string;
    id: string;
    isActive: boolean;
    category: string;
    imageUrl: string | null;
    stock: number;
    pointsCost: number;
    tierRequired: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | null;
}, {
    description: string;
    name: string;
    id: string;
    isActive: boolean;
    category: string;
    imageUrl: string | null;
    stock: number;
    pointsCost: number;
    tierRequired: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | null;
}>;
export declare const LoyaltyTierSchema: z.ZodObject<{
    name: z.ZodEnum<["BRONZE", "SILVER", "GOLD", "PLATINUM"]>;
    minPoints: z.ZodNumber;
    benefits: z.ZodArray<z.ZodString, "many">;
    multiplier: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    name: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
    minPoints: number;
    benefits: string[];
    multiplier: number;
}, {
    name: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
    minPoints: number;
    benefits: string[];
    multiplier: number;
}>;
export declare const RewardsBalanceResponse: z.ZodObject<{
    userId: z.ZodString;
    balance: z.ZodNumber;
    tier: z.ZodEnum<["BRONZE", "SILVER", "GOLD", "PLATINUM"]>;
    nextTierPoints: z.ZodOptional<z.ZodNumber>;
    pointsToNextTier: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    balance: number;
    tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
    nextTierPoints?: number | undefined;
    pointsToNextTier?: number | undefined;
}, {
    userId: string;
    balance: number;
    tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
    nextTierPoints?: number | undefined;
    pointsToNextTier?: number | undefined;
}>;
export declare const RewardsEarningsListResponse: z.ZodObject<{
    earnings: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        points: z.ZodNumber;
        source: z.ZodEnum<["APPOINTMENT", "PRESCRIPTION", "PHARMACY_ORDER", "REFERRAL", "SIGNUP", "PROMOTION"]>;
        description: z.ZodString;
        referenceId: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        description: string;
        id: string;
        createdAt: string;
        points: number;
        source: "APPOINTMENT" | "PRESCRIPTION" | "PHARMACY_ORDER" | "REFERRAL" | "SIGNUP" | "PROMOTION";
        referenceId: string | null;
    }, {
        description: string;
        id: string;
        createdAt: string;
        points: number;
        source: "APPOINTMENT" | "PRESCRIPTION" | "PHARMACY_ORDER" | "REFERRAL" | "SIGNUP" | "PROMOTION";
        referenceId: string | null;
    }>, "many">;
    meta: z.ZodObject<{
        total: z.ZodNumber;
        page: z.ZodNumber;
        limit: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        total: number;
        page: number;
    }, {
        limit: number;
        total: number;
        page: number;
    }>;
}, "strip", z.ZodTypeAny, {
    meta: {
        limit: number;
        total: number;
        page: number;
    };
    earnings: {
        description: string;
        id: string;
        createdAt: string;
        points: number;
        source: "APPOINTMENT" | "PRESCRIPTION" | "PHARMACY_ORDER" | "REFERRAL" | "SIGNUP" | "PROMOTION";
        referenceId: string | null;
    }[];
}, {
    meta: {
        limit: number;
        total: number;
        page: number;
    };
    earnings: {
        description: string;
        id: string;
        createdAt: string;
        points: number;
        source: "APPOINTMENT" | "PRESCRIPTION" | "PHARMACY_ORDER" | "REFERRAL" | "SIGNUP" | "PROMOTION";
        referenceId: string | null;
    }[];
}>;
export declare const RewardsRedemptionsListResponse: z.ZodObject<{
    redemptions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        pointsUsed: z.ZodNumber;
        reward: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodString;
            pointsCost: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            description: string;
            name: string;
            id: string;
            pointsCost: number;
        }, {
            description: string;
            name: string;
            id: string;
            pointsCost: number;
        }>;
        status: z.ZodEnum<["PENDING", "PROCESSING", "DELIVERED", "REDEEMED", "CANCELLED"]>;
        deliveredAt: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: "PENDING" | "CANCELLED" | "PROCESSING" | "DELIVERED" | "REDEEMED";
        id: string;
        createdAt: string;
        deliveredAt: string | null;
        pointsUsed: number;
        reward: {
            description: string;
            name: string;
            id: string;
            pointsCost: number;
        };
    }, {
        status: "PENDING" | "CANCELLED" | "PROCESSING" | "DELIVERED" | "REDEEMED";
        id: string;
        createdAt: string;
        deliveredAt: string | null;
        pointsUsed: number;
        reward: {
            description: string;
            name: string;
            id: string;
            pointsCost: number;
        };
    }>, "many">;
    meta: z.ZodObject<{
        total: z.ZodNumber;
        page: z.ZodNumber;
        limit: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        total: number;
        page: number;
    }, {
        limit: number;
        total: number;
        page: number;
    }>;
}, "strip", z.ZodTypeAny, {
    meta: {
        limit: number;
        total: number;
        page: number;
    };
    redemptions: {
        status: "PENDING" | "CANCELLED" | "PROCESSING" | "DELIVERED" | "REDEEMED";
        id: string;
        createdAt: string;
        deliveredAt: string | null;
        pointsUsed: number;
        reward: {
            description: string;
            name: string;
            id: string;
            pointsCost: number;
        };
    }[];
}, {
    meta: {
        limit: number;
        total: number;
        page: number;
    };
    redemptions: {
        status: "PENDING" | "CANCELLED" | "PROCESSING" | "DELIVERED" | "REDEEMED";
        id: string;
        createdAt: string;
        deliveredAt: string | null;
        pointsUsed: number;
        reward: {
            description: string;
            name: string;
            id: string;
            pointsCost: number;
        };
    }[];
}>;
export declare const RedeemRewardRequestSchema: z.ZodObject<{
    rewardId: z.ZodString;
    shippingAddress: z.ZodOptional<z.ZodObject<{
        street: z.ZodString;
        city: z.ZodString;
        state: z.ZodString;
        country: z.ZodString;
        postalCode: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        city: string;
        state: string;
        country: string;
        postalCode: string;
        street: string;
    }, {
        city: string;
        state: string;
        country: string;
        postalCode: string;
        street: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    rewardId: string;
    shippingAddress?: {
        city: string;
        state: string;
        country: string;
        postalCode: string;
        street: string;
    } | undefined;
}, {
    rewardId: string;
    shippingAddress?: {
        city: string;
        state: string;
        country: string;
        postalCode: string;
        street: string;
    } | undefined;
}>;
export declare const RedeemRewardResponse: z.ZodObject<{
    redemption: z.ZodObject<{
        id: z.ZodString;
        pointsUsed: z.ZodNumber;
        reward: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodString;
            pointsCost: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            description: string;
            name: string;
            id: string;
            pointsCost: number;
        }, {
            description: string;
            name: string;
            id: string;
            pointsCost: number;
        }>;
        status: z.ZodEnum<["PENDING", "PROCESSING", "DELIVERED", "REDEEMED", "CANCELLED"]>;
        deliveredAt: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: "PENDING" | "CANCELLED" | "PROCESSING" | "DELIVERED" | "REDEEMED";
        id: string;
        createdAt: string;
        deliveredAt: string | null;
        pointsUsed: number;
        reward: {
            description: string;
            name: string;
            id: string;
            pointsCost: number;
        };
    }, {
        status: "PENDING" | "CANCELLED" | "PROCESSING" | "DELIVERED" | "REDEEMED";
        id: string;
        createdAt: string;
        deliveredAt: string | null;
        pointsUsed: number;
        reward: {
            description: string;
            name: string;
            id: string;
            pointsCost: number;
        };
    }>;
    newBalance: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    redemption: {
        status: "PENDING" | "CANCELLED" | "PROCESSING" | "DELIVERED" | "REDEEMED";
        id: string;
        createdAt: string;
        deliveredAt: string | null;
        pointsUsed: number;
        reward: {
            description: string;
            name: string;
            id: string;
            pointsCost: number;
        };
    };
    newBalance: number;
}, {
    redemption: {
        status: "PENDING" | "CANCELLED" | "PROCESSING" | "DELIVERED" | "REDEEMED";
        id: string;
        createdAt: string;
        deliveredAt: string | null;
        pointsUsed: number;
        reward: {
            description: string;
            name: string;
            id: string;
            pointsCost: number;
        };
    };
    newBalance: number;
}>;
export declare const RewardsCatalogResponse: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        pointsCost: z.ZodNumber;
        category: z.ZodString;
        imageUrl: z.ZodNullable<z.ZodString>;
        stock: z.ZodNumber;
        isActive: z.ZodBoolean;
        tierRequired: z.ZodNullable<z.ZodEnum<["BRONZE", "SILVER", "GOLD", "PLATINUM"]>>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        name: string;
        id: string;
        isActive: boolean;
        category: string;
        imageUrl: string | null;
        stock: number;
        pointsCost: number;
        tierRequired: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | null;
    }, {
        description: string;
        name: string;
        id: string;
        isActive: boolean;
        category: string;
        imageUrl: string | null;
        stock: number;
        pointsCost: number;
        tierRequired: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | null;
    }>, "many">;
    categories: z.ZodArray<z.ZodString, "many">;
    meta: z.ZodObject<{
        total: z.ZodNumber;
        page: z.ZodNumber;
        limit: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        total: number;
        page: number;
    }, {
        limit: number;
        total: number;
        page: number;
    }>;
}, "strip", z.ZodTypeAny, {
    meta: {
        limit: number;
        total: number;
        page: number;
    };
    items: {
        description: string;
        name: string;
        id: string;
        isActive: boolean;
        category: string;
        imageUrl: string | null;
        stock: number;
        pointsCost: number;
        tierRequired: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | null;
    }[];
    categories: string[];
}, {
    meta: {
        limit: number;
        total: number;
        page: number;
    };
    items: {
        description: string;
        name: string;
        id: string;
        isActive: boolean;
        category: string;
        imageUrl: string | null;
        stock: number;
        pointsCost: number;
        tierRequired: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | null;
    }[];
    categories: string[];
}>;
export declare const LoyaltyTiersResponse: z.ZodObject<{
    tiers: z.ZodArray<z.ZodObject<{
        name: z.ZodEnum<["BRONZE", "SILVER", "GOLD", "PLATINUM"]>;
        minPoints: z.ZodNumber;
        benefits: z.ZodArray<z.ZodString, "many">;
        multiplier: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
        minPoints: number;
        benefits: string[];
        multiplier: number;
    }, {
        name: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
        minPoints: number;
        benefits: string[];
        multiplier: number;
    }>, "many">;
    userTier: z.ZodEnum<["BRONZE", "SILVER", "GOLD", "PLATINUM"]>;
}, "strip", z.ZodTypeAny, {
    tiers: {
        name: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
        minPoints: number;
        benefits: string[];
        multiplier: number;
    }[];
    userTier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
}, {
    tiers: {
        name: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
        minPoints: number;
        benefits: string[];
        multiplier: number;
    }[];
    userTier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
}>;
export declare const EarnPointsRequestSchema: z.ZodObject<{
    userId: z.ZodString;
    source: z.ZodEnum<["APPOINTMENT", "PRESCRIPTION", "PHARMACY_ORDER", "REFERRAL", "SIGNUP", "PROMOTION"]>;
    referenceId: z.ZodString;
    basePoints: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    userId: string;
    source: "APPOINTMENT" | "PRESCRIPTION" | "PHARMACY_ORDER" | "REFERRAL" | "SIGNUP" | "PROMOTION";
    referenceId: string;
    basePoints: number;
}, {
    userId: string;
    source: "APPOINTMENT" | "PRESCRIPTION" | "PHARMACY_ORDER" | "REFERRAL" | "SIGNUP" | "PROMOTION";
    referenceId: string;
    basePoints: number;
}>;
export type RewardsBalanceResponseSchema = z.infer<typeof RewardsBalanceResponseSchema>;
export type RewardEarningSchema = z.infer<typeof RewardEarningSchema>;
export type RewardRedemptionSchema = z.infer<typeof RewardRedemptionSchema>;
export type RewardCatalogItemSchema = z.infer<typeof RewardCatalogItemSchema>;
export type LoyaltyTierSchema = z.infer<typeof LoyaltyTierSchema>;
export type RedeemRewardRequestSchema = z.infer<typeof RedeemRewardRequestSchema>;
export type EarnPointsRequestSchema = z.infer<typeof EarnPointsRequestSchema>;
