export async function checkDatabase(prisma: {
  $queryRaw: (query: TemplateStringsArray) => Promise<unknown>;
}) {
  await prisma.$queryRaw`SELECT 1`;
}

export async function checkRedis(redis: { ping: () => Promise<string> }) {
  await redis.ping();
}
