import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import {
  validateRequest,
  RegisterInputSchema,
  LoginInputSchema,
  SendOtpInputSchema,
  VerifyOtpInputSchema,
  OAuthInputSchema,
  RefreshTokenInputSchema,
  PasswordResetInputSchema,
  VerifyEmailInputSchema,
  VerifyPhoneInputSchema,
  VerifyConfirmInputSchema,
  ChangePasswordInputSchema,
} from '@ricton/shared';
import { rateLimit } from '@ricton/shared';
import { requireAuth } from '@ricton/auth-middleware';

const router = Router();

// NOTE: rateLimit() itself bypasses under NODE_ENV=test (per-request check),
// so suites stay fast while tests can lift the bypass to verify 429s.
const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: 'auth' });
const otpRateLimit = rateLimit({ windowMs: 60 * 1000, max: 3, keyPrefix: 'otp' });
// #46 2FA throttle: brute-force gate on TOTP verify/setup paths.
const authRate = rateLimit({ windowMs: 60 * 1000, max: 10, keyPrefix: '2fa' });

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *               role:
 *                 type: string
 *                 enum: [PATIENT, CONSULTANT, PHARMACIST]
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or User already exists
 */
router.post(
  '/register',
  authRateLimit,
  validateRequest(RegisterInputSchema),
  authController.register
);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login user and return JWT
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               rememberMe:
 *                 type: boolean
 *                 description: Extend refresh token expiry to 30 days
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authRateLimit, validateRequest(LoginInputSchema), authController.login);

router.post('/otp/send', otpRateLimit, validateRequest(SendOtpInputSchema), authController.sendOtp);
router.post(
  '/otp/verify',
  otpRateLimit,
  validateRequest(VerifyOtpInputSchema),
  authController.verifyOtpCode
);

router.post(
  '/oauth/google',
  authRateLimit,
  validateRequest(OAuthInputSchema),
  authController.oauthGoogle
);
router.post(
  '/oauth/apple',
  authRateLimit,
  validateRequest(OAuthInputSchema),
  authController.oauthApple
);

router.post(
  '/refresh',
  authRateLimit,
  validateRequest(RefreshTokenInputSchema),
  authController.refresh
);
router.post(
  '/logout',
  authRateLimit,
  validateRequest(RefreshTokenInputSchema),
  authController.logout
);

// Session management endpoints (require authentication)
router.post('/logout-all', requireAuth, authController.logoutAll);
router.get('/sessions', requireAuth, authController.getSessions);
router.delete('/sessions/:sessionId', requireAuth, authController.revokeSession);

router.post(
  '/password/forgot',
  otpRateLimit,
  validateRequest(SendOtpInputSchema),
  authController.passwordForgot
);
router.post(
  '/password/reset',
  otpRateLimit,
  validateRequest(PasswordResetInputSchema),
  authController.passwordReset
);

router.post(
  '/verify-email',
  otpRateLimit,
  validateRequest(VerifyEmailInputSchema),
  authController.verifyEmail
);
router.post(
  '/verify-phone',
  otpRateLimit,
  validateRequest(VerifyPhoneInputSchema),
  authController.verifyPhone
);
router.post(
  '/verify/confirm',
  otpRateLimit,
  validateRequest(VerifyConfirmInputSchema),
  authController.verifyContact
);

// 2FA Endpoints
router.get('/2fa/status', requireAuth, authController.get2FAStatus);
router.post('/2fa/setup', requireAuth, authRate, authController.enable2FA);
router.post('/2fa/enable', requireAuth, authRate, authController.enable2FA);
router.post('/2fa/verify', authRate, requireAuth, authController.verify2FA);
router.post('/2fa/disable', requireAuth, authRate, authController.disable2FA);

// Password Change
router.post(
  '/password/change',
  requireAuth,
  validateRequest(ChangePasswordInputSchema),
  authController.changePassword
);

export default router;
