/**
 * Deterministic mobile E2E seed (idempotent upserts by email).
 * Run: DATABASE_URL=... npx ts-node prisma/seed-mobile-e2e.ts
 * Refuses production. Safe to rerun — every write is an upsert/deleteMany+create
 * scoped to the fixed e2e identities.
 */
import {
  PrismaClient,
  ParticipantRole,
  PrescriptionStatus,
  SubscriptionPlan,
  SubscriptionStatus,
  TelemedicineRoomStatus,
  TelemedicineRoomType,
  UserRole,
  UserStatus,
} from '@prisma/client';
import bcrypt from 'bcrypt';
import {
  E2E_AVAILABILITY,
  E2E_MESSAGE_BODY,
  E2E_OTP_USERS,
  E2E_PASSWORD,
  E2E_PATIENT,
  E2E_PHARMACY,
  E2E_HOSPITAL_ADMIN,
  E2E_PRESCRIPTIONS,
  E2E_PRODUCTS,
  E2E_PROVIDER,
  E2E_REWARD,
  E2E_REWARD_POINTS,
  E2E_SUBSCRIPTION_PLAN,
  E2E_VIDEO_VISIT,
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
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      twoFactorEnabled: false,
      twoFactorSecret: null,
    },
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

  const existingHospital = await prisma.hospital.findFirst({
    where: { registrationNumber: 'E2E-HOSPITAL-2026' },
    select: { id: true },
  });
  const hospital = existingHospital
    ? await prisma.hospital.update({
        where: { id: existingHospital.id },
        data: { name: E2E_HOSPITAL_ADMIN.hospitalName, onboardingComplete: true, isActive: true },
      })
    : await prisma.hospital.create({
        data: {
          name: E2E_HOSPITAL_ADMIN.hospitalName,
          registrationNumber: 'E2E-HOSPITAL-2026',
          phone: E2E_HOSPITAL_ADMIN.phone,
          email: E2E_HOSPITAL_ADMIN.email,
          address: { city: 'Lagos', state: 'Lagos' },
          departments: ['Cardiology', 'General Medicine'],
          onboardingComplete: true,
        },
      });
  await prisma.user.upsert({
    where: { email: E2E_HOSPITAL_ADMIN.email },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      hospitalId: hospital.id,
    },
    create: {
      email: E2E_HOSPITAL_ADMIN.email,
      phone: E2E_HOSPITAL_ADMIN.phone,
      passwordHash,
      role: UserRole.HOSPITAL_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      hospitalId: hospital.id,
    },
  });
  await prisma.providerProfile.update({
    where: { userId: provider.id },
    data: { hospitalId: hospital.id },
  });

  await prisma.product.deleteMany({ where: { pharmacyId: pharmacy.id } });
  for (const product of E2E_PRODUCTS) {
    await prisma.product.create({ data: { pharmacyId: pharmacy.id, ...product, isActive: true } });
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
    update: {
      balance: E2E_WALLET_BALANCE,
      currency: E2E_WALLET_CURRENCY,
      virtualAccountNumber: null,
      virtualBankName: null,
    },
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

  // Seeded VIDEO visit with a linked telemedicine room, join window open now.
  // All E2E-marked bookings are cleared first so the booking journeys (which
  // book real slots) stay rerunnable: reseed, then run the suite.
  await prisma.appointment.deleteMany({
    where: { patientId: patient.id, reason: { contains: 'E2E' } },
  });
  // Appointment deletes do not cascade to rooms — remove the previous seeded
  // room explicitly (participants cascade from the room).
  await prisma.telemedicineRoom.deleteMany({
    where: { externalRoomId: E2E_VIDEO_VISIT.externalRoomId },
  });
  const videoAppointment = await prisma.appointment.create({
    data: {
      patient: { connect: { id: patient.id } },
      provider: { connect: { id: provider.id } },
      scheduledAt: new Date(Date.now() - 5 * 60_000),
      durationMinutes: E2E_VIDEO_VISIT.durationMinutes,
      type: 'VIDEO',
      status: 'CONFIRMED',
      reason: E2E_VIDEO_VISIT.reason,
      telemedicineRoom: {
        create: {
          provider: { connect: { id: provider.id } },
          roomType: TelemedicineRoomType.ONE_ON_ONE,
          externalRoomId: E2E_VIDEO_VISIT.externalRoomId,
          status: TelemedicineRoomStatus.CREATED,
        },
      },
    },
    include: { telemedicineRoom: true },
  });
  if (videoAppointment.telemedicineRoom) {
    await prisma.telemedicineParticipant.createMany({
      data: [
        {
          roomId: videoAppointment.telemedicineRoom.id,
          userId: provider.id,
          role: ParticipantRole.HOST,
        },
        {
          roomId: videoAppointment.telemedicineRoom.id,
          userId: patient.id,
          role: ParticipantRole.PARTICIPANT,
        },
      ],
    });
  }

  // Seeded 1:1 clinician thread (unread for the patient) for inbox journeys.
  const seededThreads = await prisma.chatThread.findMany({
    where: {
      messages: { some: { body: E2E_MESSAGE_BODY } },
      participants: { some: { userId: patient.id } },
    },
    select: { id: true },
  });
  if (seededThreads.length) {
    await prisma.chatThread.deleteMany({
      where: { id: { in: seededThreads.map((t) => t.id) } },
    });
  }
  const thread = await prisma.chatThread.create({
    data: {
      participants: { create: [{ userId: provider.id }, { userId: patient.id }] },
      messages: {
        create: [{ senderId: provider.id, body: E2E_MESSAGE_BODY }],
      },
    },
  });

  // Seeded reward catalog + points for the redeem journeys.
  await prisma.rewardCatalog.deleteMany({ where: { name: E2E_REWARD.name } });
  await prisma.rewardCatalog.create({
    data: {
      name: E2E_REWARD.name,
      description: E2E_REWARD.description,
      pointsCost: E2E_REWARD.pointsCost,
      stock: E2E_REWARD.stock,
      isActive: true,
    },
  });
  await prisma.rewardPoint.deleteMany({
    where: { userId: patient.id, reason: 'E2E seed' },
  });
  await prisma.rewardPoint.create({
    data: { userId: patient.id, points: E2E_REWARD_POINTS, reason: 'E2E seed' },
  });

  // OTP-registration identities are deleted so the register → code-entry
  // journeys start clean on every seed.
  await prisma.user.deleteMany({ where: { email: { in: [...E2E_OTP_USERS] } } });

  console.log(`Seeded mobile E2E fixtures for ${patient.email}`);
  console.log(`Seeded thread ${thread.id} + rewards for ${patient.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
