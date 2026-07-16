process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';
process.env.OTP_SECRET = 'test-otp-secret';
import request from 'supertest';
import express from 'express';
import authRoutes from '../src/routes/auth.routes';
import { prisma, UserStatus } from '@ricton/db';
import { errorResponse, redis } from '@ricton/shared';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock Redis
const redisStore: Record<string, string | Set<string>> = {};
jest.mock('@ricton/shared', () => {
  const actual = jest.requireActual('@ricton/shared');
  return {
    ...actual,
    redis: {
      ping: jest.fn().mockResolvedValue('PONG'),
      get: jest.fn().mockImplementation(async (key: string) => {
        return redisStore[key] || null;
      }),
      set: jest.fn().mockImplementation(async (key: string, val: string, ..._args: unknown[]) => {
        redisStore[key] = val;
        return 'OK';
      }),
      del: jest.fn().mockImplementation(async (key: string) => {
        delete redisStore[key];
        return 1;
      }),
      sadd: jest.fn().mockImplementation(async (key: string, val: string) => {
        if (!redisStore[key]) redisStore[key] = new Set();
        (redisStore[key] as Set<string>).add(val);
        return 1;
      }),
      sismember: jest.fn().mockImplementation(async (key: string, val: string) => {
        if (!redisStore[key]) return 0;
        return (redisStore[key] as Set<string>).has(val) ? 1 : 0;
      }),
      expire: jest.fn().mockResolvedValue(1),
      ttl: jest.fn().mockResolvedValue(600),
      quit: jest.fn().mockResolvedValue('OK'),
    },
  };
});

// Mock Google OAuth
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
              }),
            };
          }
          throw new Error('Invalid token signature');
        }),
      };
    }),
  };
});

// Mock Apple OAuth
jest.mock('apple-signin-auth', () => {
  return {
    verifyIdToken: jest.fn().mockImplementation(async (idToken) => {
      if (idToken === 'valid-apple-token') {
        return {
          email: 'apple-user@example.com',
          sub: 'apple-sub-123',
        };
      }
      throw new Error('Invalid token signature');
    }),
  };
});

// Mock Twilio and Sendgrid
jest.mock('twilio', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue(true),
    },
  }));
});
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue(true),
}));

// Provide dummy env variables so controller doesn't throw on init/config
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

beforeAll(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
  await redis.quit();
});

