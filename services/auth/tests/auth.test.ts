process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';
process.env.OTP_SECRET = 'test-otp-secret';
// Dummy provider config: OAuth handlers gate on these being set; the provider
// SDKs themselves are mocked below so no network is touched.
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.APPLE_CLIENT_ID = 'test-apple-client-id';

import request from 'supertest';
import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import authRoutes from '../src/routes/auth.routes';
import { prisma, UserRole, UserStatus } from '@ricton/db';
import { errorResponse, redis, hashOtp } from '@ricton/shared';
import bcrypt from 'bcrypt';
import { clearRedisStore } from '../../../packages/shared/src/__tests__/helpers/redis-mock';
import {
  createUser,
  createRefreshToken,
  createPatientProfile,
  cleanDatabase,
} from '../../../packages/shared/src/__tests__/factories';
import {
  generateTotpSecret,
  generateTotpToken,
  encryptTotpSecret,
} from '../../../packages/shared/src/totp';

jest.mock('../../../packages/shared/src/redis', () => {
  const { createRedisMock } = jest.requireActual(
    '../../../packages/shared/src/__tests__/helpers/redis-mock'
  );
  return { redis: createRedisMock() };
});

jest.mock('@ricton/shared', () => {
  const actual = jest.requireActual('@ricton/shared');
  const { redis } = jest.requireMock('../../../packages/shared/src/redis');
  return {
    ...actual,
    redis,
  };
});

jest.mock('google-auth-library', () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => {
      return {
        verifyIdToken: jest.fn().mockImplementation(async ({ idToken }) => {
          if (idToken === 'valid-google-token') {
            return {
              getPayload: () => ({
                email: 'google-user@example.com',
                sub: 'google-sub-123',
                email_verified: true,
              }),
            };
          }
          if (idToken === 'unverified-google-token') {
            return {
              getPayload: () => ({
                email: 'unverified-google@example.com',
                sub: 'google-sub-unverified',
                email_verified: false,
              }),
            };
          }
          throw new Error('Invalid token signature');
        }),
      };
    }),
  };
});

jest.mock('apple-signin-auth', () => {
  return {
    verifyIdToken: jest.fn().mockImplementation(async (idToken) => {
      if (idToken === 'valid-apple-token') {
        return {
          email: 'apple-user@example.com',
          sub: 'apple-sub-123',
          email_verified: 'true',
        };
      }
      throw new Error('Invalid token signature');
    }),
  };
});

process.env.SENDGRID_API_KEY = 'dummy';
process.env.SENDGRID_FROM_EMAIL = 'dummy@ricton.health';
process.env.TWILIO_ACCOUNT_SID = 'dummy';
process.env.TWILIO_AUTH_TOKEN = 'dummy';
process.env.TWILIO_PHONE_NUMBER = '123456';
process.env.GOOGLE_CLIENT_ID = 'dummy-google-client-id';
process.env.APPLE_CLIENT_ID = 'dummy-apple-client-id';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(
  (
    err: Error & { statusCode?: number; code?: string },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    res.status(err.statusCode || 500).json(errorResponse(err.message, err.code));
  }
);

const REFRESH_SECRET = process.env.REFRESH_SECRET || 'test-refresh-secret';

