import { PrismaClient, UserRole, UserStatus } from '@prisma/client';

export const DEFAULT_DOCTOR_PASSWORD_HASH =
  '$2b$10$Sm/ikCUviNuWr0UQgYMeaeh0cGC1Mh6o.RUb6GFYRfFikA/mWqPzm'; // RictonDoctor2026!

export interface SeedDoctorData {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  title: string;
  specialty: string;
  licenseNumber: string;
  yearsExperience: number;
  consultationFee: number;
  rating: number;
  bio: string;
  avatarUrl: string;
}

export const SEED_DOCTORS: SeedDoctorData[] = [
  {
    email: 'dr.olaniyi@ricton.com',
    phone: '+2348031110001',
    firstName: 'Tope',
    lastName: 'Olaniyi',
    title: 'Dr.',
    specialty: 'Cardiology',
    licenseNumber: 'MDCN-78192-CAR',
    yearsExperience: 14,
    consultationFee: 25000,
    rating: 4.9,
    bio: 'Senior Consultant Cardiologist specializing in preventive heart health, hypertension control, non-invasive cardiac imaging, and tele-cardiology.',
    avatarUrl:
      'https://images.unsplash.com/photo-1594824813566-88855ce78905?w=400&auto=format&fit=crop&q=80',
  },
  {
    email: 'dr.amadi@ricton.com',
    phone: '+2348031110002',
    firstName: 'Kelechi',
    lastName: 'Amadi',
    title: 'Dr.',
    specialty: 'Pediatrics',
    licenseNumber: 'MDCN-65231-PED',
    yearsExperience: 10,
    consultationFee: 20000,
    rating: 4.8,
    bio: 'Consultant Pediatrician with extensive experience in neonatal intensive care, child immunization, and adolescent growth management.',
    avatarUrl:
      'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
  },
  {
    email: 'dr.bello@ricton.com',
    phone: '+2348031110003',
    firstName: 'Amina',
    lastName: 'Bello',
    title: 'Dr.',
    specialty: 'Neurology',
    licenseNumber: 'MDCN-89012-NEU',
    yearsExperience: 12,
    consultationFee: 30000,
    rating: 4.9,
    bio: 'Consultant Neurologist specializing in stroke rehabilitation, epilepsy treatment, migraine management, and neuromuscular disorders.',
    avatarUrl:
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80',
  },
  {
    email: 'dr.eze@ricton.com',
    phone: '+2348031110004',
    firstName: 'Chinedu',
    lastName: 'Eze',
    title: 'Dr.',
    specialty: 'Orthopedics',
    licenseNumber: 'MDCN-43109-ORT',
    yearsExperience: 15,
    consultationFee: 28000,
    rating: 4.7,
    bio: 'Chief Orthopedic Surgeon specializing in joint replacement, sports medicine, spinal trauma, and arthroscopic surgery.',
    avatarUrl:
      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80',
  },
  {
    email: 'dr.adeyemi@ricton.com',
    phone: '+2348031110005',
    firstName: 'Funke',
    lastName: 'Adeyemi',
    title: 'Dr.',
    specialty: 'Endocrinology',
    licenseNumber: 'MDCN-91234-END',
    yearsExperience: 11,
    consultationFee: 22000,
    rating: 4.8,
    bio: 'Consultant Endocrinologist & Diabetologist dedicated to comprehensive Type 1/2 diabetes care, thyroid disorders, and metabolic health.',
    avatarUrl:
      'https://images.unsplash.com/photo-1594824813566-88855ce78905?w=400&auto=format&fit=crop&q=80',
  },
  {
    email: 'dr.alhassan@ricton.com',
    phone: '+2348031110006',
    firstName: 'Tariq',
    lastName: 'Al-Hassan',
    title: 'Dr.',
    specialty: 'Ophthalmology',
    licenseNumber: 'MDCN-55123-OPH',
    yearsExperience: 9,
    consultationFee: 18000,
    rating: 4.9,
    bio: 'Specialist Ophthalmologist focused on glaucoma management, laser vision correction, and pediatric eye care.',
    avatarUrl:
      'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80',
  },
  {
    email: 'dr.johnson@ricton.com',
    phone: '+2348031110007',
    firstName: 'Folake',
    lastName: 'Johnson',
    title: 'Dr.',
    specialty: 'Psychiatry',
    licenseNumber: 'MDCN-33412-PSY',
    yearsExperience: 13,
    consultationFee: 25000,
    rating: 5.0,
    bio: 'Consultant Psychiatrist & Mental Health advocate providing empathetic tele-psychiatry, anxiety therapy, and stress management.',
    avatarUrl:
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80',
  },
];

