"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
exports.validateEnv = validateEnv;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: zod_1.z.string().url(),
    REDIS_URL: zod_1.z.string().url().default('redis://localhost:6379'),
    REDIS_PASSWORD: zod_1.z.string().optional(),
    JWT_SECRET: zod_1.z.string().min(1),
    REFRESH_SECRET: zod_1.z.string().min(1),
    OTP_SECRET: zod_1.z.string().optional(),
    ALLOWED_ORIGINS: zod_1.z.string().optional(),
    PORT_AUTH: zod_1.z.string().optional().default('3001'),
    PORT_USER: zod_1.z.string().optional().default('3002'),
    PORT_APPOINTMENT: zod_1.z.string().optional().default('3003'),
    PORT_PRESCRIPTION: zod_1.z.string().optional().default('3004'),
    PORT_TELEMEDICINE: zod_1.z.string().optional().default('3005'),
    PORT_PHARMACY: zod_1.z.string().optional().default('3006'),
    PORT_PAYMENT: zod_1.z.string().optional().default('3007'),
    PORT_WALLET: zod_1.z.string().optional().default('3008'),
    PORT_NOTIFICATION: zod_1.z.string().optional().default('3009'),
    PORT_ADMIN: zod_1.z.string().optional().default('3010'),
    PORT_ANALYTICS: zod_1.z.string().optional().default('3011'),
    PORT_REWARDS: zod_1.z.string().optional().default('3011'),
    PORT_MESSAGING: zod_1.z.string().optional().default('3012'),
    PORT_DOCS: zod_1.z.string().optional().default('3003'),
    PAYSTACK_SECRET_KEY: zod_1.z.string().optional(),
    PAYSTACK_PUBLIC_KEY: zod_1.z.string().optional(),
    TWILIO_ACCOUNT_SID: zod_1.z.string().optional(),
    TWILIO_AUTH_TOKEN: zod_1.z.string().optional(),
    TWILIO_PHONE_NUMBER: zod_1.z.string().optional(),
    SENDGRID_API_KEY: zod_1.z.string().optional(),
    SENDGRID_FROM_EMAIL: zod_1.z.string().email().optional(),
    GOOGLE_CLIENT_ID: zod_1.z.string().optional(),
    APPLE_CLIENT_ID: zod_1.z.string().optional(),
    AWS_REGION: zod_1.z.string().optional().default('us-east-1'),
    AWS_ACCESS_KEY_ID: zod_1.z.string().optional(),
    AWS_SECRET_ACCESS_KEY: zod_1.z.string().optional(),
    AWS_S3_BUCKET_NAME: zod_1.z.string().optional(),
    SENTRY_DSN: zod_1.z.string().optional(),
    DATADOG_API_KEY: zod_1.z.string().optional(),
    DD_SERVICE: zod_1.z.string().optional().default('ricton-backend'),
    DD_ENV: zod_1.z.string().optional().default('development'),
    INTERNAL_API_SECRET: zod_1.z.string().optional(),
    INTERNAL_NOTIFICATION_URL: zod_1.z.string().url().optional(),
});
function validateEnv() {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error('Invalid environment variables:', result.error.format());
        throw new Error('Invalid environment configuration');
    }
    return result.data;
}
exports.env = validateEnv();
//# sourceMappingURL=env.js.map