describe('Auth Controller Integration', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
    for (const key in redisStore) {
      delete redisStore[key];
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new patient successfully', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'patient@example.com',
        password: 'SecureP@ssw0rd1',
        role: 'PATIENT',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('PATIENT');
      expect(res.body.data.status).toBe('PENDING');
    });

    it('should register a new consultant successfully', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'doctor@example.com',
        password: 'SecureP@ssw0rd1',
        role: 'CONSULTANT',
        firstName: 'Jane',
        lastName: 'Smith',
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('CONSULTANT');
    });

    it('should fail if email is already taken', async () => {
      await request(app).post('/api/auth/register').send({
        email: 'duplicate@example.com',
        password: 'SecureP@ssw0rd1',
        role: 'PATIENT',
        firstName: 'First',
        lastName: 'Patient',
      });

      const res = await request(app).post('/api/auth/register').send({
        email: 'duplicate@example.com',
        password: 'SecureP@ssw0rd2',
        role: 'CONSULTANT',
        firstName: 'Second',
        lastName: 'Doctor',
      });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT_ERROR');
    });

    it('should fail with weak password', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'weak@example.com',
        password: 'short',
        role: 'PATIENT',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('SecureP@ssw0rd1', salt);
      await prisma.user.create({
        data: {
          email: 'login@example.com',
          passwordHash,
          role: 'PATIENT',
          status: 'ACTIVE',
        },
      });

      await prisma.user.create({
        data: {
          email: 'suspended@example.com',
          passwordHash,
          role: 'PATIENT',
          status: UserStatus.SUSPENDED,
        },
      });
    });

    it('should login successfully and return JWT', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'login@example.com',
        password: 'SecureP@ssw0rd1',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('login@example.com');
      expect(res.body.data.user.role).toBe('PATIENT');
    });

    it('should fail with incorrect password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'login@example.com',
        password: 'Wr0ngP@ssw0rd!',
      });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should fail for suspended account', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'suspended@example.com',
        password: 'SecureP@ssw0rd1',
      });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toMatch(/disabled/i);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let validRefreshToken: string;
    let userId: string;

    beforeEach(async () => {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('SecureP@ssw0rd1', salt);
      const user = await prisma.user.create({
        data: {
          email: 'refresh@example.com',
          passwordHash,
          role: 'PATIENT',
          status: 'ACTIVE',
        },
      });
      userId = user.id;
      // Generate valid token and put in redis mock
      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'refresh@example.com',
        password: 'SecureP@ssw0rd1',
      });
      validRefreshToken = loginRes.body.data.refreshToken;
    });

    it('should refresh token successfully using valid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: validRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should fail with missing refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({});
      expect(res.status).toBe(400);
    });

    it('should fail with invalid signature/expired refresh token format', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.jwt.format' });
      expect(res.status).toBe(401);
    });

    it('should fail if refresh token is valid format but not registered in Redis mock', async () => {
      const unusedToken = jwt.sign(
        { userId },
        process.env.REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
        { expiresIn: '7d' }
      );

      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: unusedToken });
      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/invalid or expired/i);
    });
  });

  describe('POST /api/auth/logout', () => {
    let validRefreshToken: string;
    let userId: string;

    beforeEach(async () => {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('SecureP@ssw0rd1', salt);
      const user = await prisma.user.create({
        data: {
          email: 'logout@example.com',
          passwordHash,
          role: 'PATIENT',
          status: 'ACTIVE',
        },
      });
      userId = user.id;
      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'logout@example.com',
        password: 'SecureP@ssw0rd1',
      });
      validRefreshToken = loginRes.body.data.refreshToken;
    });

    it('should logout and remove refresh token from redis mock', async () => {
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

    it('should fail logout if refresh token is invalid', async () => {
      const res = await request(app).post('/api/auth/logout').send({ refreshToken: 'invalid' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/otp/send', () => {
    it('should send otp successfully for valid email', async () => {
      const res = await request(app).post('/api/auth/otp/send').send({
        email: 'patient@example.com',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should fail if email and phone missing', async () => {
      const res = await request(app).post('/api/auth/otp/send').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/otp/verify', () => {
    beforeEach(async () => {
      await prisma.user.create({
        data: {
          email: 'otpverify@example.com',
          passwordHash: 'hash',
          role: 'PATIENT',
          status: 'ACTIVE',
        },
      });
      redisStore['otp:otpverify@example.com'] = JSON.stringify({ otp: '123456', attempts: 0 });
    });

    it('should verify OTP successfully and delete it from Redis mock', async () => {
      const res = await request(app).post('/api/auth/otp/verify').send({
        email: 'otpverify@example.com',
        otp: '123456',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();

      const stored = redisStore['otp:otpverify@example.com'];
      expect(stored).toBeUndefined();
    });

    it('should fail and increment attempts for incorrect OTP, lock out on 3rd attempt', async () => {
      let res = await request(app).post('/api/auth/otp/verify').send({
        email: 'otpverify@example.com',
        otp: '000000',
      });
      expect(res.status).toBe(401);
      expect(redisStore['otp:otpverify@example.com']).toBeDefined();
      let attempts = JSON.parse(redisStore['otp:otpverify@example.com'] as string).attempts;
      expect(attempts).toBe(1);

      res = await request(app).post('/api/auth/otp/verify').send({
        email: 'otpverify@example.com',
        otp: '000000',
      });
      expect(res.status).toBe(401);
      attempts = JSON.parse(redisStore['otp:otpverify@example.com'] as string).attempts;
      expect(attempts).toBe(2);

      res = await request(app).post('/api/auth/otp/verify').send({
        email: 'otpverify@example.com',
        otp: '000000',
      });
      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/too many failed attempts/i);
      expect(redisStore['otp:otpverify@example.com']).toBeUndefined();
    });

    it('should fail verify if OTP is expired/missing in Redis mock', async () => {
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

    it('should fail if google token is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/oauth/google')
        .send({ token: 'invalid-token', role: 'PATIENT' });

      expect(res.status).toBe(401);
    });

    it('should fail if Google user is new and role is missing', async () => {
      const res = await request(app)
        .post('/api/auth/oauth/google')
        .send({ token: 'valid-google-token' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/role is required/i);
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

    it('should fail if apple token is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/oauth/apple')
        .send({ token: 'invalid-token', role: 'PATIENT' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/password/forgot & /api/auth/password/reset', () => {
    beforeEach(async () => {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('oldpassword', salt);
      await prisma.user.create({
        data: { email: 'resetflow@example.com', passwordHash, role: 'PATIENT', status: 'ACTIVE' },
      });
    });

    it('should complete the entire forgot-verify-reset password flow successfully', async () => {
      const forgotRes = await request(app)
        .post('/api/auth/password/forgot')
        .send({ email: 'resetflow@example.com' });
      expect(forgotRes.status).toBe(200);

      const redisKey = 'reset:resetflow@example.com';
      expect(redisStore[redisKey]).toBeDefined();
      const { otp } = JSON.parse(redisStore[redisKey] as string);
      expect(otp).toBeDefined();

      const resetRes = await request(app).post('/api/auth/password/reset').send({
        email: 'resetflow@example.com',
        otp,
        newPassword: 'N3wS3cureP@ss!',
      });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'resetflow@example.com',
        password: 'N3wS3cureP@ss!',
      });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
    });
  });
});
