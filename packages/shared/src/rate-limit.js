"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimit = rateLimit;
const response_1 = require("./response");
const redis_1 = require("./redis");
function rateLimit(options) {
    const { windowMs, max, keyPrefix = 'rl' } = options;
    return (req, res, next) => {
        const key = `${keyPrefix}:${req.ip}:${req.path}`;
        const now = Date.now();
        redis_1.redis
            .get(key)
            .then((hits) => {
            let count = 0;
            let resetTime = now + windowMs;
            if (hits) {
                const data = JSON.parse(hits);
                if (now < data.resetTime) {
                    count = data.count;
                    resetTime = data.resetTime;
                }
            }
            if (count >= max) {
                const retryAfter = Math.ceil((resetTime - now) / 1000);
                res.setHeader('X-RateLimit-Limit', String(max));
                res.setHeader('X-RateLimit-Remaining', '0');
                res.setHeader('Retry-After', String(retryAfter));
                return res.status(429).json((0, response_1.errorResponse)('Too many requests', 'RATE_LIMIT_EXCEEDED'));
            }
            const newCount = count + 1;
            const ttl = Math.ceil(windowMs / 1000);
            redis_1.redis.set(key, JSON.stringify({ count: newCount, resetTime }), 'EX', ttl).catch((err) => {
                console.error('[RateLimit] Redis error, failing closed:', err);
            });
            res.setHeader('X-RateLimit-Limit', String(max));
            res.setHeader('X-RateLimit-Remaining', String(max - newCount));
            next();
        })
            .catch((err) => {
            console.error('[RateLimit] Redis unavailable, failing closed:', err);
            res.setHeader('X-RateLimit-Limit', String(max));
            res.setHeader('X-RateLimit-Remaining', '0');
            res
                .status(429)
                .json((0, response_1.errorResponse)('Service temporarily unavailable', 'RATE_LIMIT_UNAVAILABLE'));
        });
    };
}
//# sourceMappingURL=rate-limit.js.map