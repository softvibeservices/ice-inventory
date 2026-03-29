/**
 * lib/rateLimit.ts
 *
 * Lightweight in-memory rate limiter for Next.js API routes.
 * Uses a sliding-window counter per key (e.g. IP + route).
 *
 * ⚠️  For multi-instance / serverless deployments swap the Map
 *     for a Redis store (e.g. @upstash/ratelimit).
 */

interface RateLimitEntry {
    count: number;
    windowStart: number;
  }
  
  const store = new Map<string, RateLimitEntry>();
  
  // Purge stale entries every 5 minutes to avoid memory leaks
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now - entry.windowStart > 10 * 60 * 1000) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  
  export interface RateLimitOptions {
    /** Maximum number of requests allowed within the window */
    limit: number;
    /** Window duration in seconds */
    windowSeconds: number;
  }
  
  export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
  }
  
  /**
   * Check and increment the rate-limit counter for `key`.
   *
   * @param key           Unique identifier (e.g. `"register:<ip>"`)
   * @param options       limit + windowSeconds
   */
  export function rateLimit(
    key: string,
    { limit, windowSeconds }: RateLimitOptions
  ): RateLimitResult {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
  
    let entry = store.get(key);
  
    if (!entry || now - entry.windowStart >= windowMs) {
      // Start a fresh window
      entry = { count: 1, windowStart: now };
      store.set(key, entry);
      return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
    }
  
    entry.count += 1;
  
    if (entry.count > limit) {
      const retryAfterSeconds = Math.ceil(
        (entry.windowStart + windowMs - now) / 1000
      );
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }
  
    return {
      allowed: true,
      remaining: limit - entry.count,
      retryAfterSeconds: 0,
    };
  }