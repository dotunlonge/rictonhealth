type RedisValue = string | Record<string, string>;

const store: Record<string, RedisValue> = {};

export function createRedisMock() {
  return {
    ping: jest.fn().mockResolvedValue('PONG'),
    get: jest.fn().mockImplementation(async (key: string) => {
      const val = store[key];
      if (val && typeof val === 'object') return null;
      return val || null;
    }),
    set: jest.fn().mockImplementation(async (key: string, val: string, ..._args: unknown[]) => {
      store[key] = val;
      return 'OK';
    }),
    del: jest.fn().mockImplementation(async (key: string) => {
      delete store[key];
      return 1;
    }),
    hset: jest.fn().mockImplementation(async (key: string, field: string, value: string) => {
      if (!store[key] || typeof store[key] === 'string') {
        store[key] = {};
      }
      (store[key] as Record<string, string>)[field] = value;
      return 1;
    }),
    hdel: jest.fn().mockImplementation(async (key: string, field: string) => {
      if (store[key] && typeof store[key] === 'object') {
        delete (store[key] as Record<string, string>)[field];
        if (Object.keys(store[key] as Record<string, string>).length === 0) {
          delete store[key];
        }
      }
      return 1;
    }),
    hexists: jest.fn().mockImplementation(async (key: string, field: string) => {
      if (store[key] && typeof store[key] === 'object') {
        return Object.prototype.hasOwnProperty.call(store[key] as Record<string, string>, field)
          ? 1
          : 0;
      }
      return 0;
    }),
    hgetall: jest.fn().mockImplementation(async (key: string) => {
      if (store[key] && typeof store[key] === 'object') {
        return { ...(store[key] as Record<string, string>) };
      }
      return {};
    }),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(600),
    quit: jest.fn().mockResolvedValue('OK'),
  };
}

export function clearRedisStore() {
  for (const key in store) {
    delete store[key];
  }
}
