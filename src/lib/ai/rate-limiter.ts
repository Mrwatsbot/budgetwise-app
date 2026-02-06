import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase/admin';

export type AIFeature = 'insights' | 'auto_budget' | 'afford_check' | 'product_scan' | 'receipt_scan' | 'coaching' | 'payoff_plan' | 'statement_import' | 'ai_letter';
export type SubscriptionTier = 'free' | 'basic' | 'plus' | 'pro';

interface RateLimitConfig {
  limit: number; // 0 = locked, -1 = unlimited
  period: 'daily' | 'weekly' | 'monthly';
}

const RATE_LIMITS: Record<SubscriptionTier, Record<AIFeature, RateLimitConfig>> = {
  free: {
    insights: { limit: 0, period: 'daily' },
    auto_budget: { limit: 0, period: 'monthly' },
    afford_check: { limit: 0, period: 'weekly' },
    product_scan: { limit: 0, period: 'weekly' },
    receipt_scan: { limit: 0, period: 'weekly' },
    coaching: { limit: 0, period: 'monthly' },
    payoff_plan: { limit: 0, period: 'monthly' },
    statement_import: { limit: 0, period: 'monthly' },
    ai_letter: { limit: 3, period: 'monthly' }, // Free users get 3 letters/month
  },
  basic: { // same as free for now
    insights: { limit: 0, period: 'daily' },
    auto_budget: { limit: 0, period: 'monthly' },
    afford_check: { limit: 0, period: 'weekly' },
    product_scan: { limit: 0, period: 'weekly' },
    receipt_scan: { limit: 0, period: 'weekly' },
    coaching: { limit: 0, period: 'monthly' },
    payoff_plan: { limit: 0, period: 'monthly' },
    statement_import: { limit: 0, period: 'monthly' },
    ai_letter: { limit: 3, period: 'monthly' },
  },
  plus: {
    insights: { limit: 5, period: 'daily' },
    auto_budget: { limit: 2, period: 'monthly' },
    afford_check: { limit: 3, period: 'weekly' },
    product_scan: { limit: 10, period: 'daily' },
    receipt_scan: { limit: 10, period: 'daily' },
    coaching: { limit: 3, period: 'monthly' },
    payoff_plan: { limit: 1, period: 'monthly' },
    statement_import: { limit: 5, period: 'monthly' },
    ai_letter: { limit: 15, period: 'monthly' },
  },
  pro: {
    insights: { limit: -1, period: 'daily' },
    auto_budget: { limit: -1, period: 'monthly' },
    afford_check: { limit: -1, period: 'weekly' },
    product_scan: { limit: -1, period: 'weekly' },
    receipt_scan: { limit: -1, period: 'weekly' },
    coaching: { limit: -1, period: 'monthly' },
    payoff_plan: { limit: -1, period: 'monthly' },
    statement_import: { limit: -1, period: 'monthly' },
    ai_letter: { limit: -1, period: 'monthly' }, // Unlimited for Pro
  },
};

function getPeriodKey(period: 'daily' | 'weekly' | 'monthly'): string {
  const now = new Date();
  switch (period) {
    case 'daily':
      return `daily:${now.toISOString().split('T')[0]}`;
    case 'weekly': {
      // ISO week
      const jan1 = new Date(now.getFullYear(), 0, 1);
      const days = Math.floor((now.getTime() - jan1.getTime()) / 86400000);
      const week = Math.ceil((days + jan1.getDay() + 1) / 7);
      return `weekly:${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
    }
    case 'monthly':
      return `monthly:${now.toISOString().slice(0, 7)}`;
  }
}

/**
 * Check if user can use a feature. Returns { allowed, remaining, limit, period }
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  tier: SubscriptionTier,
  feature: AIFeature
): Promise<{ allowed: boolean; remaining: number; limit: number; period: string; message?: string }> {
  const config = RATE_LIMITS[tier]?.[feature];
  if (!config) {
    return { allowed: false, remaining: 0, limit: 0, period: 'unknown', message: 'Unknown tier or feature' };
  }

  // Locked feature
  if (config.limit === 0) {
    return { allowed: false, remaining: 0, limit: 0, period: config.period, message: 'Upgrade to Plus to unlock this feature' };
  }

  // Unlimited
  if (config.limit === -1) {
    return { allowed: true, remaining: -1, limit: -1, period: config.period };
  }

  const periodKey = getPeriodKey(config.period);

  // Get current count via admin client (authoritative, not user-spoofable)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabaseAdmin.from as any)('ai_usage_counts')
    .select('count')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('period', periodKey)
    .single();

  const currentCount = data?.count || 0;
  const remaining = Math.max(0, config.limit - currentCount);

  if (currentCount >= config.limit) {
    const periodLabel = config.period === 'daily' ? 'today' : config.period === 'weekly' ? 'this week' : 'this month';
    return {
      allowed: false,
      remaining: 0,
      limit: config.limit,
      period: config.period,
      message: `You've used all ${config.limit} ${feature.replace(/_/g, ' ')} uses for ${periodLabel}. Upgrade to Pro for unlimited access.`,
    };
  }

  return { allowed: true, remaining: remaining - 1, limit: config.limit, period: config.period };
}

/**
 * Increment usage count after successful AI call.
 * Uses the admin (service role) client to bypass RLS — users cannot
 * manipulate their own usage counts since RLS blocks user writes.
 */
export async function incrementUsage(
  _supabase: SupabaseClient,
  userId: string,
  feature: AIFeature
): Promise<void> {
  // Determine period based on the feature's config (check all tiers to find the period)
  // We use 'plus' tier config as reference for the period type
  const config = RATE_LIMITS.plus[feature];
  const periodKey = getPeriodKey(config.period);

  // Use admin client (bypasses RLS) — users cannot write to ai_usage_counts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabaseAdmin.from as any)('ai_usage_counts')
    .select('id, count')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('period', periodKey)
    .single();

  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin.from as any)('ai_usage_counts')
      .update({ count: existing.count + 1 })
      .eq('id', existing.id);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin.from as any)('ai_usage_counts')
      .insert({ user_id: userId, feature, period: periodKey, count: 1 });
  }
}

/**
 * Get user's tier from profiles table.
 * Uses admin client to read the authoritative tier value — prevents
 * scenarios where a modified RLS policy could return spoofed data.
 */
export async function getUserTier(_supabase: SupabaseClient, userId: string): Promise<{ tier: SubscriptionTier }> {
  const { data } = await (supabaseAdmin as any)
    .from('profiles')
    .select('subscription_tier, subscription_status')
    .eq('id', userId)
    .single();

  let tier = (data?.subscription_tier as SubscriptionTier) || 'free';
  const status = (data as any)?.subscription_status;

  // Downgrade to free if subscription is not active
  if (status !== 'active' && tier !== 'free') {
    tier = 'free';
  }

  return { tier };
}

// Export for client-side display
export { RATE_LIMITS };
