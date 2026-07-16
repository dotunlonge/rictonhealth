export declare function checkDatabase(prisma: {
    $queryRaw: (query: TemplateStringsArray) => Promise<unknown>;
}): Promise<void>;
export declare function checkRedis(redis: {
    ping: () => Promise<string>;
}): Promise<void>;
