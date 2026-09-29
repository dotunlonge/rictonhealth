import { PrismaClient } from '@prisma/client';
import { seedDoctors } from '../src/seed-doctors-helper';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to seed demo doctors in production.');
    process.exit(1);
  }
  console.log('Seeding 7 doctors and weekly availability into database...');
  const count = await seedDoctors(prisma);
  console.log(`Successfully seeded ${count} doctors and weekly availability!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
