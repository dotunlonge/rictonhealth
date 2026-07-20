import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const SubscriptionPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.enum(['FREE', 'PREMIUM']),
  price: z.number().nonnegative(),
  currency: z.string(),
  billingPeriod: z.string(),
  features: z.array(z.string()),
  limitations: z.array(z.string()),
});

export const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  plan: z.enum(['FREE', 'PREMIUM']),
  status: z.enum(['ACTIVE', 'CANCELLED', 'EXPIRED', 'PAST_DUE']),
  currentPeriodStart: z.string().datetime(),
  currentPeriodEnd: z.string().datetime(),
  cancelAtPeriodEnd: z.boolean(),
  cancelledAt: z.string().datetime().nullable(),
  payment: z.object({
    amount: z.number(),
    providerReference: z.string(),
    createdAt: z.string().datetime(),
  }).nullable(),
  createdAt: z.string().datetime(),
});

export const UpgradeSubscriptionSchema = z.object({
  plan: z.enum(['PREMIUM']),
  paymentMethod: z.enum(['CARD', 'BANK_TRANSFER']).default('CARD'),
});

import { registry } from './openapi.registry';

export const PlansListResponse = registry.register(
  'PlansListResponse',
  z.object({
    success: z.boolean(),
    data: z.object({
      plans: z.array(SubscriptionPlanSchema),
    }),
  })
);

export const SubscriptionDetailResponse = registry.register(
  'SubscriptionDetailResponse',
  z.object({
    success: z.boolean(),
    data: SubscriptionSchema,
  })
);

export const UpgradeSubscriptionResponse = registry.register(
  'UpgradeSubscriptionResponse',
  z.object({
    success: z.boolean(),
    data: z.object({
      authorizationUrl: z.string().url(),
      reference: z.string(),
    }),
  })
);

export const CancelSubscriptionResponse = registry.register(
  'CancelSubscriptionResponse',
  z.object({
    success: z.boolean(),
    message: z.string(),
  })
);
