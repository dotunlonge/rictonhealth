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
} from '@ricton/shared';

const router = Router();

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
 *                 enum: [PATIENT, CONSULTANT, PHARMACIST, HOSPITAL_ADMIN]
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
router.post('/register', validateRequest(RegisterInputSchema), authController.register);

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
 *                 user:
 *                   type: object
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validateRequest(LoginInputSchema), authController.login);

router.post('/otp/send', validateRequest(SendOtpInputSchema), authController.sendOtp);
router.post('/otp/verify', validateRequest(VerifyOtpInputSchema), authController.verifyOtp);

router.post('/oauth/google', validateRequest(OAuthInputSchema), authController.oauthGoogle);
router.post('/oauth/apple', validateRequest(OAuthInputSchema), authController.oauthApple);

router.post('/refresh', validateRequest(RefreshTokenInputSchema), authController.refresh);
router.post('/logout', validateRequest(RefreshTokenInputSchema), authController.logout);
router.post('/password/forgot', validateRequest(SendOtpInputSchema), authController.passwordForgot);
router.post(
  '/password/reset',
  validateRequest(PasswordResetInputSchema),
  authController.passwordReset
);

export default router;
