// Simple in-memory rate limiter using Map
// Key: `${identifier}:${window}` → { count, resetAt }
// This is per-instance (Vercel serverless), so it's a best-effort limiter
// For production, use Upstash Redis or Vercel KV

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}

const cache = new Map<string, { count: number; resetAt: number }>();

// Periodic cleanup to prevent memory leaks (every 5 minutes)
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60 * 1000;

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, value] of cache.entries()) {
    if (value.resetAt < now) {
      cache.delete(key);
    }
  }
}

export function rateLimit(
  identifier: string,     // user ID or IP
  limit: number = 60,     // max requests
  windowMs: number = 60 * 1000 // per minute
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const key = `${identifier}:${windowMs}`;
  const entry = cache.get(key);

  if (!entry || entry.resetAt < now) {
    // New window
    const resetAt = now + windowMs;
    cache.set(key, { count: 1, resetAt });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: resetAt,
    };
  }

  // Existing window
  entry.count++;

  if (entry.count > limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: entry.resetAt,
    };
  }

  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - entry.count),
    reset: entry.resetAt,
  };
}
