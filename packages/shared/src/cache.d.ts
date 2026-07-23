export interface CacheOptions {
    ttlSeconds: number;
    prefix?: string;
}
export declare function getCached<T>(key: string, options: CacheOptions): Promise<T | null>;
export declare function setCached<T>(key: string, value: T, options: CacheOptions): Promise<void>;
export declare function invalidateCache(keyPattern: string, prefix?: string): Promise<void>;
export declare function makeCacheKey(parts: (string | number | boolean | undefined | null)[]): string;
