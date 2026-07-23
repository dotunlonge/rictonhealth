"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisPassword = process.env.REDIS_PASSWORD;
exports.redis = new ioredis_1.default(redisUrl, {
    password: redisPassword,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
});
exports.redis.on('error', (err) => {
    console.error('[Redis] Error:', err);
});
exports.redis.on('connect', () => {
    console.log('[Redis] Connected successfully');
});
//# sourceMappingURL=redis.js.map