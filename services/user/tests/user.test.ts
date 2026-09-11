process.env.JWT_SECRET = 'test-jwt-secret';
import request from 'supertest';
import express from 'express';
import userRoutes from '../src/routes/user.routes';
import { prisma, UserRole, UserStatus } from '@ricton/db';
import { errorResponse, redis } from '@ricton/shared';
import jwt from 'jsonwebtoken';
import { cleanDatabase } from '../../../packages/shared/src/__tests__/factories';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://mocked-s3-presigned-url.com/avatar.jpg'),
}));

jest.mock('../src/config/s3', () => ({
  s3Client: {},
  S3_BUCKET_NAME: 'ricton-test-avatars',
  S3_REGION: 'us-east-1',
}));

jest.mock('@ricton/shared', () => {
  const actual = jest.requireActual('@ricton/shared');
  const { createRedisMock } = jest.requireActual(
    '../../../packages/shared/src/__tests__/helpers/redis-mock'
  );
  return { __esModule: true, ...actual, redis: createRedisMock() };
});

process.env.AWS_SUPPRESS_NODE_VERSION_WARNING = '1';

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);
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

let patientToken: string;
let consultantToken: string;
let patientId: string;
let consultantId: string;

beforeAll(async () => {
  await cleanDatabase();

  const patient = await prisma.user.create({
    data: {
      email: 'patient@example.com',
      passwordHash: 'hashed',
      role: UserRole.PATIENT,
      status: UserStatus.ACTIVE,
      patientProfile: {
        create: {
          firstName: 'John',
          lastName: 'Doe',
          bloodType: 'O+',
        },
      },
    },
  });
  patientId = patient.id;
  patientToken = jwt.sign(
    {
      userId: patient.id,
      role: patient.role,
      status: patient.status,
      iss: 'ricton-issuer',
      tokenVersion: 0,
    },
    process.env.JWT_SECRET as string
  );

  const consultant = await prisma.user.create({
    data: {
      email: 'consultant@example.com',
      passwordHash: 'hashed',
      role: UserRole.CONSULTANT,
      status: UserStatus.ACTIVE,
      providerProfile: {
        create: {
          firstName: 'Jane',
          lastName: 'Smith',
          specialty: 'Cardiology',
        },
      },
    },
  });
  consultantId = consultant.id;
  consultantToken = jwt.sign(
    {
      userId: consultant.id,
      role: consultant.role,
      status: consultant.status,
      iss: 'ricton-issuer',
      tokenVersion: 0,
    },
    process.env.JWT_SECRET as string
  );
});

afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe('User Controller Integration', () => {
  describe('GET /api/users/me', () => {
    it('should get patient profile successfully', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('PATIENT');
      expect(res.body.data.patientProfile.firstName).toBe('John');
      expect(res.body.data.patientProfile.bloodType).toBe('O+');
      expect(res.body.data.providerProfile).toBeUndefined(); // Shouldn't mix profiles
    });

    it('should get consultant profile successfully', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${consultantToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('CONSULTANT');
      expect(res.body.data.providerProfile.specialty).toBe('Cardiology');
    });

    it('should return 401 if no token provided', async () => {
      const res = await request(app).get('/api/users/me');
      expect(res.status).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer invalidtoken123`);
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/users/me', () => {
    it('should update patient profile successfully', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          bloodType: 'A-',
          allergies: ['Peanuts'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.patientProfile.bloodType).toBe('A-');

      // Verify in DB
      const updated = await prisma.patientProfile.findUnique({ where: { userId: patientId } });
      expect(updated?.bloodType).toBe('A-');
    });

    it('should update consultant profile successfully', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${consultantToken}`)
        .send({
          consultationFee: 15000,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.providerProfile.consultationFee).toBe('15000');

      // Verify in DB
      const updated = await prisma.providerProfile.findUnique({ where: { userId: consultantId } });
      expect(updated?.consultationFee?.toString()).toBe('15000');
    });

    it('should create (not 500 on) a missing pharmacist profile row', async () => {
      // Registration and OAuth never create pharmacyProfile rows, so the
      // first settings save used to die with P2025.
      const pharmacist = await prisma.user.create({
        data: {
          email: 'pharmacist-noprofile@example.com',
          passwordHash: 'hashed',
          role: UserRole.PHARMACIST,
          status: UserStatus.ACTIVE,
        },
      });
      const pharmacistToken = jwt.sign(
        {
          userId: pharmacist.id,
          role: pharmacist.role,
          status: pharmacist.status,
          iss: 'ricton-issuer',
          tokenVersion: 0,
        },
        process.env.JWT_SECRET as string
      );

      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${pharmacistToken}`)
        .send({ pharmacyName: 'Test Pharmacy' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const created = await prisma.pharmacyProfile.findUnique({
        where: { userId: pharmacist.id },
      });
      expect(created?.pharmacyName).toBe('Test Pharmacy');
    });
  });

  describe('PUT /api/users/me/avatar', () => {
    it('should return presigned URL for avatar upload', async () => {
      const res = await request(app)
        .put('/api/users/me/avatar')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ fileType: 'image/jpeg' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.uploadUrl).toBeDefined();
      expect(res.body.data.publicUrl).toBeDefined();
    });

    it('should fail if fileType is missing', async () => {
      const res = await request(app)
        .put('/api/users/me/avatar')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/users/providers', () => {
    beforeAll(async () => {
      // Mark the existing consultant as verified for search
      await prisma.providerProfile.update({
        where: { userId: consultantId },
        data: { isVerified: true },
      });
    });

    it('should return paginated list of verified providers', async () => {
      const res = await request(app)
        .get('/api/users/providers?limit=10&offset=0')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.providers.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.providers[0].specialty).toBe('Cardiology');
      expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    });

    it('should filter providers by specialty', async () => {
      const res = await request(app)
        .get('/api/users/providers?specialty=cardiology')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.providers.length).toBe(1);
    });
  });

  describe('GET /api/users/providers/:id', () => {
    it('should get a provider by id', async () => {
      const res = await request(app)
        .get(`/api/users/providers/${consultantId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.firstName).toBe('Jane');
    });

    it('should return 404 for non-existent provider', async () => {
      const res = await request(app)
        .get('/api/users/providers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/users/me/medical-history', () => {
    it('should update medical history for patient with valid inputs', async () => {
      const history = [{ condition: 'Asthma', diagnosedAt: '2010-01-01', notes: 'Mild' }];
      const res = await request(app)
        .put('/api/users/me/medical-history')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ medicalHistory: history });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should fail with 400 if condition is empty', async () => {
      const res = await request(app)
        .put('/api/users/me/medical-history')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ medicalHistory: [{ condition: '', diagnosedAt: '2010-01-01' }] });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.error.details)).toMatch(
        /condition must be a non-empty string/i
      );
    });

    it('should fail with 400 if diagnosedAt is not in YYYY-MM-DD format', async () => {
      const res = await request(app)
        .put('/api/users/me/medical-history')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ medicalHistory: [{ condition: 'Diabetes', diagnosedAt: 'invalid-date' }] });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.error.details)).toMatch(
        /diagnosed date must be in YYYY-MM-DD format/i
      );
    });

    it('should fail with 403 Forbidden for consultant trying to update medical history (RBAC test)', async () => {
      const res = await request(app)
        .put('/api/users/me/medical-history')
        .set('Authorization', `Bearer ${consultantToken}`)
        .send({ medicalHistory: [] });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/patients can update medical history/i);
    });
  });

  describe('GET /api/users/patients (negative: PHI tenant isolation)', () => {
    it('should forbid patient listing for PATIENT role', async () => {
      const res = await request(app)
        .get('/api/users/patients')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.status).toBe(403);
    });

    it('should forbid reading an unrelated patient record', async () => {
      const stranger = await prisma.user.create({
        data: {
          email: 'stranger-patient@example.com',
          passwordHash: 'hashed',
          role: UserRole.PATIENT,
          status: UserStatus.ACTIVE,
          patientProfile: { create: { firstName: 'Stranger', lastName: 'Patient' } },
        },
      });
      try {
        const res = await request(app)
          .get(`/api/users/patients/${stranger.id}`)
          .set('Authorization', `Bearer ${consultantToken}`);
        // No appointment relationship exists between this consultant and stranger.
        expect(res.status).toBe(403);
      } finally {
        await prisma.patientProfile.deleteMany({ where: { userId: stranger.id } });
        await prisma.user.deleteMany({ where: { id: stranger.id } });
      }
    });

    it('should allow a patient to read their own record', async () => {
      const res = await request(app)
        .get(`/api/users/patients/${patientId}`)
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
