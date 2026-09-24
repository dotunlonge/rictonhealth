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
      // Honor real Redis NX semantics: SET ... NX must fail when the key exists.
      if (_args.includes('NX') && Object.prototype.hasOwnProperty.call(store, key)) {
        return null;
      }
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
    sadd: jest.fn().mockImplementation(async (key: string, ...members: string[]) => {
      if (!store[key] || typeof store[key] === 'string') {
        store[key] = {};
      }
      for (const m of members) {
        (store[key] as Record<string, string>)[m] = '1';
      }
      return members.length;
    }),
    srem: jest.fn().mockImplementation(async (key: string, member: string) => {
      if (store[key] && typeof store[key] === 'object') {
        delete (store[key] as Record<string, string>)[member];
        return 1;
      }
      return 0;
    }),
    smembers: jest.fn().mockImplementation(async (key: string) => {
      if (store[key] && typeof store[key] === 'object') {
        return Object.keys(store[key] as Record<string, string>);
      }
      return [];
    }),
    sismember: jest.fn().mockImplementation(async (key: string, member: string) => {
      if (store[key] && typeof store[key] === 'object') {
        return Object.prototype.hasOwnProperty.call(store[key] as Record<string, string>, member)
          ? 1
          : 0;
      }
      return 0;
    }),
    pipeline: jest.fn().mockImplementation(() => {
      const queue: Array<() => Promise<[Error | null, unknown]>> = [];
      const p = {
        get: jest.fn().mockImplementation((key: string) => {
          queue.push(async () => {
            const val = store[key];
            if (val && typeof val === 'object') return [null, null];
            return [null, val || null];
          });
          return p;
        }),
        del: jest.fn().mockImplementation((key: string) => {
          queue.push(async () => {
            delete store[key];
            return [null, 1];
          });
          return p;
        }),
        exec: jest.fn().mockImplementation(async () => {
          const results = [];
          for (const op of queue) {
            results.push(await op());
          }
          return results;
        }),
      };
      return p;
    }),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(600),
    quit: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn().mockResolvedValue('OK'),
  };
}

export function clearRedisStore() {
  for (const key in store) {
    delete store[key];
  }
}
