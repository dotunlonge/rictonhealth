import { z } from './zod';
import { registry } from './openapi.registry';

export const RegisterInputSchema = registry.register(
  'RegisterInput',
  z
    .object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      password: z
        .string()
        .min(8)
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
          'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
        ),
      role: z.enum(['PATIENT', 'CONSULTANT', 'PHARMACIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      consentVersion: z.string().min(1, 'consentVersion is required'),
    })
    .refine((data) => data.email || data.phone, {
      message: 'Either email or phone is required',
      path: ['email'],
    })
);

export const LoginInputSchema = registry.register(
  'LoginInput',
  z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    password: z.string(),
  })
);

export const SendOtpInputSchema = registry.register(
  'SendOtpInput',
  z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
  })
);

export const VerifyOtpInputSchema = registry.register(
  'VerifyOtpInput',
  z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    otp: z.string().length(6),
  })
);

export const OAuthInputSchema = registry.register(
  'OAuthInput',
  z.object({
    token: z.string(),
    role: z.enum(['PATIENT', 'CONSULTANT']).optional(),
  })
);

export const RefreshTokenInputSchema = registry.register(
  'RefreshTokenInput',
  z.object({
    refreshToken: z.string(),
  })
);

export const PasswordResetInputSchema = registry.register(
  'PasswordResetInput',
  z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    otp: z.string().length(6),
    newPassword: z
      .string()
      .min(8)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
      ),
  })
);

export const AuthResponseSchema = registry.register(
  'AuthResponse',
  z.object({
    success: z.boolean(),
    data: z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      user: z.object({
        id: z.string().uuid(),
        email: z.string().nullable(),
        phone: z.string().nullable(),
        role: z.string(),
        status: z.string(),
      }),
    }),
  })
);

// Register Path
registry.registerPath({
  method: 'post',
  path: '/api/auth/register',
  summary: 'Register a new user',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RegisterInputSchema,
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

registry.registerPath({
  method: 'post',
  path: '/api/auth/login',
  summary: 'Login a user',
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginInputSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'User logged in successfully',
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/otp/send',
  summary: 'Send OTP to email/phone',
  request: {
    body: {
      content: {
        'application/json': { schema: SendOtpInputSchema },
      },
    },
  },
  responses: {
    200: { description: 'OTP Sent' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/otp/verify',
  summary: 'Verify OTP and get JWT',
  request: {
    body: {
      content: {
        'application/json': { schema: VerifyOtpInputSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'OTP Verified',
      content: { 'application/json': { schema: AuthResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/oauth/google',
  summary: 'Login/Register via Google',
  request: {
    body: {
      content: {
        'application/json': { schema: OAuthInputSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Google Login Successful',
      content: { 'application/json': { schema: AuthResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/oauth/apple',
  summary: 'Login/Register via Apple',
  request: {
    body: {
      content: {
        'application/json': { schema: OAuthInputSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Apple Login Successful',
      content: { 'application/json': { schema: AuthResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/refresh',
  summary: 'Refresh access token',
  request: {
    body: {
      content: { 'application/json': { schema: RefreshTokenInputSchema } },
    },
  },
  responses: {
    200: {
      description: 'Token refreshed',
      content: { 'application/json': { schema: AuthResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/logout',
  summary: 'Logout and invalidate refresh token',
  request: {
    body: {
      content: { 'application/json': { schema: RefreshTokenInputSchema } },
    },
  },
  responses: {
    200: { description: 'Logged out successfully' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/password/forgot',
  summary: 'Send password reset OTP',
  request: {
    body: {
      content: { 'application/json': { schema: SendOtpInputSchema } },
    },
  },
  responses: {
    200: { description: 'OTP Sent' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/password/reset',
  summary: 'Verify OTP and reset password',
  request: {
    body: {
      content: { 'application/json': { schema: PasswordResetInputSchema } },
    },
  },
  responses: {
    200: { description: 'Password reset successful' },
  },
});

export const VerifyEmailInputSchema = registry.register(
  'VerifyEmailInput',
  z.object({
    email: z.string().email(),
  })
);

export const VerifyPhoneInputSchema = registry.register(
  'VerifyPhoneInput',
  z.object({
    phone: z.string(),
  })
);

export const VerifyConfirmInputSchema = registry.register(
  'VerifyConfirmInput',
  z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    otp: z.string().length(6),
  })
);

registry.registerPath({
  method: 'post',
  path: '/api/auth/verify-email',
  summary: 'Send email verification OTP',
  request: {
    body: {
      content: { 'application/json': { schema: VerifyEmailInputSchema } },
    },
  },
  responses: {
    200: { description: 'Verification OTP sent' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/verify-phone',
  summary: 'Send phone verification OTP',
  request: {
    body: {
      content: { 'application/json': { schema: VerifyPhoneInputSchema } },
    },
  },
  responses: {
    200: { description: 'Verification OTP sent' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/verify/confirm',
  summary: 'Verify OTP and mark contact as verified',
  request: {
    body: {
      content: { 'application/json': { schema: VerifyConfirmInputSchema } },
    },
  },
  responses: {
    200: { description: 'Contact verified successfully' },
  },
});
