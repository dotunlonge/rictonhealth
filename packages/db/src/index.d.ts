import { PrismaClient } from '@prisma/client';
export * from '@prisma/client';
export declare const prisma: PrismaClient<
  import('.prisma/client').Prisma.PrismaClientOptions,
  never,
  import('@prisma/client/runtime/library').DefaultArgs
>;
export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;
export default prisma;
