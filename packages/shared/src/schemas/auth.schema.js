"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerifyConfirmInputSchema = exports.VerifyPhoneInputSchema = exports.VerifyEmailInputSchema = exports.AuthResponseSchema = exports.PasswordResetInputSchema = exports.RefreshTokenInputSchema = exports.OAuthInputSchema = exports.VerifyOtpInputSchema = exports.SendOtpInputSchema = exports.LoginInputSchema = exports.RegisterInputSchema = void 0;
const zod_1 = require("./zod");
const openapi_registry_1 = require("./openapi.registry");
exports.RegisterInputSchema = openapi_registry_1.registry.register('RegisterInput', zod_1.z
    .object({
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    password: zod_1.z
        .string()
        .min(8)
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),
    role: zod_1.z.enum(['PATIENT', 'CONSULTANT', 'PHARMACIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']),
    firstName: zod_1.z.string().optional(),
    lastName: zod_1.z.string().optional(),
    consentVersion: zod_1.z.string().min(1, 'consentVersion is required'),
})
    .refine((data) => data.email || data.phone, {
    message: 'Either email or phone is required',
    path: ['email'],
}));
exports.LoginInputSchema = openapi_registry_1.registry.register('LoginInput', zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    password: zod_1.z.string(),
}));
exports.SendOtpInputSchema = openapi_registry_1.registry.register('SendOtpInput', zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
}));
exports.VerifyOtpInputSchema = openapi_registry_1.registry.register('VerifyOtpInput', zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    otp: zod_1.z.string().length(6),
}));
exports.OAuthInputSchema = openapi_registry_1.registry.register('OAuthInput', zod_1.z.object({
    token: zod_1.z.string(),
    role: zod_1.z.enum(['PATIENT', 'CONSULTANT']).optional(),
}));
exports.RefreshTokenInputSchema = openapi_registry_1.registry.register('RefreshTokenInput', zod_1.z.object({
    refreshToken: zod_1.z.string(),
}));
exports.PasswordResetInputSchema = openapi_registry_1.registry.register('PasswordResetInput', zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    otp: zod_1.z.string().length(6),
    newPassword: zod_1.z
        .string()
        .min(8)
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),
}));
exports.AuthResponseSchema = openapi_registry_1.registry.register('AuthResponse', zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.object({
        token: zod_1.z.string(),
        refreshToken: zod_1.z.string().optional(),
        user: zod_1.z.object({
            id: zod_1.z.string().uuid(),
            email: zod_1.z.string().nullable(),
            phone: zod_1.z.string().nullable(),
            role: zod_1.z.string(),
            status: zod_1.z.string(),
        }),
    }),
}));
// Register Path
openapi_registry_1.registry.registerPath({
    method: 'post',
    path: '/api/auth/register',
    summary: 'Register a new user',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: exports.RegisterInputSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: 'User registered successfully',
        },
        400: {
            description: 'Validation Error',
        },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'post',
    path: '/api/auth/login',
    summary: 'Login a user',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: exports.LoginInputSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'User logged in successfully',
            content: {
                'application/json': {
                    schema: exports.AuthResponseSchema,
                },
            },
        },
        401: {
            description: 'Unauthorized',
        },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'post',
    path: '/api/auth/otp/send',
    summary: 'Send OTP to email/phone',
    request: {
        body: {
            content: {
                'application/json': { schema: exports.SendOtpInputSchema },
            },
        },
    },
    responses: {
        200: { description: 'OTP Sent' },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'post',
    path: '/api/auth/otp/verify',
    summary: 'Verify OTP and get JWT',
    request: {
        body: {
            content: {
                'application/json': { schema: exports.VerifyOtpInputSchema },
            },
        },
    },
    responses: {
        200: {
            description: 'OTP Verified',
            content: { 'application/json': { schema: exports.AuthResponseSchema } },
        },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'post',
    path: '/api/auth/oauth/google',
    summary: 'Login/Register via Google',
    request: {
        body: {
            content: {
                'application/json': { schema: exports.OAuthInputSchema },
            },
        },
    },
    responses: {
        200: {
            description: 'Google Login Successful',
            content: { 'application/json': { schema: exports.AuthResponseSchema } },
        },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'post',
    path: '/api/auth/oauth/apple',
    summary: 'Login/Register via Apple',
    request: {
        body: {
            content: {
                'application/json': { schema: exports.OAuthInputSchema },
            },
        },
    },
    responses: {
        200: {
            description: 'Apple Login Successful',
            content: { 'application/json': { schema: exports.AuthResponseSchema } },
        },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'post',
    path: '/api/auth/refresh',
    summary: 'Refresh access token',
    request: {
        body: {
            content: { 'application/json': { schema: exports.RefreshTokenInputSchema } },
        },
    },
    responses: {
        200: {
            description: 'Token refreshed',
            content: { 'application/json': { schema: exports.AuthResponseSchema } },
        },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'post',
    path: '/api/auth/logout',
    summary: 'Logout and invalidate refresh token',
    request: {
        body: {
            content: { 'application/json': { schema: exports.RefreshTokenInputSchema } },
        },
    },
    responses: {
        200: { description: 'Logged out successfully' },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'post',
    path: '/api/auth/password/forgot',
    summary: 'Send password reset OTP',
    request: {
        body: {
            content: { 'application/json': { schema: exports.SendOtpInputSchema } },
        },
    },
    responses: {
        200: { description: 'OTP Sent' },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'post',
    path: '/api/auth/password/reset',
    summary: 'Verify OTP and reset password',
    request: {
        body: {
            content: { 'application/json': { schema: exports.PasswordResetInputSchema } },
        },
    },
    responses: {
        200: { description: 'Password reset successful' },
    },
});
exports.VerifyEmailInputSchema = openapi_registry_1.registry.register('VerifyEmailInput', zod_1.z.object({
    email: zod_1.z.string().email(),
}));
exports.VerifyPhoneInputSchema = openapi_registry_1.registry.register('VerifyPhoneInput', zod_1.z.object({
    phone: zod_1.z.string(),
}));
exports.VerifyConfirmInputSchema = openapi_registry_1.registry.register('VerifyConfirmInput', zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    otp: zod_1.z.string().length(6),
}));
openapi_registry_1.registry.registerPath({
    method: 'post',
    path: '/api/auth/verify-email',
    summary: 'Send email verification OTP',
    request: {
        body: {
            content: { 'application/json': { schema: exports.VerifyEmailInputSchema } },
        },
    },
    responses: {
        200: { description: 'Verification OTP sent' },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'post',
    path: '/api/auth/verify-phone',
    summary: 'Send phone verification OTP',
    request: {
        body: {
            content: { 'application/json': { schema: exports.VerifyPhoneInputSchema } },
        },
    },
    responses: {
        200: { description: 'Verification OTP sent' },
    },
});
openapi_registry_1.registry.registerPath({
    method: 'post',
    path: '/api/auth/verify/confirm',
    summary: 'Verify OTP and mark contact as verified',
    request: {
        body: {
            content: { 'application/json': { schema: exports.VerifyConfirmInputSchema } },
        },
    },
    responses: {
        200: { description: 'Contact verified successfully' },
    },
});
//# sourceMappingURL=auth.schema.js.map