import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisPassword = process.env.REDIS_PASSWORD;
const isCluster =
  process.env.REDIS_IS_CLUSTER === 'true' ||
  redisUrl.includes('cache.amazonaws.com') ||
  !!process.env.REDIS_CLUSTER_HOST;

const redisClusterHost =
  process.env.REDIS_CLUSTER_HOST ||
  redisUrl
    .replace(/^rediss?:\/\//, '')
    .split(':')[0]
    .split('/')[0];

export const redis = isCluster
  ? (new Redis.Cluster(
      [{ host: redisClusterHost, port: parseInt(process.env.REDIS_PORT || '6379', 10) }],
      {
        dnsLookup: (address, callback) => callback(null, address),
        redisOptions: {
          password: redisPassword,
          tls: process.env.REDIS_TLS === 'false' ? undefined : {},
        },
      }
    ) as unknown as Redis)
  : new Redis(redisUrl, {
      password: redisPassword,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      },
    });

redis.on('error', (err) => {
  console.error('[Redis] Error:', err);
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});
