(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';

import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma, PrescriptionStatus, UserRole, UserStatus } from '@ricton/db';
import { errorResponse } from '@ricton/shared';
import pharmacyRoutes from '../src/routes/pharmacy.routes';
import { createUser } from '../../../packages/shared/src/__tests__/factories';

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

describe('Pharmacy Inventory & Stock Concurrency Resilience (TDD)', () => {
  let app: Express;
  let pharmacist: any;
  let prescriber: any;
  let patientA: any;
  let patientB: any;
  let patientTokenA: string;
  let patientTokenB: string;
  let pharmacistToken: string;
  let productId: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/pharmacy', pharmacyRoutes);
    app.use(
      (
        err: Error & { statusCode?: number; code?: string },
        _req: Request,
        res: Response,
        _next: NextFunction
      ) => {
        res.status(err.statusCode || 500).json(errorResponse(err.message, err.code));
      }
    );

    // Create Pharmacist user
    pharmacist = await createUser({
      role: UserRole.PHARMACIST,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Chief',
      lastName: 'Pharmacist',
    });

    await prisma.pharmacyProfile.upsert({
      where: { userId: pharmacist.id },
      create: {
        userId: pharmacist.id,
        pharmacyName: 'Ricton City Pharmacy',
        licenseNumber: `PHARM-LIC-${Date.now()}`,
        address: '10 Hospital Road, Lagos',
      },
      update: {},
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

    prescriber = await createUser({
      role: UserRole.CONSULTANT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Inventory',
      lastName: 'Prescriber',
    });

    // Create Patients
    patientA = await createUser({
      role: UserRole.PATIENT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Patient',
      lastName: 'Alpha',
    });
    patientTokenA = jwt.sign(
      {
        userId: patientA.id,
        role: UserRole.PATIENT,
        status: UserStatus.ACTIVE,
        iss: 'ricton-issuer',
      },
      'test-jwt-secret'
    );

    patientB = await createUser({
      role: UserRole.PATIENT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Patient',
      lastName: 'Beta',
    });
    patientTokenB = jwt.sign(
      {
        userId: patientB.id,
        role: UserRole.PATIENT,
        status: UserStatus.ACTIVE,
        iss: 'ricton-issuer',
      },
      'test-jwt-secret'
    );

    // Create a Product with initial stock of 10
    const product = await prisma.product.create({
      data: {
        pharmacyId: pharmacist.id,
        name: 'Amoxicillin 500mg',
        description: 'Broad spectrum antibiotic',
        category: 'ANTIBIOTICS',
        price: 2500,
        stock: 10,
        isActive: true,
      },
    });
    productId = product.id;
  });

  afterAll(async () => {
    await prisma.orderItem.deleteMany({
      where: { order: { pharmacyId: pharmacist.id } },
    });
    await prisma.pharmacyOrder.deleteMany({ where: { pharmacyId: pharmacist.id } });
    await prisma.prescriptionItem.deleteMany({
      where: { prescription: { providerId: prescriber.id } },
    });
    await prisma.prescription.deleteMany({ where: { providerId: prescriber.id } });
    await prisma.product.deleteMany({ where: { pharmacyId: pharmacist.id } });
    await prisma.pharmacyProfile.deleteMany({ where: { userId: pharmacist.id } });
    await prisma.providerProfile.deleteMany({ where: { userId: prescriber.id } });
    await prisma.patientProfile.deleteMany({
      where: { userId: { in: [patientA.id, patientB.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [pharmacist.id, patientA.id, patientB.id, prescriber.id] } },
    });
  });

  it('1. should successfully create pharmacy order and deduct stock atomically', async () => {
    const res = await request(app)
      .post('/api/pharmacy/orders')
      .set('Authorization', `Bearer ${patientTokenA}`)
      .send({
        items: [{ productId, quantity: 2 }],
        deliveryType: 'DELIVERY',
        deliveryAddress: { address: '12 Victoria Island, Lagos' },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(Number(res.body.data.totalAmount)).toBe(5000);

    const updatedProduct = await prisma.product.findUnique({ where: { id: productId } });
    expect(updatedProduct?.stock).toBe(8); // 10 - 2 = 8
  });

  it('2. should reject order when requested quantity exceeds available stock', async () => {
    // Current stock is 8, try to order 50
    const res = await request(app)
      .post('/api/pharmacy/orders')
      .set('Authorization', `Bearer ${patientTokenA}`)
      .send({
        items: [{ productId, quantity: 50 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/insufficient stock/i);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product?.stock).toBe(8); // Stock unchanged
  });

  it('3. should prevent race-condition overselling when concurrent requests exhaust inventory', async () => {
    // Set stock to exactly 3
    await prisma.product.update({
      where: { id: productId },
      data: { stock: 3 },
    });

    // Both patient A and patient B attempt to order 2 units concurrently (2 + 2 = 4 > 3 available)
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/pharmacy/orders')
        .set('Authorization', `Bearer ${patientTokenA}`)
        .send({
          items: [{ productId, quantity: 2 }],
        }),
      request(app)
        .post('/api/pharmacy/orders')
        .set('Authorization', `Bearer ${patientTokenB}`)
        .send({
          items: [{ productId, quantity: 2 }],
        }),
    ]);

    const statuses = [res1.status, res2.status];
    // Exactly one must succeed (201) and one must be rejected (400)
    expect(statuses).toContain(201);
    expect(statuses).toContain(400);

    // Remaining stock must be exactly 1 (3 - 2 = 1), never negative!
    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product?.stock).toBe(1);
  });

  it('4. should guarantee non-negative stock under zero-stock conditions', async () => {
    // Current stock is 1. Order 1 unit.
    const res1 = await request(app)
      .post('/api/pharmacy/orders')
      .set('Authorization', `Bearer ${patientTokenA}`)
      .send({
        items: [{ productId, quantity: 1 }],
      });
    expect(res1.status).toBe(201);

    const productAfter = await prisma.product.findUnique({ where: { id: productId } });
    expect(productAfter?.stock).toBe(0);

    // Now attempt to order from 0 stock
    const res2 = await request(app)
      .post('/api/pharmacy/orders')
      .set('Authorization', `Bearer ${patientTokenB}`)
      .send({
        items: [{ productId, quantity: 1 }],
      });
    expect(res2.status).toBe(400);
    expect(res2.body.error.message).toMatch(/insufficient stock/i);

    const productFinal = await prisma.product.findUnique({ where: { id: productId } });
    expect(productFinal?.stock).toBe(0);
  });

  it('5. should reject ordering inactive products', async () => {
    await prisma.product.update({
      where: { id: productId },
      data: { isActive: false, stock: 100 },
    });

    const res = await request(app)
      .post('/api/pharmacy/orders')
      .set('Authorization', `Bearer ${patientTokenA}`)
      .send({
        items: [{ productId, quantity: 1 }],
      });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/not found or inactive/i);
  });

  it('6. should reject direct purchase of a prescription-required product', async () => {
    await prisma.product.update({
      where: { id: productId },
      data: { isActive: true, stock: 10, requiresPrescription: true },
    });

    const res = await request(app)
      .post('/api/pharmacy/orders')
      .set('Authorization', `Bearer ${patientTokenA}`)
      .send({ items: [{ productId, quantity: 1 }] });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/prescription is required/i);
    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product?.stock).toBe(10);
  });

  it('7. should price and fulfill an assigned prescription atomically from inventory', async () => {
    const prescription = await prisma.prescription.create({
      data: {
        patientId: patientA.id,
        providerId: prescriber.id,
        pharmacyId: pharmacist.id,
        status: PrescriptionStatus.SENT_TO_PHARMACY,
        items: {
          create: {
            drugName: 'Amoxicillin 500mg',
            dosage: '500mg',
            quantity: 2,
            frequency: 'Twice daily',
            duration: '7 days',
          },
        },
      },
    });

    const res = await request(app)
      .post('/api/pharmacy/prescriptions/fulfill')
      .set('Authorization', `Bearer ${pharmacistToken}`)
      .send({ prescriptionId: prescription.id, deliveryType: 'PICKUP' });

    expect(res.status).toBe(201);
    expect(Number(res.body.data.totalAmount)).toBe(5000);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].drugName).toBe('Amoxicillin 500mg');

    const [product, updatedPrescription] = await Promise.all([
      prisma.product.findUnique({ where: { id: productId } }),
      prisma.prescription.findUnique({ where: { id: prescription.id } }),
    ]);
    expect(product?.stock).toBe(8);
    expect(updatedPrescription?.status).toBe(PrescriptionStatus.DISPENSED);
  });
});
