(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';
process.env.OTP_SECRET = 'test-otp-secret';

import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import authRoutes from '../src/routes/auth.routes';
import { prisma, UserRole, UserStatus } from '@ricton/db';
import { errorResponse } from '@ricton/shared';
import {
  generateTotpSecret,
  generateTotpToken,
  verifyTotpToken,
} from '../../../packages/shared/src/totp';
import { createUser } from '../../../packages/shared/src/__tests__/factories';

jest.mock('@ricton/shared', () => {
  const actual = jest.requireActual('../../../packages/shared/src/index');
  const totp = jest.requireActual('../../../packages/shared/src/totp');
  const { createRedisMock } = jest.requireActual(
    '../../../packages/shared/src/__tests__/helpers/redis-mock'
  );
  return {
    __esModule: true,
    ...actual,
    ...totp,
    redis: createRedisMock(),
  };
});

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(
  (
    err: Error & { statusCode?: number; code?: string },
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    if (err.statusCode !== 401 && err.statusCode !== 400 && err.statusCode !== 404) {
      console.error('[TEST UNHANDLED ERROR]', err);
    }
    res.status(err.statusCode || 500).json(errorResponse(err.message, err.code));
  }
);

describe('Auth Service - Security & TOTP 2FA Verification (TDD)', () => {
  const testPassword = 'Password123!';

  describe('RFC 6238 TOTP Engine Unit Tests', () => {
    it('should generate a valid Base32 TOTP secret (32 characters, A-Z, 2-7)', () => {
      const secret = generateTotpSecret();
      expect(secret).toHaveLength(32);
      expect(secret).toMatch(/^[A-Z2-7]+$/);
    });

    it('should generate matching 6-digit TOTP tokens for the same time window', () => {
      const secret = generateTotpSecret();
      const token = generateTotpToken(secret);
      expect(token).toHaveLength(6);
      expect(token).toMatch(/^\d{6}$/);

      const isValid = verifyTotpToken(token, secret);
      expect(isValid).toBe(true);
    });

    it('should reject invalid, malformed, or arbitrary 6-character strings', () => {
      const secret = generateTotpSecret();
      expect(verifyTotpToken('000000', secret)).toBe(false);
      expect(verifyTotpToken('123456', secret)).toBe(false);
      expect(verifyTotpToken('abcdef', secret)).toBe(false);
      expect(verifyTotpToken('', secret)).toBe(false);
    });

    it('should accept tokens within the ±1 step (30-second) drift window and reject tokens beyond it', () => {
      const secret = generateTotpSecret();
      const nowSec = Math.floor(Date.now() / 1000);
      const pastToken = generateTotpToken(secret, nowSec - 30);
      const futureToken = generateTotpToken(secret, nowSec + 30);
      const expiredToken = generateTotpToken(secret, nowSec - 120);

      expect(verifyTotpToken(pastToken, secret, 1, nowSec)).toBe(true);
      expect(verifyTotpToken(futureToken, secret, 1, nowSec)).toBe(true);
      expect(verifyTotpToken(expiredToken, secret, 1, nowSec)).toBe(false);
    });
  });

  describe('2FA Setup & Verification Endpoints (Integration)', () => {
    it('should setup 2FA and return a valid Base32 secret and QR auth URL', async () => {
      const user = await createUser({
        role: UserRole.PATIENT,
        status: UserStatus.ACTIVE,
        password: testPassword,
        firstName: 'Jane',
        lastName: 'Doe',
      });

      // Login to get token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: testPassword });

      expect(loginRes.status).toBe(200);
      const token = loginRes.body.data.token;

      // #46 step-up: setup requires password re-verification.
      const setupRes = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${token}`)
        .send({ password: testPassword });

      expect(setupRes.status).toBe(200);
      expect(setupRes.body.success).toBe(true);
      expect(setupRes.body.data.secret).toBeDefined();
      expect(setupRes.body.data.secret).toHaveLength(32);
      expect(setupRes.body.data.qrCodeUrl).toContain('otpauth://totp/');
    });

    it('should reject 2FA activation if an invalid TOTP code is provided', async () => {
      const user = await createUser({
        role: UserRole.PATIENT,
        status: UserStatus.ACTIVE,
        password: testPassword,
        firstName: 'Jane',
        lastName: 'Doe',
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: testPassword });
      const token = loginRes.body.data.token;

      // Setup 2FA (#46 step-up: password re-verification required)
      await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${token}`)
        .send({ password: testPassword });

      // Attempt verify with bogus code
      const verifyRes = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: '999999' });

      expect(verifyRes.status).toBe(401);
      expect(verifyRes.body.success).toBe(false);

      // Check DB - twoFactorEnabled should still be false
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser?.twoFactorEnabled).toBe(false);
    });

    it('should successfully enable 2FA when a cryptographically valid TOTP code is provided', async () => {
      const user = await createUser({
        role: UserRole.PATIENT,
        status: UserStatus.ACTIVE,
        password: testPassword,
        firstName: 'Jane',
        lastName: 'Doe',
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: testPassword });
      const token = loginRes.body.data.token;

      // Setup 2FA (#46 step-up: password re-verification required)
      const setupRes = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${token}`)
        .send({ password: testPassword });
      const secret = setupRes.body.data.secret;

      // Generate real valid TOTP code
      const validCode = generateTotpToken(secret);

      const verifyRes = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: validCode });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.twoFactorEnabled).toBe(true);

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser?.twoFactorEnabled).toBe(true);
    });

    it('should require 2FA on login, reject arbitrary 6-digit codes, and accept valid TOTP codes', async () => {
      const secret = generateTotpSecret();
      const user = await createUser({
        role: UserRole.PATIENT,
        status: UserStatus.ACTIVE,
        password: testPassword,
        firstName: 'Jane',
        lastName: 'Doe',
      });

      // Update user with 2FA enabled
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: true, twoFactorSecret: secret },
      });

      // 1. Login without code -> prompts for 2FA
      const promptRes = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: testPassword });
      expect(promptRes.status).toBe(200);
      expect(promptRes.body.data.requires2FA).toBe(true);

      // 2. Login with arbitrary invalid code -> 401 Unauthorized
      const failRes = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: testPassword, totpCode: '000000' });
      expect(failRes.status).toBe(401);
      expect(failRes.body.success).toBe(false);

      // 3. Login with valid TOTP code -> 200 Success with tokens
      const validCode = generateTotpToken(secret);
      const successRes = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: testPassword, totpCode: validCode });
      expect(successRes.status).toBe(200);
      expect(successRes.body.success).toBe(true);
      expect(successRes.body.data.token).toBeDefined();
    });
  });
});
