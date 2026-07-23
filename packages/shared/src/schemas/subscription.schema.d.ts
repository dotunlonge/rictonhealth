import { z } from 'zod';
export declare const SubscriptionPlanSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    code: z.ZodEnum<["FREE", "PREMIUM"]>;
    price: z.ZodNumber;
    currency: z.ZodString;
    billingPeriod: z.ZodString;
    features: z.ZodArray<z.ZodString, "many">;
    limitations: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    code: "FREE" | "PREMIUM";
    name: string;
    id: string;
    price: number;
    currency: string;
    billingPeriod: string;
    features: string[];
    limitations: string[];
}, {
    code: "FREE" | "PREMIUM";
    name: string;
    id: string;
    price: number;
    currency: string;
    billingPeriod: string;
    features: string[];
    limitations: string[];
}>;
export declare const SubscriptionSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    plan: z.ZodEnum<["FREE", "PREMIUM"]>;
    status: z.ZodEnum<["ACTIVE", "CANCELLED", "EXPIRED", "PAST_DUE"]>;
    currentPeriodStart: z.ZodString;
    currentPeriodEnd: z.ZodString;
    cancelAtPeriodEnd: z.ZodBoolean;
    cancelledAt: z.ZodNullable<z.ZodString>;
    payment: z.ZodNullable<z.ZodObject<{
        amount: z.ZodNumber;
        providerReference: z.ZodString;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        createdAt: string;
        amount: number;
        providerReference: string;
    }, {
        createdAt: string;
        amount: number;
        providerReference: string;
    }>>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    payment: {
        createdAt: string;
        amount: number;
        providerReference: string;
    } | null;
    status: "CANCELLED" | "ACTIVE" | "EXPIRED" | "PAST_DUE";
    id: string;
    createdAt: string;
    userId: string;
    plan: "FREE" | "PREMIUM";
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    cancelledAt: string | null;
}, {
    payment: {
        createdAt: string;
        amount: number;
        providerReference: string;
    } | null;
    status: "CANCELLED" | "ACTIVE" | "EXPIRED" | "PAST_DUE";
    id: string;
    createdAt: string;
    userId: string;
    plan: "FREE" | "PREMIUM";
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    cancelledAt: string | null;
}>;
export declare const UpgradeSubscriptionSchema: z.ZodObject<{
    plan: z.ZodEnum<["PREMIUM"]>;
    paymentMethod: z.ZodDefault<z.ZodEnum<["CARD", "BANK_TRANSFER"]>>;
}, "strip", z.ZodTypeAny, {
    plan: "PREMIUM";
    paymentMethod: "CARD" | "BANK_TRANSFER";
}, {
    plan: "PREMIUM";
    paymentMethod?: "CARD" | "BANK_TRANSFER" | undefined;
}>;
export type SubscriptionPlanSchema = z.infer<typeof SubscriptionPlanSchema>;
export type SubscriptionSchema = z.infer<typeof SubscriptionSchema>;
export type UpgradeSubscriptionSchema = z.infer<typeof UpgradeSubscriptionSchema>;
export declare const PlansListResponse: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        plans: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            code: z.ZodEnum<["FREE", "PREMIUM"]>;
            price: z.ZodNumber;
            currency: z.ZodString;
            billingPeriod: z.ZodString;
            features: z.ZodArray<z.ZodString, "many">;
            limitations: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            code: "FREE" | "PREMIUM";
            name: string;
            id: string;
            price: number;
            currency: string;
            billingPeriod: string;
            features: string[];
            limitations: string[];
        }, {
            code: "FREE" | "PREMIUM";
            name: string;
            id: string;
            price: number;
            currency: string;
            billingPeriod: string;
            features: string[];
            limitations: string[];
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        plans: {
            code: "FREE" | "PREMIUM";
            name: string;
            id: string;
            price: number;
            currency: string;
            billingPeriod: string;
            features: string[];
            limitations: string[];
        }[];
    }, {
        plans: {
            code: "FREE" | "PREMIUM";
            name: string;
            id: string;
            price: number;
            currency: string;
            billingPeriod: string;
            features: string[];
            limitations: string[];
        }[];
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        plans: {
            code: "FREE" | "PREMIUM";
            name: string;
            id: string;
            price: number;
            currency: string;
            billingPeriod: string;
            features: string[];
            limitations: string[];
        }[];
    };
}, {
    success: boolean;
    data: {
        plans: {
            code: "FREE" | "PREMIUM";
            name: string;
            id: string;
            price: number;
            currency: string;
            billingPeriod: string;
            features: string[];
            limitations: string[];
        }[];
    };
}>;
export declare const SubscriptionDetailResponse: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        plan: z.ZodEnum<["FREE", "PREMIUM"]>;
        status: z.ZodEnum<["ACTIVE", "CANCELLED", "EXPIRED", "PAST_DUE"]>;
        currentPeriodStart: z.ZodString;
        currentPeriodEnd: z.ZodString;
        cancelAtPeriodEnd: z.ZodBoolean;
        cancelledAt: z.ZodNullable<z.ZodString>;
        payment: z.ZodNullable<z.ZodObject<{
            amount: z.ZodNumber;
            providerReference: z.ZodString;
            createdAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            createdAt: string;
            amount: number;
            providerReference: string;
        }, {
            createdAt: string;
            amount: number;
            providerReference: string;
        }>>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        payment: {
            createdAt: string;
            amount: number;
            providerReference: string;
        } | null;
        status: "CANCELLED" | "ACTIVE" | "EXPIRED" | "PAST_DUE";
        id: string;
        createdAt: string;
        userId: string;
        plan: "FREE" | "PREMIUM";
        currentPeriodStart: string;
        currentPeriodEnd: string;
        cancelAtPeriodEnd: boolean;
        cancelledAt: string | null;
    }, {
        payment: {
            createdAt: string;
            amount: number;
            providerReference: string;
        } | null;
        status: "CANCELLED" | "ACTIVE" | "EXPIRED" | "PAST_DUE";
        id: string;
        createdAt: string;
        userId: string;
        plan: "FREE" | "PREMIUM";
        currentPeriodStart: string;
        currentPeriodEnd: string;
        cancelAtPeriodEnd: boolean;
        cancelledAt: string | null;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        payment: {
            createdAt: string;
            amount: number;
            providerReference: string;
        } | null;
        status: "CANCELLED" | "ACTIVE" | "EXPIRED" | "PAST_DUE";
        id: string;
        createdAt: string;
        userId: string;
        plan: "FREE" | "PREMIUM";
        currentPeriodStart: string;
        currentPeriodEnd: string;
        cancelAtPeriodEnd: boolean;
        cancelledAt: string | null;
    };
}, {
    success: boolean;
    data: {
        payment: {
            createdAt: string;
            amount: number;
            providerReference: string;
        } | null;
        status: "CANCELLED" | "ACTIVE" | "EXPIRED" | "PAST_DUE";
        id: string;
        createdAt: string;
        userId: string;
        plan: "FREE" | "PREMIUM";
        currentPeriodStart: string;
        currentPeriodEnd: string;
        cancelAtPeriodEnd: boolean;
        cancelledAt: string | null;
    };
}>;
export declare const UpgradeSubscriptionResponse: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        authorizationUrl: z.ZodString;
        reference: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        authorizationUrl: string;
        reference: string;
    }, {
        authorizationUrl: string;
        reference: string;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        authorizationUrl: string;
        reference: string;
    };
}, {
    success: boolean;
    data: {
        authorizationUrl: string;
        reference: string;
    };
}>;
export declare const CancelSubscriptionResponse: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    success: boolean;
}, {
    message: string;
    success: boolean;
}>;
