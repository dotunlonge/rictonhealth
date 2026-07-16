"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimit = rateLimit;
const response_1 = require("./response");
function rateLimit(options) {
    const { windowMs, max, keyPrefix = 'rl' } = options;
    const hits = new Map();
    return (req, res, next) => {
        const key = `${keyPrefix}:${req.ip}:${req.path}`;
        const now = Date.now();
        const record = hits.get(key);
        if (!record || now > record.resetTime) {
            hits.set(key, { count: 1, resetTime: now + windowMs });
            res.setHeader('X-RateLimit-Limit', String(max));
            res.setHeader('X-RateLimit-Remaining', String(max - 1));
            return next();
        }
        if (record.count >= max) {
            const retryAfter = Math.ceil((record.resetTime - now) / 1000);
            res.setHeader('Retry-After', String(retryAfter));
            return res.status(429).json((0, response_1.errorResponse)('Too many requests', 'RATE_LIMIT_EXCEEDED'));
        }
        record.count += 1;
        res.setHeader('X-RateLimit-Limit', String(max));
        res.setHeader('X-RateLimit-Remaining', String(max - record.count));
        next();
    };
}
//# sourceMappingURL=rate-limit.js.map