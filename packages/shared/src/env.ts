import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  JWT_SECRET: z.string().min(1),
  REFRESH_SECRET: z.string().min(1),
  OTP_SECRET: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  PORT_AUTH: z.string().optional().default('3001'),
  PORT_USER: z.string().optional().default('3002'),
  PORT_APPOINTMENT: z.string().optional().default('3003'),
  PORT_PRESCRIPTION: z.string().optional().default('3004'),
  PORT_TELEMEDICINE: z.string().optional().default('3005'),
  PORT_PHARMACY: z.string().optional().default('3006'),
  PORT_PAYMENT: z.string().optional().default('3007'),
  PORT_WALLET: z.string().optional().default('3008'),
  PORT_NOTIFICATION: z.string().optional().default('3009'),
  PORT_ADMIN: z.string().optional().default('3010'),
  PORT_ANALYTICS: z.string().optional().default('3011'),
  PORT_REWARDS: z.string().optional().default('3011'),
  PORT_MESSAGING: z.string().optional().default('3012'),
  PORT_DOCS: z.string().optional().default('3003'),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  AWS_REGION: z.string().optional().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET_NAME: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  DATADOG_API_KEY: z.string().optional(),
  DD_SERVICE: z.string().optional().default('ricton-backend'),
  DD_ENV: z.string().optional().default('development'),
  INTERNAL_API_SECRET: z.string().optional(),
  INTERNAL_NOTIFICATION_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.format());
    throw new Error('Invalid environment configuration');
  }
  return result.data;
}

export const env = validateEnv();
