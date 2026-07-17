import { redisClient } from "../config/redis.js";
import { expiryToSeconds } from "../utils/time.utils.js";
import { env } from "../config/env.js";



const PREFIX = "refresh_token";

function buildKey(userId: string, tokenId: string): string {
  return `${PREFIX}:${userId}:${tokenId}`;
}

export const tokenStore = {
 
  async save(userId: string, tokenId: string): Promise<void> {
    const ttlSeconds = expiryToSeconds(env.refreshTokenExpiresIn);
    await redisClient.set(buildKey(userId, tokenId), "valid", { EX: ttlSeconds });
  },

  
  async exists(userId: string, tokenId: string): Promise<boolean> {
    const result = await redisClient.get(buildKey(userId, tokenId));
    return result !== null;
  },

  
  async revoke(userId: string, tokenId: string): Promise<void> {
    await redisClient.del(buildKey(userId, tokenId));
  },

  
 async revokeAll(userId: string): Promise<void> {
    const pattern = `${PREFIX}:${userId}:*`;
    
    // Create a transaction chain
    const transaction = redisClient.multi();
    let hasKeys = false;

    for await (const key of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      // .del here takes a single string, which perfectly matches your package types!
      transaction.del(key);
      hasKeys = true;
    }

    if (hasKeys) {
      // Executes all the deletions together in one single network round-trip
      await transaction.exec();
    }
  },

  /**
   * Scans Redis for EVERY currently-valid refresh token, across every
   * user, and returns which userId each one belongs to.
   *
   * This is what "see all logged-in users" is actually built on: a user
   * counts as "logged in" if they have at least one refresh-token key
   * still alive in Redis (haven't logged out, and it hasn't expired).
   * Redis's TTL (see `save()` above) means a session that goes quiet
   * just expires and disappears from this list on its own — no manual
   * cleanup job needed.
   *
   * One user can appear more than once here if they're signed in on
   * multiple devices/browsers (each login creates its own tokenId) —
   * the caller (admin.controller.ts) is the one that groups these back
   * down to one row per user, with a "device count".
   */
  async listActiveSessions(): Promise<{ userId: string; tokenId: string }[]> {
    const sessions: { userId: string; tokenId: string }[] = [];

    // Note: scanIterator here yields BATCHES of keys (string[]), not one
    // key at a time — that's why there's a second, inner loop. (You can
    // see the same shape already at work in revokeAll() above, where
    // `transaction.del(key)` is called with a whole batch array at once.)
    for await (const keyBatch of redisClient.scanIterator({ MATCH: `${PREFIX}:*`, COUNT: 100 })) {
      const keys = Array.isArray(keyBatch) ? keyBatch : [keyBatch];
      for (const key of keys) {
        // key looks like: "refresh_token:<userId>:<tokenId>"
        const parts = key.split(":");
        const userId = parts[1];
        const tokenId = parts[2];
        if (userId && tokenId) sessions.push({ userId, tokenId });
      }
    }

    return sessions;
  },
};
