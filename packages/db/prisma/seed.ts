import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { seedDoctors } from '../src/seed-doctors-helper';

const prisma = new PrismaClient();

async function main() {
  // #98: destructive seed (deleteMany) requires explicit opt-in in production.
  if (process.env.ALLOW_DESTRUCTIVE_SEED !== 'yes' && process.env.NODE_ENV === 'production') {
    console.error(
      'ERROR: Refusing destructive seed in production without ALLOW_DESTRUCTIVE_SEED=yes'
    );
    process.exit(1);
  }
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: Refusing to run seed script in production environment!');
    process.exit(1);
  }

  console.log('Starting DB seed...');

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  // Clean existing users (cascade will handle profiles)
  await prisma.user.deleteMany({});
  console.log('Cleaned existing users.');

  // Create Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@ricton.health',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });
  console.log(`Created Super Admin: ${admin.email}`);

  // Create Patient
  const patient = await prisma.user.create({
    data: {
      email: 'patient@ricton.health',
      phone: '+2348000000001',
      passwordHash,
      role: UserRole.PATIENT,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      patientProfile: {
        create: {
          firstName: 'John',
          lastName: 'Doe',
          gender: 'Male',
          bloodType: 'O+',
        },
      },
    },
  });
  console.log(`Created Patient: ${patient.email}`);

  // Create Consultant
  const consultant = await prisma.user.create({
    data: {
      email: 'doctor@ricton.health',
      phone: '+2348000000002',
      passwordHash,
      role: UserRole.CONSULTANT,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      providerProfile: {
        create: {
          firstName: 'Jane',
          lastName: 'Smith',
          title: 'Dr.',
          specialty: 'Cardiology',
          isVerified: true,
          consultationFee: 15000.0,
        },
      },
    },
  });
  console.log(`Created Consultant: ${consultant.email}`);

  // Seed default weekly availability for Jane Smith
  for (let day = 0; day < 7; day++) {
    await prisma.providerAvailability.upsert({
      where: {
        providerId_dayOfWeek: {
          providerId: consultant.id,
          dayOfWeek: day,
        },
      },
      update: {
        startTime: '09:00:00',
        endTime: '17:00:00',
        slotDurationMinutes: 30,
        isActive: true,
      },
      create: {
        providerId: consultant.id,
        dayOfWeek: day,
        startTime: '09:00:00',
        endTime: '17:00:00',
        slotDurationMinutes: 30,
        isActive: true,
      },
    });
  }

  // Seed rich specialist doctors and their availability
  const seededCount = await seedDoctors(prisma);
  console.log(`Seeded ${seededCount} specialist doctors with weekly schedules.`);

  // Create Pharmacist
  const pharmacist = await prisma.user.create({
    data: {
      email: 'pharmacy@ricton.health',
      phone: '+2348000000003',
      passwordHash,
      role: UserRole.PHARMACIST,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      pharmacyProfile: {
        create: {
          pharmacyName: 'Ricton Central Pharmacy',
          isVerified: true,
          address: {
            street: '123 Health Ave',
            city: 'Lagos',
          },
        },
      },
    },
  });
  console.log(`Created Pharmacist: ${pharmacist.email}`);

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
