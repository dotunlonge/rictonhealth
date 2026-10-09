import { PrismaClient, UserRole, UserStatus } from '@prisma/client';

export const DEFAULT_PHARMACY_PASSWORD_HASH =
  '$2b$10$Sm/ikCUviNuWr0UQgYMeaeh0cGC1Mh6o.RUb6GFYRfFikA/mWqPzm'; // RictonDoctor2026!

export const DEFAULT_PHARMACIES = [
  {
    email: 'pharmacy@ricton.health',
    phone: '+2348000000003',
    pharmacyName: 'Ricton Central Pharmacy',
    licenseNumber: 'PCN-90214-LAG',
    address: {
      street: '123 Health Ave, Victoria Island',
      city: 'Lagos',
      state: 'Lagos State',
      country: 'Nigeria',
    },
  },
  {
    email: 'lekki.pharmacy@ricton.health',
    phone: '+2348000000004',
    pharmacyName: 'Ricton Express Pharmacy Lekki',
    licenseNumber: 'PCN-84512-LEK',
    address: {
      street: '45 Admiralty Way, Lekki Phase 1',
      city: 'Lagos',
      state: 'Lagos State',
      country: 'Nigeria',
    },
  },
];

export const DEFAULT_PRODUCTS = [
  {
    name: 'Paracetamol 500mg (Pack of 20)',
    price: 1500,
    stock: 250,
    category: 'Analgesics',
    requiresPrescription: false,
    description: 'Fast effective relief of mild-to-moderate pain, headaches, and fever.',
  },
  {
    name: 'Amoxicillin 500mg (Pack of 30)',
    price: 4500,
    stock: 120,
    category: 'Antibiotics',
    requiresPrescription: true,
    description:
      'Broad spectrum penicillin antibiotic for bacterial respiratory and ear infections.',
  },
  {
    name: 'Vitamin C 1000mg Effervescent (Pack of 20)',
    price: 3200,
    stock: 180,
    category: 'Supplements',
    requiresPrescription: false,
    description: 'High strength immune support antioxidant formulation with bioflavonoids.',
  },
  {
    name: 'Ibuprofen 400mg (Pack of 20)',
    price: 2000,
    stock: 150,
    category: 'Analgesics',
    requiresPrescription: false,
    description: 'Anti-inflammatory and analgesic for pain, swelling, and fever.',
  },
  {
    name: 'Omeprazole 20mg (Pack of 14)',
    price: 3800,
    stock: 90,
    category: 'Gastrointestinal',
    requiresPrescription: true,
    description: 'Proton pump inhibitor for acid reflux, GERD, and stomach ulcers.',
  },
  {
    name: 'Metformin 500mg (Pack of 60)',
    price: 4200,
    stock: 110,
    category: 'Endocrinology',
    requiresPrescription: true,
    description: 'First-line medication for the treatment of type 2 diabetes.',
  },
  {
    name: 'Artemether + Lumefantrine (ACT Malaria Treatment)',
    price: 3500,
    stock: 140,
    category: 'Antimalarials',
    requiresPrescription: false,
    description:
      'WHO-recommended artemisinin-based combination therapy for acute uncomplicated malaria.',
  },
  {
    name: 'Cetirizine 10mg (Pack of 30)',
    price: 2500,
    stock: 100,
    category: 'Allergy',
    requiresPrescription: false,
    description: 'Fast-acting non-drowsy antihistamine for hay fever, pet allergies, and hives.',
  },
];

export async function seedPharmacy(prisma: PrismaClient): Promise<number> {
  // #96 (parity with seedDoctors): demo pharmacies carry a default password
  // hash and must never be written by service boot or request paths in
  // production. All callers funnel through here, so one guard covers them.
  if (process.env.NODE_ENV === 'production') {
    console.warn('[Auto-Bootstrap] Skipping seedPharmacy in production.');
    return 0;
  }
  let seededPharmacies = 0;

  for (const p of DEFAULT_PHARMACIES) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {
        status: UserStatus.ACTIVE,
        passwordHash: DEFAULT_PHARMACY_PASSWORD_HASH,
        phone: p.phone,
      },
      create: {
        email: p.email,
        phone: p.phone,
        passwordHash: DEFAULT_PHARMACY_PASSWORD_HASH,
        role: UserRole.PHARMACIST,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
        consentVersion: 'v1.0',
        consentAt: new Date(),
      },
    });

    await prisma.pharmacyProfile.upsert({
      where: { userId: user.id },
      update: {
        pharmacyName: p.pharmacyName,
        isVerified: true,
        address: p.address,
      },
      create: {
        userId: user.id,
        pharmacyName: p.pharmacyName,
        isVerified: true,
        address: p.address,
      },
    });

    // Ensure wallet exists for this pharmacy
    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        balance: 50000,
        currency: 'NGN',
      },
    });

    // Seed products for primary pharmacy
    if (seededPharmacies === 0) {
      for (const prod of DEFAULT_PRODUCTS) {
        const existing = await prisma.product.findFirst({
          where: { pharmacyId: user.id, name: prod.name },
        });
        if (!existing) {
          await prisma.product.create({
            data: {
              pharmacyId: user.id,
              name: prod.name,
              price: prod.price,
              stock: prod.stock,
              category: prod.category,
              requiresPrescription: prod.requiresPrescription,
              description: prod.description,
              isActive: true,
            },
          });
        }
      }
    }

    seededPharmacies++;
  }

  return seededPharmacies;
}

/**
 * Self-healing bootstrap: checks whether verified pharmacies and products exist.
 * If either is missing, automatically populates pharmacies and the medication catalog.
 */
export async function ensurePharmacySeeded(prisma: PrismaClient): Promise<boolean> {
  try {
    const [pharmacyCount, productCount] = await Promise.all([
      prisma.pharmacyProfile.count({ where: { isVerified: true } }),
      prisma.product.count({ where: { isActive: true } }),
    ]);

    if (pharmacyCount === 0 || productCount === 0) {
      console.log(
        `[Auto-Bootstrap] Detected missing pharmacies (${pharmacyCount}) or products (${productCount}). Seeding catalog...`
      );
      await seedPharmacy(prisma);
      console.log(`[Auto-Bootstrap] Successfully seeded pharmacies and medication catalog.`);
      return true;
    }
    return false;
  } catch (error) {
    console.warn('[Auto-Bootstrap] Failed checking/seeding pharmacy:', error);
    return false;
  }
}
