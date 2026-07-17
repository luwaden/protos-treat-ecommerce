import { createClient, type RedisClientType } from "redis";
import { env } from "./env.js";

/**
 * A single, shared Redis connection for the whole app.
 *
 * Think of this the same way you think of the Prisma client:
 * you create ONE instance and reuse it everywhere, instead of
 * opening a brand-new connection every time you need Redis.
 */
export const redisClient: RedisClientType = createClient({
  url: env.redisUrl,
});

redisClient.on("error", (err) => {
  console.error("❌ Redis Client Error:", err);
});

redisClient.on("connect", () => {
  console.log("✅ Redis connected");
});


export async function connectRedis(): Promise<void> {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

/**
 * Call this when your server shuts down (optional, but clean).
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient.isOpen) {
    await redisClient.disconnect();
  }
}
