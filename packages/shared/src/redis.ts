import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisPassword = process.env.REDIS_PASSWORD;

export const redis = new Redis(redisUrl, {
  password: redisPassword,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('error', (err) => {
  console.error('[Redis] Error:', err);
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});
