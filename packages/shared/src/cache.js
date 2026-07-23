"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCached = getCached;
exports.setCached = setCached;
exports.invalidateCache = invalidateCache;
exports.makeCacheKey = makeCacheKey;
const redis_1 = require("./redis");
async function getCached(key, options) {
    const { ttlSeconds, prefix = 'cache' } = options;
    const cached = await redis_1.redis.get(`${prefix}:${key}`);
    if (!cached)
        return null;
    try {
        return JSON.parse(cached);
    }
    catch {
        return null;
    }
}
async function setCached(key, value, options) {
    const { ttlSeconds, prefix = 'cache' } = options;
    await redis_1.redis.set(`${prefix}:${key}`, JSON.stringify(value), 'EX', ttlSeconds);
}
async function invalidateCache(keyPattern, prefix = 'cache') {
    const keys = await redis_1.redis.keys(`${prefix}:${keyPattern}`);
    if (keys.length > 0) {
        await redis_1.redis.del(...keys);
    }
}
function makeCacheKey(parts) {
    return parts.filter((p) => p !== undefined && p !== null).join(':');
}
//# sourceMappingURL=cache.js.map