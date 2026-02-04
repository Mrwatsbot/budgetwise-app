/**
 * Redis Cache Helper (Upstash)
 *
 * Simple get/set cache backed by Upstash Redis for use in serverless
 * environments. Gracefully falls back to no-cache when Redis isn't
 * configured or is unreachable.
 */

import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  redis = new Redis({ url, token });
  return redis;
}

/**
 * Get a cached value by key. Returns null on miss or error.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedis();
    if (!client) return null;

    const data = await client.get<T>(key);
    return data ?? null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Set a cached value with a TTL (in seconds).
 */
export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    const client = getRedis();
    if (!client) return;

    await client.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

/**
 * Delete a cached key (bust the cache).
 */
export async function cacheDel(key: string): Promise<void> {
  try {
    const client = getRedis();
    if (!client) return;

    await client.del(key);
  } catch (error) {
    console.error('Cache del error:', error);
  }
}
