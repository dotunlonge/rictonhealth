import { Request, Response, NextFunction } from 'express';
import { errorResponse } from './response';
import { redis } from './redis';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix?: string;
}

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, keyPrefix = 'rl' } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${keyPrefix}:${req.ip}:${req.path}`;
    const now = Date.now();

    redis
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
          return res.status(429).json(errorResponse('Too many requests', 'RATE_LIMIT_EXCEEDED'));
        }

        const newCount = count + 1;
        const ttl = Math.ceil(windowMs / 1000);

        redis.set(key, JSON.stringify({ count: newCount, resetTime }), 'EX', ttl).catch(() => {
          // Fallback: if Redis fails, allow the request through
          // In production, you might want to fail open or closed
        });

        res.setHeader('X-RateLimit-Limit', String(max));
        res.setHeader('X-RateLimit-Remaining', String(max - newCount));
        next();
      })
      .catch(() => {
        // If Redis is down, allow the request through
        next();
      });
  };
}
