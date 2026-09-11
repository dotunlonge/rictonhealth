import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '@ricton/db';
import { redis, errorResponse } from '@ricton/shared';

export function setupTestApp(routes: express.Router, middlewares: express.RequestHandler[] = []) {
  const app = express();
  app.use(express.json());
  middlewares.forEach((m) => app.use(m));
  app.use('/api', routes);
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
  return app;
}

export async function cleanDatabase() {
  await prisma.refreshToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.prescriptionItem.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.pharmacyOrder.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.providerEarning.deleteMany();
  await prisma.rewardTransaction.deleteMany();
  await prisma.rewardPoint.deleteMany();
  await prisma.rewardCatalog.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.providerAvailability.deleteMany();
  await prisma.chatMessageReceipt.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatParticipant.deleteMany();
  await prisma.chatThread.deleteMany();
  await prisma.mDTParticipant.deleteMany();
  await prisma.mDT.deleteMany();
  await prisma.telemedicineParticipant.deleteMany();
  await prisma.telemedicineRoom.deleteMany();
  await prisma.address.deleteMany();
  await prisma.product.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.providerProfile.deleteMany();
  await prisma.pharmacyProfile.deleteMany();
  await prisma.hospital.deleteMany();
  await prisma.user.deleteMany();
  await prisma.outboxEvent.deleteMany();

  const keys = await redis.keys('*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

export function getAuthHeader(user: {
  id: string;
  role: string;
  status: string;
  tokenVersion?: number;
}) {
  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
      status: user.status,
      iss: 'ricton-issuer',
      tokenVersion: user.tokenVersion ?? 0,
      jti: crypto.randomUUID(),
    },
    process.env.JWT_SECRET || 'test-jwt-secret',
    { expiresIn: '15m' }
  );
  return { Authorization: `Bearer ${token}` };
}