describe('Auth Controller Integration', () => {
  afterAll(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  beforeEach(async () => {
    await cleanDatabase();
    clearRedisStore();
    // Hermetic OAuth: provider fallbacks must never touch the real network.
    (global.fetch as unknown as jest.Mock) = jest.fn().mockResolvedValue({ ok: false });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new patient successfully', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'patient@example.com',
        password: 'SecureP@ssw0rd1',
        role: 'PATIENT',
        firstName: 'John',
        lastName: 'Doe',
        consentVersion: '1.0',
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('PATIENT');
      expect(res.body.data.status).toBe('PENDING');
    });

    it('should preserve both email and phone when both are supplied', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'both-contacts@example.com',
        phone: '+2348012345999',
        password: 'SecureP@ssw0rd1',
        role: 'PATIENT',
        firstName: 'Both',
        lastName: 'Contacts',
        consentVersion: '1.0',
      });
      expect(res.status).toBe(201);
      const persisted = await prisma.user.findUnique({
        where: { email: 'both-contacts@example.com' },
      });
      expect(persisted?.phone).toBe('+2348012345999');
    });

    it('should register a new consultant successfully', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'doctor@example.com',
        password: 'SecureP@ssw0rd1',
        role: 'CONSULTANT',
        firstName: 'Jane',
        lastName: 'Smith',
        consentVersion: '1.0',
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('CONSULTANT');
    });

    it('should return 409 if email is already taken', async () => {
      await request(app).post('/api/auth/register').send({
        email: 'duplicate@example.com',
        password: 'SecureP@ssw0rd1',
        role: 'PATIENT',
        firstName: 'First',
        lastName: 'Patient',
        consentVersion: '1.0',
      });

      const res = await request(app).post('/api/auth/register').send({
        email: 'duplicate@example.com',
        password: 'SecureP@ssw0rd2',
        role: 'CONSULTANT',
        firstName: 'Second',
        lastName: 'Doctor',
        consentVersion: '1.0',
      });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT_ERROR');
    });

    it('should return 400 with weak password', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'weak@example.com',
        password: 'short',
        role: 'PATIENT',
        firstName: 'Weak',
        lastName: 'Pass',
        consentVersion: '1.0',
      });
      expect(res.status).toBe(400);
    });

    it('should return 400 if consentVersion is missing', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'noconsent@example.com',
        password: 'SecureP@ssw0rd1',
        role: 'PATIENT',
        firstName: 'No',
        lastName: 'Consent',
      });
      expect(res.status).toBe(400);
    });

    it('should reject SUPER_ADMIN registration (negative: privilege escalation)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'wannabe-admin@example.com',
        password: 'SecureP@ssw0rd1',
        role: 'SUPER_ADMIN',
        firstName: 'Mallory',
        lastName: 'Admin',
        consentVersion: '1.0',
      });
      // Schema allowlist (400) and controller guard (403) both refuse; either is a pass.
      expect([400, 403]).toContain(res.status);
      const persisted = await prisma.user.findUnique({
        where: { email: 'wannabe-admin@example.com' },
      });
      expect(persisted).toBeNull();
    });

    it('should reject HOSPITAL_ADMIN registration (negative: privileged role)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'wannabe-hospital@example.com',
        password: 'SecureP@ssw0rd1',
        role: 'HOSPITAL_ADMIN',
        firstName: 'Mallory',
        lastName: 'Hospital',
        consentVersion: '1.0',
      });
      expect([400, 403]).toContain(res.status);
      const persisted = await prisma.user.findUnique({
        where: { email: 'wannabe-hospital@example.com' },
      });
      expect(persisted).toBeNull();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully and return JWT and refresh token', async () => {
      const password = 'SecureP@ssw0rd1';
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const user = await prisma.user.create({
        data: {
          email: 'login@example.com',
          passwordHash,
          role: UserRole.PATIENT,
          status: UserStatus.ACTIVE,
        },
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'login@example.com',
        password,
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe('login@example.com');
      expect(res.body.data.user.role).toBe('PATIENT');

      const refreshKey = `refresh:${user.id}`;
      const stored = await redis.hgetall(refreshKey);
      expect(Object.keys(stored).length).toBeGreaterThan(0);
    });

    it('should return 401 when password is invalid', async () => {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('SecureP@ssw0rd1', salt);
      await prisma.user.create({
        data: {
          email: 'login@example.com',
          passwordHash,
          role: UserRole.PATIENT,
          status: UserStatus.ACTIVE,
        },
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'login@example.com',
        password: 'Wr0ngP@ssw0rd!',
      });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 for non-existent user', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'SecureP@ssw0rd1',
      });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when account is suspended', async () => {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('SecureP@ssw0rd1', salt);
      await prisma.user.create({
        data: {
          email: 'suspended@example.com',
          passwordHash,
          role: UserRole.PATIENT,
          status: UserStatus.SUSPENDED,
        },
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'suspended@example.com',
        password: 'SecureP@ssw0rd1',
      });
      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/disabled/i);
    });
  });

  describe('POST /api/auth/otp/send', () => {
    it('should send OTP successfully for valid email', async () => {
      const res = await request(app).post('/api/auth/otp/send').send({
        email: 'patient@example.com',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Request persists intent; the relay delivers asynchronously.
      const event = await prisma.outboxEvent.findFirst({
        where: { type: 'LOGIN_OTP', recipient: 'patient@example.com' },
      });
      expect(event).toBeDefined();
      expect(event?.status).toBe('PENDING');
      expect(event?.channel).toBe('EMAIL');
      // Hash is published only after the provider accepts the message.
      expect(await redis.get('otp:patient@example.com')).toBeNull();
    });

    it('should return 400 if email and phone are missing', async () => {
      const res = await request(app).post('/api/auth/otp/send').send({});
      expect(res.status).toBe(400);
    });

    it('should return 400 if both email and phone are supplied', async () => {
      const res = await request(app).post('/api/auth/otp/send').send({
        email: 'ambiguous@example.com',
        phone: '+2348012345678',
      });
      expect(res.status).toBe(400);
    });

    it('should return 429 when rate limit is exceeded', async () => {
      // The limiter is bypassed under NODE_ENV=test for suite speed; exercise
      // the real mechanism by lifting the bypass for this test only.
      const prevEnv = process.env.NODE_ENV;
      const testServer = app.listen(0);
      testServer.unref();
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
      try {
        for (let i = 0; i < 3; i++) {
          await request(testServer)
            .post('/api/auth/otp/send')
            .send({ email: 'ratelimit@example.com' });
        }
        const res = await request(testServer)
          .post('/api/auth/otp/send')
          .send({ email: 'ratelimit@example.com' });
        expect(res.status).toBe(429);
      } finally {
        (process.env as Record<string, string | undefined>).NODE_ENV = prevEnv;
        testServer.closeAllConnections();
        await new Promise<void>((resolve, reject) => {
          testServer.close((error) => (error ? reject(error) : resolve()));
        });
      }
    });
  });

  describe('POST /api/auth/otp/verify', () => {
    beforeEach(async () => {
      const user = await createUser({ email: 'otpverify@example.com', role: UserRole.PATIENT });
      await createPatientProfile(user, { firstName: 'OTP', lastName: 'User' });
      const otpHash = hashOtp('123456');
      await redis.set(
        `otp:otpverify@example.com`,
        JSON.stringify({ hash: otpHash, attempts: 0 }),
        'EX',
        600
      );
    });

    it('should verify OTP successfully and delete it from Redis', async () => {
      const res = await request(app).post('/api/auth/otp/verify').send({
        email: 'otpverify@example.com',
        otp: '123456',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();

      const stored = await redis.get('otp:otpverify@example.com');
      expect(stored).toBeNull();
    });

    it('should return 401 and increment attempts for incorrect OTP, lock out on 3rd attempt', async () => {
      let res = await request(app).post('/api/auth/otp/verify').send({
        email: 'otpverify@example.com',
        otp: '000000',
      });
      expect(res.status).toBe(401);

      const stored1 = (await redis.get('otp:otpverify@example.com')) as string;
      const parsed1 = JSON.parse(stored1);
      expect(parsed1.attempts).toBe(1);

      res = await request(app).post('/api/auth/otp/verify').send({
        email: 'otpverify@example.com',
        otp: '000000',
      });
      expect(res.status).toBe(401);

      const stored2 = (await redis.get('otp:otpverify@example.com')) as string;
      const parsed2 = JSON.parse(stored2);
      expect(parsed2.attempts).toBe(2);

      res = await request(app).post('/api/auth/otp/verify').send({
        email: 'otpverify@example.com',
        otp: '000000',
      });
      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/too many failed attempts/i);

      const stored3 = await redis.get('otp:otpverify@example.com');
      expect(stored3).toBeNull();
    });

    it('should return 401 if OTP is expired or missing', async () => {
      const res = await request(app).post('/api/auth/otp/verify').send({
        email: 'expired@example.com',
        otp: '123456',
      });
      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/invalid or expired/i);
    });
  });

  describe('POST /api/auth/oauth/google', () => {
    it('should login or register Google user successfully with valid token', async () => {
      const res = await request(app)
        .post('/api/auth/oauth/google')
        .send({ token: 'valid-google-token', role: 'PATIENT' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('google-user@example.com');
      expect(res.body.data.user.role).toBe('PATIENT');

      const user = await prisma.user.findUnique({ where: { email: 'google-user@example.com' } });
      expect(user).toBeDefined();
      expect(user?.oauthProvider).toBe('GOOGLE');
      expect(user?.oauthId).toBe('google-sub-123');
    });

    it('should return 401 if Google token is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/oauth/google')
        .send({ token: 'invalid-token', role: 'PATIENT' });

      expect(res.status).toBe(401);
      // The hermetic provider mock refuses the exchange, so no session is minted.
      expect(await prisma.user.findUnique({ where: { email: 'invalid-token' } })).toBeNull();
    });

    it('should login via a Google OAuth2 access token after tokeninfo binding', async () => {
      (global.fetch as unknown as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            aud: 'dummy-google-client-id',
            azp: 'dummy-google-client-id',
            email: 'popup-user@example.com',
            email_verified: 'true',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            email: 'popup-user@example.com',
            sub: 'google-popup-sub-456',
            verified_email: true,
            given_name: 'Popup',
            family_name: 'User',
            picture: 'https://example.com/avatar.png',
          }),
        });

      const res = await request(app)
        .post('/api/auth/oauth/google')
        .send({ token: 'ya29.popup-access-token', role: 'PATIENT' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('popup-user@example.com');
      expect(res.body.data.user.firstName).toBe('Popup');

      const user = await prisma.user.findUnique({
        where: { email: 'popup-user@example.com' },
      });
      expect(user?.oauthProvider).toBe('GOOGLE');
      expect(user?.oauthId).toBe('google-popup-sub-456');
    });

    it('should return 401 if the access token was issued to another app', async () => {
      (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          aud: 'some-other-app-id',
          azp: 'some-other-app-id',
          email: 'attacker@example.com',
          email_verified: 'true',
        }),
      });

      const res = await request(app)
        .post('/api/auth/oauth/google')
        .send({ token: 'ya29.foreign-access-token', role: 'PATIENT' });

      expect(res.status).toBe(401);
      expect(await prisma.user.findUnique({ where: { email: 'attacker@example.com' } })).toBeNull();
    });

    it('should reject Google identities whose email is not provider-verified', async () => {
      const res = await request(app)
        .post('/api/auth/oauth/google')
        .send({ token: 'unverified-google-token', role: 'PATIENT' });

      expect(res.status).toBe(401);
      expect(
        await prisma.user.findUnique({ where: { email: 'unverified-google@example.com' } })
      ).toBeNull();
    });

    it('should prompt for role selection if Google user is new and role is missing', async () => {
      const res = await request(app)
        .post('/api/auth/oauth/google')
        .send({ token: 'valid-google-token' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.requiresRoleSelection).toBe(true);
      expect(res.body.data.email).toBe('google-user@example.com');
    });
  });

  describe('POST /api/auth/password/change', () => {
    it('should revoke all refresh sessions on password change', async () => {
      await createUser({
        email: 'pwdchange@example.com',
        role: UserRole.PATIENT,
        password: 'OldS3cureP@ss!',
      });
      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'pwdchange@example.com',
        password: 'OldS3cureP@ss!',
      });
      expect(loginRes.status).toBe(200);
      const token = loginRes.body.data.token;
      const refreshToken = loginRes.body.data.refreshToken;

      const changeRes = await request(app)
        .post('/api/auth/password/change')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'OldS3cureP@ss!', newPassword: 'N3wS3cureP@ss!' });
      expect(changeRes.status).toBe(200);

      // The pre-change refresh token must no longer rotate.
      const refreshRes = await request(app).post('/api/auth/refresh').send({ refreshToken });
      expect(refreshRes.status).toBe(401);
    });
  });

  describe('POST /api/auth/2fa/disable', () => {
    let token: string;
    let secret: string;

    beforeEach(async () => {
      await createUser({
        email: 'tfa-user@example.com',
        role: UserRole.PATIENT,
        password: 'SecureP@ssw0rd1',
      });
      secret = generateTotpSecret();
      await prisma.user.update({
        where: { email: 'tfa-user@example.com' },
        data: { twoFactorEnabled: true, twoFactorSecret: encryptTotpSecret(secret) },
      });
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'tfa-user@example.com',
          password: 'SecureP@ssw0rd1',
          totpCode: generateTotpToken(secret),
        });
      expect(loginRes.status).toBe(200);
      token = loginRes.body.data.token;
    });

    it('should refuse to disable 2FA without a current authenticator code', async () => {
      const res = await request(app)
        .post('/api/auth/2fa/disable')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);

      const user = await prisma.user.findUnique({ where: { email: 'tfa-user@example.com' } });
      expect(user?.twoFactorEnabled).toBe(true);
    });

    it('should refuse to disable 2FA with a wrong code', async () => {
      const res = await request(app)
        .post('/api/auth/2fa/disable')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: '000000' });
      expect(res.status).toBe(401);
    });

    it('should disable 2FA with a valid code and clear the secret', async () => {
      const res = await request(app)
        .post('/api/auth/2fa/disable')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: generateTotpToken(secret) });
      expect(res.status).toBe(200);
      expect(res.body.data.twoFactorEnabled).toBe(false);

      const user = await prisma.user.findUnique({ where: { email: 'tfa-user@example.com' } });
      expect(user?.twoFactorEnabled).toBe(false);
      expect(user?.twoFactorSecret).toBeNull();
    });
  });

  describe('POST /api/auth/oauth/apple', () => {
    it('should login or register Apple user successfully with valid token', async () => {
      const res = await request(app)
        .post('/api/auth/oauth/apple')
        .send({ token: 'valid-apple-token', role: 'PATIENT' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('apple-user@example.com');
      expect(res.body.data.user.role).toBe('PATIENT');

      const user = await prisma.user.findUnique({ where: { email: 'apple-user@example.com' } });
      expect(user).toBeDefined();
      expect(user?.oauthProvider).toBe('APPLE');
    });

    it('should return 401 if Apple token is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/oauth/apple')
        .send({ token: 'invalid-token', role: 'PATIENT' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let validRefreshToken: string;
    let userId: string;

    beforeEach(async () => {
      const user = await createUser({ email: 'refresh@example.com', role: UserRole.PATIENT });
      userId = user.id;
      const { refreshToken } = await createRefreshToken(user);
      validRefreshToken = refreshToken;
    });

    it('should refresh token successfully using valid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: validRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(typeof res.body.data.refreshToken).toBe('string');
      expect(res.body.data.refreshToken.split('.')).toHaveLength(3);
      expect(res.body.data.refreshToken).not.toBe(validRefreshToken);

      const refreshKey = `refresh:${userId}`;
      const stored = await redis.smembers(refreshKey);
      expect(stored).toHaveLength(1);
      expect(stored[0]).not.toBe(validRefreshToken);
    });

    it('should return 400 with missing refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({});
      expect(res.status).toBe(400);
    });

    it('should return 401 with invalid signature refresh token format', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.jwt.format' });
      expect(res.status).toBe(401);
    });

    it('should return 401 if refresh token is valid format but not registered in Redis', async () => {
      const unusedToken = jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '7d' });

      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: unusedToken });
      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/invalid or expired/i);
    });

    it('should return 401 if refresh token has been revoked', async () => {
      await prisma.refreshToken.updateMany({
        where: {
          userId,
          tokenHash: crypto.createHash('sha256').update(validRefreshToken).digest('hex'),
        },
        data: { isActive: false, isRevoked: true },
      });

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: validRefreshToken });
      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/invalid or expired/i);
    });

    it('should return 401 if refresh token is expired beyond grace period', async () => {
      const expiredHash = crypto.createHash('sha256').update(validRefreshToken).digest('hex');
      await prisma.refreshToken.update({
        where: { tokenHash: expiredHash },
        data: { expiresAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
      });

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: validRefreshToken });
      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/refresh token expired/i);
    });
  });

  describe('POST /api/auth/logout', () => {
    let validRefreshToken: string;
    let userId: string;

    beforeEach(async () => {
      const user = await createUser({ email: 'logout@example.com', role: UserRole.PATIENT });
      userId = user.id;
      const { refreshToken } = await createRefreshToken(user);
      validRefreshToken = refreshToken;
    });

    it('should logout and remove refresh token from Redis', async () => {
      const beforeCheck = await redis.sismember(`refresh:${userId}`, validRefreshToken);
      expect(beforeCheck).toBe(1);

      const res = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: validRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const afterCheck = await redis.sismember(`refresh:${userId}`, validRefreshToken);
      expect(afterCheck).toBe(0);
    });

    it('should return 401 if refresh token is invalid', async () => {
      const res = await request(app).post('/api/auth/logout').send({ refreshToken: 'invalid' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/password/forgot', () => {
    it('should return 200 and queue reset OTP in the outbox when user exists', async () => {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('oldpassword', salt);
      await prisma.user.create({
        data: {
          email: 'resetflow@example.com',
          passwordHash,
          role: UserRole.PATIENT,
          status: UserStatus.ACTIVE,
        },
      });

      const res = await request(app)
        .post('/api/auth/password/forgot')
        .send({ email: 'resetflow@example.com' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const redisKey = 'reset:resetflow@example.com';
      // The hash reaches Redis only after the relay delivers the message.
      expect(await redis.get(redisKey)).toBeNull();
      const event = await prisma.outboxEvent.findFirst({
        where: { type: 'PASSWORD_RESET_OTP', recipient: 'resetflow@example.com' },
      });
      expect(event).toBeDefined();
      expect(event?.status).toBe('PENDING');
      const payload = event?.payload as unknown as { redisKey: string; otpHash: string };
      expect(payload.redisKey).toBe(redisKey);
      expect(payload.otpHash).toBeDefined();
    });

    it('should fail closed without a configured delivery provider', async () => {
      const previousApiKey = process.env.SENDGRID_API_KEY;
      const previousFrom = process.env.SENDGRID_FROM_EMAIL;
      delete process.env.SENDGRID_API_KEY;
      delete process.env.SENDGRID_FROM_EMAIL;
      try {
        const res = await request(app)
          .post('/api/auth/password/forgot')
          .send({ email: 'nobody@example.com' });
        expect(res.status).toBe(503);
        expect(res.body.error.code).toBe('SERVICE_NOT_CONFIGURED');
      } finally {
        process.env.SENDGRID_API_KEY = previousApiKey;
        process.env.SENDGRID_FROM_EMAIL = previousFrom;
      }
    });
  });

  describe('POST /api/auth/password/reset', () => {
    beforeEach(async () => {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('oldpassword', salt);
      await prisma.user.create({
        data: {
          email: 'resetflow@example.com',
          passwordHash,
          role: UserRole.PATIENT,
          status: UserStatus.ACTIVE,
        },
      });
      const otpHash = hashOtp('654321');
      await redis.set(
        'reset:resetflow@example.com',
        JSON.stringify({ hash: otpHash, attempts: 0 }),
        'EX',
        600
      );
    });

    it('should reset password successfully with valid OTP', async () => {
      const res = await request(app).post('/api/auth/password/reset').send({
        email: 'resetflow@example.com',
        otp: '654321',
        newPassword: 'N3wS3cureP@ss!',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'resetflow@example.com',
        password: 'N3wS3cureP@ss!',
      });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
    });

    it('should return 401 with invalid OTP', async () => {
      const res = await request(app).post('/api/auth/password/reset').send({
        email: 'resetflow@example.com',
        otp: '000000',
        newPassword: 'N3wS3cureP@ss!',
      });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('should send verification code successfully', async () => {
      const user = await createUser({ email: 'verifyemail@example.com', role: UserRole.PATIENT });
      await createPatientProfile(user, { firstName: 'Verify', lastName: 'Email' });

      const res = await request(app).post('/api/auth/verify-email').send({
        email: 'verifyemail@example.com',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/verify/confirm', () => {
    it('activates a pending account and returns a usable session', async () => {
      const user = await createUser({
        email: 'confirmemail@example.com',
        role: UserRole.PATIENT,
        status: UserStatus.PENDING,
      });
      await createPatientProfile(user, { firstName: 'Confirm', lastName: 'Email' });
      await redis.set(
        'verify:confirmemail@example.com',
        JSON.stringify({ hash: hashOtp('123456'), attempts: 0 }),
        'EX',
        600
      );

      const res = await request(app).post('/api/auth/verify/confirm').send({
        email: 'confirmemail@example.com',
        otp: '123456',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toEqual(expect.any(String));
      expect(res.body.data.refreshToken).toEqual(expect.any(String));
      expect(res.body.data.user.status).toBe('ACTIVE');
      const updated = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updated).toMatchObject({ emailVerified: true, status: UserStatus.ACTIVE });
    });
  });

  describe('POST /api/auth/verify-phone', () => {
    it('should return 500 if Twilio is not configured', async () => {
      const originalTwilioSid = process.env.TWILIO_ACCOUNT_SID;
      const originalTwilioToken = process.env.TWILIO_AUTH_TOKEN;
      const originalTwilioPhone = process.env.TWILIO_PHONE_NUMBER;

      try {
        delete process.env.TWILIO_ACCOUNT_SID;
        delete process.env.TWILIO_AUTH_TOKEN;
        delete process.env.TWILIO_PHONE_NUMBER;

        // A user must exist so the request reaches the provider-config branch.
        await createUser({ phone: '+234801234567', role: UserRole.PATIENT });

        const res = await request(app).post('/api/auth/verify-phone').send({
          phone: '+234801234567',
        });

        expect(res.status).toBe(500);
      } finally {
        process.env.TWILIO_ACCOUNT_SID = originalTwilioSid;
        process.env.TWILIO_AUTH_TOKEN = originalTwilioToken;
        process.env.TWILIO_PHONE_NUMBER = originalTwilioPhone;
      }
    });
  });
});
