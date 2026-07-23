import { redis } from './redis';

export interface CacheOptions {
  ttlSeconds: number;
  prefix?: string;
}

export async function getCached<T>(key: string, options: CacheOptions): Promise<T | null> {
  const { prefix = 'cache' } = options;
  const cached = await redis.get(`${prefix}:${key}`);
  if (!cached) return null;
  try {
    return JSON.parse(cached) as T;
  } catch {
    return null;
  }
}

export async function setCached<T>(key: string, value: T, options: CacheOptions): Promise<void> {
  const { ttlSeconds, prefix = 'cache' } = options;
  await redis.set(`${prefix}:${key}`, JSON.stringify(value), 'EX', ttlSeconds);
}

export async function invalidateCache(keyPattern: string, prefix = 'cache'): Promise<void> {
  const keys = await redis.keys(`${prefix}:${keyPattern}`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

export function makeCacheKey(parts: (string | number | boolean | undefined | null)[]): string {
  return parts.filter((p) => p !== undefined && p !== null).join(':');
}
