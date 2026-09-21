(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';

import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma, UserRole, UserStatus, PrescriptionStatus } from '@ricton/db';
import { errorResponse } from '@ricton/shared';
import prescriptionRoutes from '../src/routes/prescription.routes';
import { createUser, createAppointment } from '../../../packages/shared/src/__tests__/factories';

jest.mock('@ricton/shared', () => {
  const actual = jest.requireActual('../../../packages/shared/src/index');
  const { createRedisMock } = jest.requireActual(
    '../../../packages/shared/src/__tests__/helpers/redis-mock'
  );
  return {
    __esModule: true,
    ...actual,
    redis: createRedisMock(),
  };
});

describe('Prescription Service Lifecycle & Safety (TDD)', () => {
  let app: Express;
  let doctor: any;
  let unverifiedDoctor: any;
  let patient: any;
  let pharmacist: any;
  let doctorToken: string;
  let unverifiedDoctorToken: string;
  let patientToken: string;
  let pharmacistToken: string;
  let createdPrescriptionId: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/prescriptions', prescriptionRoutes);
    app.use(
      (
        err: Error & { statusCode?: number; code?: string },
        _req: Request,
        res: Response,
        _next: NextFunction
      ) => {
        if (!err.statusCode || err.statusCode >= 500) {
          console.error('[PRESCRIPTION TEST ERROR]', err);
        }
        res.status(err.statusCode || 500).json(errorResponse(err.message, err.code));
      }
    );

    // 1. Verified Doctor
    doctor = await createUser({
      role: UserRole.CONSULTANT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Gregory',
      lastName: 'House',
    });
    await prisma.providerProfile.upsert({
      where: { userId: doctor.id },
      create: {
        userId: doctor.id,
        firstName: 'Gregory',
        lastName: 'House',
        specialty: 'Diagnostics',
        consultationFee: 25000,
        licenseNumber: `DOC-VER-${Date.now()}`,
        isVerified: true,
      },
      update: { isVerified: true },
    });
    doctorToken = jwt.sign(
      {
        userId: doctor.id,
        role: UserRole.CONSULTANT,
        status: UserStatus.ACTIVE,
        iss: 'ricton-issuer',
      },
      'test-jwt-secret'
    );

    // 2. Unverified Doctor
    unverifiedDoctor = await createUser({
      role: UserRole.CONSULTANT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Unverified',
      lastName: 'Doctor',
    });
    await prisma.providerProfile.upsert({
      where: { userId: unverifiedDoctor.id },
      create: {
        userId: unverifiedDoctor.id,
        firstName: 'Unverified',
        lastName: 'Doctor',
        specialty: 'General Practice',
        consultationFee: 10000,
        licenseNumber: `DOC-UNV-${Date.now()}`,
        isVerified: false,
      },
      update: { isVerified: false },
    });
    unverifiedDoctorToken = jwt.sign(
      {
        userId: unverifiedDoctor.id,
        role: UserRole.CONSULTANT,
        status: UserStatus.ACTIVE,
        iss: 'ricton-issuer',
      },
      'test-jwt-secret'
    );

    // 3. Patient
    patient = await createUser({
      role: UserRole.PATIENT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
    });
    patientToken = jwt.sign(
      {
        userId: patient.id,
        role: UserRole.PATIENT,
        status: UserStatus.ACTIVE,
        iss: 'ricton-issuer',
      },
      'test-jwt-secret'
    );

    // Clinical relationship required by prescription authorization: the
    // consultant must share an appointment with the patient.
    await createAppointment({ patientId: patient.id, providerId: doctor.id });

    // 4. Pharmacist
    pharmacist = await createUser({
      role: UserRole.PHARMACIST,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Jane',
      lastName: 'Apothecary',
    });
    pharmacistToken = jwt.sign(
      {
        userId: pharmacist.id,
        role: UserRole.PHARMACIST,
        status: UserStatus.ACTIVE,
        iss: 'ricton-issuer',
      },
      'test-jwt-secret'
    );
    await prisma.pharmacyProfile.create({
      data: {
        userId: pharmacist.id,
        pharmacyName: 'Prescription Test Pharmacy',
        licenseNumber: `RX-PHARM-${Date.now()}`,
        address: '1 Test Street',
      },
    });
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany({
      where: { patientId: patient.id, providerId: doctor.id },
    });
    await prisma.prescriptionItem.deleteMany({
      where: { prescription: { providerId: { in: [doctor.id, unverifiedDoctor.id] } } },
    });
    await prisma.prescription.deleteMany({
      where: { providerId: { in: [doctor.id, unverifiedDoctor.id] } },
    });
    await prisma.providerProfile.deleteMany({
      where: { userId: { in: [doctor.id, unverifiedDoctor.id] } },
    });
    await prisma.pharmacyProfile.deleteMany({ where: { userId: pharmacist.id } });
    await prisma.patientProfile.deleteMany({ where: { userId: patient.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [doctor.id, unverifiedDoctor.id, patient.id, pharmacist.id] } },
    });
  });

  it('1. should allow a verified consultant to create a draft prescription with line items', async () => {
    const res = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        patientId: patient.id,
        notes: 'Take with food',
        items: [
          {
            drugName: 'Paracetamol 500mg',
            dosage: '500mg',
            quantity: 20,
            frequency: 'TDS',
            duration: '5 days',
            instructions: 'After meals',
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe(PrescriptionStatus.DRAFT);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].drugName).toBe('Paracetamol 500mg');

    createdPrescriptionId = res.body.data.id;
  });

  it('2. should reject prescription creation from non-consultant roles (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        patientId: patient.id,
        items: [
          {
            drugName: 'Aspirin',
            dosage: '100mg',
            quantity: 10,
            frequency: 'Daily',
            duration: '10 days',
          },
        ],
      });

    expect(res.status).toBe(403);
    // Rejected at the router allowlist (generic RBAC message); the
    // controller keeps its own consultant check as defense in depth.
    expect(res.body.error.message).toMatch(/permission|only medical consultants/i);
  });

  it('3. should reject signing prescription if doctor license is unverified', async () => {
    // Draft a prescription by unverified doctor
    const draft = await prisma.prescription.create({
      data: {
        patientId: patient.id,
        providerId: unverifiedDoctor.id,
        status: PrescriptionStatus.DRAFT,
      },
    });

    const res = await request(app)
      .post(`/api/prescriptions/${draft.id}/sign`)
      .set('Authorization', `Bearer ${unverifiedDoctorToken}`)
      .send({ otpCode: '123456' });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/license must be verified/i);
  });

  it('4. should allow verified consultant to digitally sign draft prescription', async () => {
    const res = await request(app)
      .post(`/api/prescriptions/${createdPrescriptionId}/sign`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ otpCode: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(PrescriptionStatus.SIGNED);
    expect(res.body.data.signedAt).toBeDefined();
  });

  it('5. should let the patient assign a signed prescription before pharmacist dispensing', async () => {
    const assigned = await request(app)
      .patch(`/api/prescriptions/${createdPrescriptionId}/send-to-pharmacy`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ pharmacyId: pharmacist.id });

    expect(assigned.status).toBe(200);
    expect(assigned.body.data.status).toBe(PrescriptionStatus.SENT_TO_PHARMACY);
    expect(assigned.body.data.pharmacyId).toBe(pharmacist.id);

    const res = await request(app)
      .patch(`/api/prescriptions/${createdPrescriptionId}/dispense`)
      .set('Authorization', `Bearer ${pharmacistToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(PrescriptionStatus.DISPENSED);
  });

  it('6b. should forbid a pharmacist from reading an unrelated prescription (negative)', async () => {
    const outsiderRx = await prisma.prescription.create({
      data: {
        patientId: patient.id,
        providerId: doctor.id,
        status: PrescriptionStatus.DRAFT,
      },
    });
    try {
      const res = await request(app)
        .get(`/api/prescriptions/${outsiderRx.id}`)
        .set('Authorization', `Bearer ${pharmacistToken}`);
      // DRAFT, unassigned: pharmacist is neither owner nor assigned.
      expect(res.status).toBe(403);
    } finally {
      await prisma.prescription.deleteMany({ where: { id: outsiderRx.id } });
    }
  });

  it('6. should reject dispensing a prescription that is in DRAFT status', async () => {
    const draft = await prisma.prescription.create({
      data: {
        patientId: patient.id,
        providerId: doctor.id,
        status: PrescriptionStatus.DRAFT,
      },
    });

    const res = await request(app)
      .patch(`/api/prescriptions/${draft.id}/dispense`)
      .set('Authorization', `Bearer ${pharmacistToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/only prescriptions sent to this pharmacy/i);
  });
});
