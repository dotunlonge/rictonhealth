import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  prisma,
  UserRole,
  UserStatus,
  PaymentType,
  PaymentStatus,
  PaymentProvider,
  AppointmentType,
  AppointmentStatus,
  PrescriptionStatus,
  WalletTransactionType,
  WalletReferenceType,
} from '@ricton/db';
import { redis } from '@ricton/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'test-refresh-secret';

export async function createUser(
  overrides: {
    email?: string;
    password?: string;
    role?: UserRole;
    status?: UserStatus;
    firstName?: string;
    lastName?: string;
    phone?: string;
    tokenVersion?: number;
  } = {}
): Promise<{
  id: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  passwordHash: string | null;
}> {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(overrides.password || 'SecureP@ssw0rd1', salt);

  const email =
    overrides.email || `user-${Date.now()}-${crypto.randomUUID().slice(0, 8)}@example.com`;
  const role = overrides.role || UserRole.PATIENT;
  const status = overrides.status || UserStatus.ACTIVE;

  const data: any = {
    email,
    passwordHash,
    role,
    status,
    phone: overrides.phone,
    tokenVersion: overrides.tokenVersion ?? 0,
  };

  if (overrides.firstName && overrides.lastName) {
    if (role === UserRole.PATIENT) {
      data.patientProfile = {
        create: { firstName: overrides.firstName, lastName: overrides.lastName },
      };
    } else if (role === UserRole.CONSULTANT) {
      data.providerProfile = {
        create: { firstName: overrides.firstName, lastName: overrides.lastName },
      };
    }
  }

  const user = await prisma.user.create({
    data,
    select: { id: true, email: true, role: true, status: true, passwordHash: true },
  });

  return user;
}

export function createAuthToken(user: {
  id: string;
  role: string;
  status: string;
  tokenVersion?: number;
}): string {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
      status: user.status,
      iss: 'ricton-issuer',
      tokenVersion: user.tokenVersion ?? 0,
      jti: crypto.randomUUID(),
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
}

export async function createRefreshToken(user: {
  id: string;
}): Promise<{ refreshToken: string; tokenId: string }> {
  const refreshToken = jwt.sign({ userId: user.id, jti: crypto.randomUUID() }, REFRESH_SECRET, {
    expiresIn: '7d',
  });
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  const tokenRecord = await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  // Set semantics mirror the controller (sadd/srem by token value).
  await redis.sadd(`refresh:${user.id}`, refreshToken);
  await redis.expire(`refresh:${user.id}`, 7 * 24 * 60 * 60);

  return { refreshToken, tokenId: tokenRecord.id };
}

export async function createProviderProfile(
  user: { id: string },
  overrides: {
    firstName?: string;
    lastName?: string;
    specialty?: string;
    consultationFee?: number;
    isVerified?: boolean;
  } = {}
) {
  return prisma.providerProfile.create({
    data: {
      userId: user.id,
      firstName: overrides.firstName || 'Dr. Test',
      lastName: overrides.lastName || 'Provider',
      specialty: overrides.specialty || 'General Medicine',
      consultationFee:
        overrides.consultationFee != null ? overrides.consultationFee.toString() : null,
      isVerified: overrides.isVerified ?? false,
    },
  });
}

export async function createPatientProfile(
  user: { id: string },
  overrides: {
    firstName?: string;
    lastName?: string;
    bloodType?: string;
  } = {}
) {
  return prisma.patientProfile.create({
    data: {
      userId: user.id,
      firstName: overrides.firstName || 'Test',
      lastName: overrides.lastName || 'Patient',
      bloodType: overrides.bloodType || 'O+',
    },
  });
}

export async function createAppointment(
  overrides: {
    patientId?: string;
    providerId?: string;
    hospitalId?: string;
    scheduledAt?: Date;
    durationMinutes?: number;
    type?: AppointmentType;
    status?: AppointmentStatus;
    reason?: string;
  } = {}
) {
  const patientId = overrides.patientId || (await createUser({ role: UserRole.PATIENT })).id;
  const providerId = overrides.providerId || (await createUser({ role: UserRole.CONSULTANT })).id;

  return prisma.appointment.create({
    data: {
      patientId,
      providerId,
      hospitalId: overrides.hospitalId,
      scheduledAt: overrides.scheduledAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
      durationMinutes: overrides.durationMinutes || 30,
      type: overrides.type || AppointmentType.VIDEO,
      status: overrides.status || AppointmentStatus.PENDING,
      reason: overrides.reason,
    },
  });
}

