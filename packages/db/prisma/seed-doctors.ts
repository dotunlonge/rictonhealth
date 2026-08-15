import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DOCTORS = [
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

async function main() {
  console.log('Seeding 7 doctors into database...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('RictonDoctor2026!', salt);

  for (const doc of DOCTORS) {
    const user = await prisma.user.upsert({
      where: { email: doc.email },
      update: {
        status: UserStatus.ACTIVE,
        passwordHash,
      },
      create: {
        email: doc.email,
        phone: doc.phone,
        passwordHash,
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

    console.log(`✓ Seeded Doctor: ${doc.title} ${doc.firstName} ${doc.lastName} (${doc.email})`);
  }

  console.log('Successfully seeded 7 doctors into database!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
