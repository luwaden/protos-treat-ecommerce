import { type RedisClientType } from "redis";
/**
 * A single, shared Redis connection for the whole app.
 *
 * Think of this the same way you think of the Prisma client:
 * you create ONE instance and reuse it everywhere, instead of
 * opening a brand-new connection every time you need Redis.
 */
export declare const redisClient: RedisClientType;
export declare function connectRedis(): Promise<void>;
/**
 * Call this when your server shuts down (optional, but clean).
 */
export declare function disconnectRedis(): Promise<void>;
//# sourceMappingURL=redis.d.ts.map