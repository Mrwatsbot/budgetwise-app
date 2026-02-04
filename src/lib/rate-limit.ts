/**
 * Edge Rate Limiter (Upstash Redis)
 *
 * Uses Upstash Redis with a sliding-window algorithm for low-latency
 * rate limiting (~1ms per check vs ~50ms with Supabase writes).
 * Falls back to allowing all requests if Upstash env vars aren't set.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}

// Cache Ratelimit instances by config key to avoid re-creating them
const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  const key = `${limit}:${windowMs}`;
  let limiter = limiters.get(key);
  if (limiter) return limiter;

  const redis = new Redis({ url, token });

  // Convert windowMs to the closest duration string for Upstash
  const windowSeconds = Math.ceil(windowMs / 1000);
  limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    analytics: false,
    prefix: 'rl',
  });

  limiters.set(key, limiter);
  return limiter;
}

/**
 * Rate limit a user for a specific endpoint.
 * @param identifier - User ID or IP address
 * @param limit - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns RateLimitResult with success status and metadata
 */
export async function rateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60 * 1000 // 1 minute default
): Promise<RateLimitResult> {
  try {
    const limiter = getLimiter(limit, windowMs);

    if (!limiter) {
      // Upstash not configured — fail open (allow request)
      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: Date.now() + windowMs,
      };
    }

    const result = await limiter.limit(identifier);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    // On any unexpected error, fail open
    console.error('Rate limit error:', error);
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: Date.now() + windowMs,
    };
  }
}
