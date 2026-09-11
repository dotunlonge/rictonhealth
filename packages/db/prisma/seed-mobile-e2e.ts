/**
 * Deterministic mobile E2E seed (idempotent upserts by email).
 * Run: DATABASE_URL=... npx ts-node prisma/seed-mobile-e2e.ts
 * Refuses production. Safe to rerun — every write is an upsert/deleteMany+create
 * scoped to the fixed e2e identities.
 */
import {
  PrismaClient,
  UserRole,
  UserStatus,
  PrescriptionStatus,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client';
import bcrypt from 'bcrypt';
import {
  E2E_AVAILABILITY,
  E2E_PASSWORD,
  E2E_PATIENT,
  E2E_PHARMACY,
  E2E_PRESCRIPTIONS,
  E2E_PRODUCTS,
  E2E_PROVIDER,
  E2E_SUBSCRIPTION_PLAN,
  E2E_WALLET_BALANCE,
  E2E_WALLET_CURRENCY,
} from './seed-mobile-e2e.fixtures';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: Refusing to run E2E seed in production!');
    process.exit(1);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(E2E_PASSWORD, salt);

  const patient = await prisma.user.upsert({
    where: { email: E2E_PATIENT.email },
    update: { passwordHash, status: UserStatus.ACTIVE, emailVerified: true },
    create: {
      email: E2E_PATIENT.email,
      phone: E2E_PATIENT.phone,
      passwordHash,
      role: UserRole.PATIENT,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      patientProfile: {
        create: {
          firstName: E2E_PATIENT.firstName,
          lastName: E2E_PATIENT.lastName,
          gender: 'Female',
        },
      },
    },
  });

  const provider = await prisma.user.upsert({
    where: { email: E2E_PROVIDER.email },
    update: { passwordHash, status: UserStatus.ACTIVE, emailVerified: true },
    create: {
      email: E2E_PROVIDER.email,
      phone: E2E_PROVIDER.phone,
      passwordHash,
      role: UserRole.CONSULTANT,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      providerProfile: {
        create: {
          firstName: E2E_PROVIDER.firstName,
          lastName: E2E_PROVIDER.lastName,
          title: 'Dr.',
          specialty: E2E_PROVIDER.specialty,
          isVerified: true,
          consultationFee: E2E_PROVIDER.consultationFee,
        },
      },
    },
  });

  for (const slot of E2E_AVAILABILITY) {
    await prisma.providerAvailability.upsert({
      where: { providerId_dayOfWeek: { providerId: provider.id, dayOfWeek: slot.dayOfWeek } },
      update: { ...slot },
      create: { providerId: provider.id, ...slot },
    });
  }

  const pharmacy = await prisma.user.upsert({
    where: { email: E2E_PHARMACY.email },
    update: { passwordHash, status: UserStatus.ACTIVE, emailVerified: true },
    create: {
      email: E2E_PHARMACY.email,
      phone: E2E_PHARMACY.phone,
      passwordHash,
      role: UserRole.PHARMACIST,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      pharmacyProfile: { create: { pharmacyName: E2E_PHARMACY.pharmacyName, isVerified: true } },
    },
  });

  await prisma.product.deleteMany({ where: { pharmacyId: pharmacy.id } });
  for (const product of E2E_PRODUCTS) {
    await prisma.product.create({ data: { pharmacyId: pharmacy.id, ...product } });
  }

  await prisma.prescription.deleteMany({ where: { patientId: patient.id } });
  for (const rx of E2E_PRESCRIPTIONS) {
    await prisma.prescription.create({
      data: {
        patientId: patient.id,
        providerId: provider.id,
        status: rx.status as PrescriptionStatus,
        signedAt: rx.signedAt ? new Date(rx.signedAt) : null,
        items: {
          create: [
            {
              drugName: 'E2E Paracetamol 500mg',
              dosage: '500mg',
              quantity: 20,
              frequency: 'Twice daily',
              duration: '5 days',
            },
          ],
        },
      },
    });
  }

  await prisma.wallet.upsert({
    where: { userId: patient.id },
    update: { balance: E2E_WALLET_BALANCE, currency: E2E_WALLET_CURRENCY },
    create: { userId: patient.id, balance: E2E_WALLET_BALANCE, currency: E2E_WALLET_CURRENCY },
  });

  await prisma.subscription.deleteMany({ where: { userId: patient.id } });
  await prisma.subscription.create({
    data: {
      userId: patient.id,
      plan: E2E_SUBSCRIPTION_PLAN as SubscriptionPlan,
      status: SubscriptionStatus.ACTIVE,
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.notification.deleteMany({ where: { userId: patient.id } });
  await prisma.notification.create({
    data: {
      userId: patient.id,
      type: 'WELCOME',
      title: 'Welcome to Ricton E2E',
      body: 'Your seeded test workspace is ready.',
      channel: 'IN_APP',
    },
  });

  console.log(`Seeded mobile E2E fixtures for ${patient.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
