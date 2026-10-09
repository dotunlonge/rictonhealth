import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Destructive and previously unguarded: refuse production outright, and
  // require explicit opt-in everywhere else (mirrors prisma/seed.ts).
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: Refusing to clear the database in production!');
    process.exit(1);
  }
  if (process.env.ALLOW_DESTRUCTIVE_SEED !== 'yes') {
    console.error('ERROR: Set ALLOW_DESTRUCTIVE_SEED=yes to confirm a full database wipe.');
    process.exit(1);
  }
  console.log('Clearing all database records...');

  // Truncate all tables in PostgreSQL with CASCADE
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename != '_prisma_migrations';
  `;

  for (const { tablename } of tablenames) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
      console.log(`✓ Truncated table "${tablename}"`);
    } catch (error) {
      console.warn(`Failed to truncate "${tablename}"`, error);
    }
  }

  console.log('Database successfully cleared! All users and data have been deleted.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
