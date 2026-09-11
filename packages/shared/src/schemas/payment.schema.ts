import { z } from './zod';
import { registry } from './openapi.registry';

export const PaymentResponseSchema = registry.register(
  'PaymentResponse',
  z.object({
    id: z.string().uuid(),
    reference: z.string(),
    amount: z.number(),
    currency: z.string(),
    status: z.string(),
  })
);

export type PaymentResponseSchema = z.infer<typeof PaymentResponseSchema>;

registry.registerPath({
  method: 'get',
  path: '/api/payments',
  summary: 'List payments',
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Payments list' },
    401: { description: 'Unauthorized' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/payments/verify/{reference}',
  summary: 'Verify payment by provider reference',
  security: [{ bearerAuth: [] }],
  parameters: [{ name: 'reference', in: 'path', required: true, schema: { type: 'string' } }],
  responses: {
    200: { description: 'Payment verification result' },
    401: { description: 'Unauthorized' },
    404: { description: 'Payment not found' },
  },
});