export async function createPrescription(
  overrides: {
    patientId?: string;
    providerId?: string;
    appointmentId?: string;
    pharmacyId?: string;
    status?: PrescriptionStatus;
    notes?: string;
  } = {}
) {
  const patientId = overrides.patientId || (await createUser({ role: UserRole.PATIENT })).id;
  const providerId = overrides.providerId || (await createUser({ role: UserRole.CONSULTANT })).id;

  return prisma.prescription.create({
    data: {
      patientId,
      providerId,
      appointmentId: overrides.appointmentId,
      pharmacyId: overrides.pharmacyId,
      status: overrides.status || PrescriptionStatus.DRAFT,
      notes: overrides.notes,
    },
  });
}

export async function createPayment(
  overrides: {
    userId?: string;
    amount?: number;
    type?: PaymentType;
    status?: PaymentStatus;
    provider?: PaymentProvider;
    providerReference?: string;
    currency?: string;
  } = {}
) {
  const userId = overrides.userId || (await createUser()).id;

  return prisma.payment.create({
    data: {
      userId,
      amount: overrides.amount ?? 15000,
      currency: overrides.currency || 'NGN',
      type: overrides.type || PaymentType.WALLET_TOPUP,
      status: overrides.status || PaymentStatus.PENDING,
      provider: overrides.provider || PaymentProvider.PAYSTACK,
      providerReference:
        overrides.providerReference || `ref-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    },
  });
}

export async function createWallet(user: { id: string; email?: string | null }) {
  return prisma.wallet.create({
    data: {
      userId: user.id,
      currency: 'NGN',
    },
    include: { transactions: true },
  });
}

export async function createWalletTransaction(
  walletId: string,
  overrides: {
    type?: WalletTransactionType;
    amount?: number;
    description?: string;
    referenceType?: WalletReferenceType;
    referenceId?: string;
  } = {}
) {
  const transactions = await prisma.walletTransaction.findMany({ where: { walletId } });
  const balance = transactions.reduce((acc, tx) => {
    if (tx.type === WalletTransactionType.CREDIT) return acc + Number(tx.amount);
    if (tx.type === WalletTransactionType.DEBIT) return acc - Number(tx.amount);
    return acc;
  }, 0);

  return prisma.walletTransaction.create({
    data: {
      walletId,
      type: overrides.type || WalletTransactionType.CREDIT,
      amount: overrides.amount ?? 5000,
      balanceAfter: balance + (overrides.amount ?? 5000),
      description: overrides.description || 'Test transaction',
      referenceType: overrides.referenceType || WalletReferenceType.TOPUP,
      referenceId: overrides.referenceId,
    },
  });
}

/**
 * FK-safe full reset for integration suites. Children are deleted before
 * parents so suites stay green no matter what other flows (E2E, neighboring
 * suites) left behind. Prefer this over ad-hoc deleteMany chains.
 */
export async function cleanDatabase(): Promise<void> {
  await prisma.telemedicineParticipant.deleteMany();
  await prisma.telemedicineRoom.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.prescriptionItem.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.pharmacyOrder.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.pushToken.deleteMany();
  await prisma.rewardTransaction.deleteMany();
  await prisma.rewardPoint.deleteMany();
  await prisma.$executeRawUnsafe('DELETE FROM "_RewardRedeemedBy"');
  await prisma.rewardCatalog.deleteMany();
  await prisma.chatMessageReceipt.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatParticipant.deleteMany();
  await prisma.chatThread.deleteMany();
  await prisma.mDTParticipant.deleteMany();
  await prisma.mDT.deleteMany();
  await prisma.address.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.providerEarning.deleteMany();
  await prisma.providerAvailability.deleteMany();
  await prisma.product.deleteMany();
  await prisma.idempotencyKey.deleteMany();
  await prisma.hospital.deleteMany();
  await prisma.providerProfile.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.pharmacyProfile.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.outboxEvent.deleteMany();
}