export async function seedDoctors(prisma: PrismaClient): Promise<number> {
  // #96: never auto-seed demo doctors in production (would overwrite/seed PII-adjacent fixtures).
  if (process.env.NODE_ENV === 'production') {
    console.warn('[Auto-Bootstrap] Skipping seedDoctors in production.');
    return 0;
  }
  let seededCount = 0;

  for (const doc of SEED_DOCTORS) {
    const user = await prisma.user.upsert({
      where: { email: doc.email },
      update: {
        status: UserStatus.ACTIVE,
        passwordHash: DEFAULT_DOCTOR_PASSWORD_HASH,
        phone: doc.phone,
      },
      create: {
        email: doc.email,
        phone: doc.phone,
        passwordHash: DEFAULT_DOCTOR_PASSWORD_HASH,
        role: UserRole.CONSULTANT,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
        consentVersion: 'v1.0',
        consentAt: new Date(),
      },
    });

    await prisma.providerProfile.upsert({
      where: { userId: user.id },
      update: {
        firstName: doc.firstName,
        lastName: doc.lastName,
        title: doc.title,
        specialty: doc.specialty,
        licenseNumber: doc.licenseNumber,
        yearsExperience: doc.yearsExperience,
        consultationFee: doc.consultationFee,
        rating: doc.rating,
        bio: doc.bio,
        avatarUrl: doc.avatarUrl,
        isVerified: true,
      },
      create: {
        userId: user.id,
        firstName: doc.firstName,
        lastName: doc.lastName,
        title: doc.title,
        specialty: doc.specialty,
        licenseNumber: doc.licenseNumber,
        yearsExperience: doc.yearsExperience,
        consultationFee: doc.consultationFee,
        rating: doc.rating,
        bio: doc.bio,
        avatarUrl: doc.avatarUrl,
        isVerified: true,
      },
    });

    // Seed weekly availability for all 7 days (0=Mon .. 6=Sun)
    // 09:00 to 17:00 with 30-min slots = 16 available slots per day
    for (let day = 0; day < 7; day++) {
      await prisma.providerAvailability.upsert({
        where: {
          providerId_dayOfWeek: {
            providerId: user.id,
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
          providerId: user.id,
          dayOfWeek: day,
          startTime: '09:00:00',
          endTime: '17:00:00',
          slotDurationMinutes: 30,
          isActive: true,
        },
      });
    }

    seededCount++;
  }

  return seededCount;
}

/**
 * Self-healing bootstrap: checks whether verified doctors and availability rows exist.
 * If either is missing, automatically populates all 7 doctors and weekly availability.
 */
export async function ensureDoctorsSeeded(prisma: PrismaClient): Promise<boolean> {
  // #96: fail-closed in production — no self-healing bootstrap outside dev/test.
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  try {
    const [doctorCount, availabilityCount] = await Promise.all([
      prisma.providerProfile.count({ where: { isVerified: true } }),
      prisma.providerAvailability.count({ where: { isActive: true } }),
    ]);

    // If there are fewer than 3 verified doctors or 0 availability records, bootstrap
    if (doctorCount < 3 || availabilityCount === 0) {
      console.log(
        `[Auto-Bootstrap] Detected low doctor count (${doctorCount}) or availability (${availabilityCount}). Seeding doctors...`
      );
      await seedDoctors(prisma);
      console.log(
        `[Auto-Bootstrap] Successfully seeded all doctors and weekly availability schedules.`
      );
      return true;
    }
    return false;
  } catch (error) {
    console.warn('[Auto-Bootstrap] Failed checking/seeding doctors:', error);
    return false;
  }
}
