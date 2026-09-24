import { z } from './zod';
import { registry } from './openapi.registry';

export const WalletResponseSchema = registry.register(
  'WalletResponse',
  z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    currency: z.string(),
    balance: z.number(),
  })
);

export const TopUpInputSchema = registry.register(
  'TopUpInput',
  z.object({
    amount: z.number().positive(),
  })
);

export const TopUpResponseSchema = registry.register(
  'TopUpResponse',
  z.object({
    checkoutUrl: z.string().url(),
    reference: z.string(),
  })
);

export type WalletResponseSchema = z.infer<typeof WalletResponseSchema>;
export type TopUpInputSchema = z.infer<typeof TopUpInputSchema>;
export type TopUpResponseSchema = z.infer<typeof TopUpResponseSchema>;

export const WithdrawInputSchema = registry.register(
  'WithdrawInput',
  z.object({
    amount: z.number().min(100),
    bankCode: z.string().min(1),
    accountNumber: z.string().min(1),
  })
);

export type WithdrawInputSchema = z.infer<typeof WithdrawInputSchema>;

registry.registerPath({
  method: 'get',
  path: '/api/wallets/me',
  summary: 'Get current wallet',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Wallet retrieved successfully',
      content: { 'application/json': { schema: WalletResponseSchema } },
    },
    401: { description: 'Unauthorized' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/wallets/virtual-account',
  summary: 'Create wallet virtual account',
  security: [{ bearerAuth: [] }],
  responses: {
    201: { description: 'Virtual account created' },
    401: { description: 'Unauthorized' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/wallets/topup',
  summary: 'Initialize wallet top-up via provider-hosted checkout',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: TopUpInputSchema } },
    },
  },
  responses: {
    200: {
      description: 'Top-up initialized',
      content: { 'application/json': { schema: TopUpResponseSchema } },
    },
    400: { description: 'Validation error' },
    401: { description: 'Unauthorized' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/wallets/transactions',
  summary: 'List wallet transactions',
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: 'limit', in: 'query', schema: { type: 'string' } },
    { name: 'offset', in: 'query', schema: { type: 'string' } },
  ],
  responses: {
    200: { description: 'Wallet transactions' },
    401: { description: 'Unauthorized' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/wallets/withdraw',
  summary: 'Withdraw wallet funds to a verified bank account',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: WithdrawInputSchema } },
    },
  },
  responses: {
    200: { description: 'Transfer initiated (debited, provider reference returned)' },
    400: { description: 'Validation error' },
    401: { description: 'Unauthorized' },
  },
});
