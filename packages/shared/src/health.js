"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDatabase = checkDatabase;
exports.checkRedis = checkRedis;
async function checkDatabase(prisma) {
    await prisma.$queryRaw `SELECT 1`;
}
async function checkRedis(redis) {
    await redis.ping();
}
//# sourceMappingURL=health.js.map