import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

/**
 * API Guard: Auth check + rate limiting in one call.
 * Returns the user and supabase client, or an error response.
 * 
 * Usage:
 *   const guard = await apiGuard(30); // 30 req/min
 *   if (guard.error) return guard.error;
 *   const { user, supabase } = guard;
 */
export async function apiGuard(rateLimitPerMinute: number = 60) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    logger.warn('API request unauthorized', {
      statusCode: 401,
    });
    
    return {
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
      user: null,
      supabase: null,
    };
  }

  const rl = await rateLimit(user.id, rateLimitPerMinute);
  if (!rl.success) {
    logger.warn('Rate limit exceeded', {
      userId: user.id,
      limit: rl.limit,
      statusCode: 429,
    });
    
    return {
      error: NextResponse.json(
        { error: 'Too many requests', retryAfter: Math.ceil((rl.reset - Date.now()) / 1000) },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(rl.limit),
            'X-RateLimit-Remaining': String(rl.remaining),
            'X-RateLimit-Reset': String(rl.reset),
          },
        }
      ),
      user: null,
      supabase: null,
    };
  }

  return { error: null, user, supabase };
}
