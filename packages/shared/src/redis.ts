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
      lazyConnect: process.env.NODE_ENV === 'test',
      retryStrategy(times) {
        if (process.env.NODE_ENV === 'test') return null;
        return Math.min(times * 50, 2000);
      },
    });

redis.on('error', (err) => {
  console.error('[Redis] Error:', err);
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

/**
 * Dedicated BullMQ connection. BullMQ's blocking connections REQUIRE
 * maxRetriesPerRequest: null — sharing the general client above (retries: 3)
 * crashed every Worker at boot ("Your redis options maxRetriesPerRequest
 * must be null", took down notification-service + delivery workers).
 * Never use the general `redis` client as a BullMQ `connection`.
 */
export const bullmqConnection = isCluster
  ? (new Redis.Cluster(
      [{ host: redisClusterHost, port: parseInt(process.env.REDIS_PORT || '6379', 10) }],
      {
        dnsLookup: (address, callback) => callback(null, address),
        redisOptions: {
          password: redisPassword,
          tls: process.env.REDIS_TLS === 'false' ? undefined : {},
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        },
      }
    ) as unknown as Redis)
  : new Redis(redisUrl, {
      password: redisPassword,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: process.env.NODE_ENV === 'test',
      retryStrategy(times) {
        if (process.env.NODE_ENV === 'test') return null;
        return Math.min(times * 50, 2000);
      },
    });

bullmqConnection.on('error', (err) => {
  console.error('[BullMQ Redis] Error:', err);
});
