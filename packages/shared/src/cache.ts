import { redis } from './redis';

export interface CacheOptions {
  ttlSeconds: number;
  prefix?: string;
}

// All cache operations are best-effort: a cache outage degrades to direct
// database reads, never to 5xx. Callers must treat null as a normal miss.
export async function getCached<T>(key: string, options: CacheOptions): Promise<T | null> {
  const { prefix = 'cache' } = options;
  let cached: string | null = null;
  try {
    cached = await redis.get(`${prefix}:${key}`);
  } catch {
    return null;
  }
  if (!cached) return null;
  try {
    return JSON.parse(cached) as T;
  } catch {
    return null;
  }
}

export async function setCached<T>(key: string, value: T, options: CacheOptions): Promise<void> {
  const { ttlSeconds, prefix = 'cache' } = options;
  try {
    await redis.set(`${prefix}:${key}`, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Best-effort write; the request already has its data.
  }
}

export async function invalidateCache(keyPattern: string, prefix = 'cache'): Promise<void> {
  try {
    const keys = await redis.keys(`${prefix}:${keyPattern}`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Best-effort invalidation.
  }
}

export function makeCacheKey(parts: (string | number | boolean | undefined | null)[]): string {
  return parts.filter((p) => p !== undefined && p !== null).join(':');
}
