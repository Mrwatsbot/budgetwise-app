/**
 * Token Budget System — Phase 1
 * Checks remaining budget before each AI call.
 * Tracks usage in token_usage_daily table.
 */

import { SupabaseClient } from '@supabase/supabase-js';

export type ChatTier = 'free' | 'plus' | 'pro';

const TOKEN_BUDGETS = {
  free: {
    monthlyTokens: 25_000,
    dailyMessages: 10,
    maxOutputPerResponse: 200,
  },
  plus: {
    monthlyTokens: 150_000,
    dailyMessages: 50,
    maxOutputPerResponse: 350,
  },
  pro: {
    monthlyTokens: 400_000,
    dailyMessages: 200,
    maxOutputPerResponse: 500,
  },
} as const;

export interface BudgetCheckResult {
  allowed: boolean;
  remaining: number;
  usagePercent: number;
  resetDate: string;
  dailyRemaining: number;
  warning?: string;
}

/**
 * Get the current billing cycle based on user's creation date.
 * For now, uses account creation date as anchor (Stripe integration later).
 */
function getBillingCycle(anchorDate: Date, now: Date = new Date()) {
  const anchorDay = Math.min(anchorDate.getDate(), 28); // Clamp to 28 for safety

  let periodStart = new Date(now.getFullYear(), now.getMonth(), anchorDay);
  if (periodStart > now) {
    periodStart = new Date(now.getFullYear(), now.getMonth() - 1, anchorDay);
  }

  const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, anchorDay);

  return { periodStart, periodEnd };
}

/**
 * Check if the user has remaining token budget and daily messages.
 */
export async function checkTokenBudget(
  supabase: SupabaseClient,
  userId: string,
  tier: ChatTier
): Promise<BudgetCheckResult> {
  const limits = TOKEN_BUDGETS[tier];
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Get user's creation date for billing anchor
  const { data: profile } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('id', userId)
    .single();

  const anchorDate = profile?.created_at ? new Date(profile.created_at) : now;
  const { periodStart, periodEnd } = getBillingCycle(anchorDate, now);

  // Get period token usage (sum all days in the billing period)
  const { data: periodUsage } = await supabase
    .from('token_usage_daily')
    .select('input_tokens, output_tokens, ai_message_count')
    .eq('user_id', userId)
    .gte('date', periodStart.toISOString().split('T')[0])
    .lte('date', today);

  let periodTokens = 0;
  if (periodUsage) {
    for (const row of periodUsage) {
      periodTokens += (row.input_tokens || 0) + (row.output_tokens || 0);
    }
  }

  // Get today's message count
  const { data: todayUsage } = await supabase
    .from('token_usage_daily')
    .select('ai_message_count')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  const dailyMessages = todayUsage?.ai_message_count || 0;
  const remaining = Math.max(0, limits.monthlyTokens - periodTokens);
  const usagePercent = periodTokens / limits.monthlyTokens;
  const dailyRemaining = Math.max(0, limits.dailyMessages - dailyMessages);

  const resetDate = periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Check daily message limit
  if (dailyRemaining <= 0) {
    return {
      allowed: false,
      remaining,
      usagePercent,
      resetDate: 'tomorrow',
      dailyRemaining: 0,
      warning: "You've reached today's chat limit. More messages available tomorrow!",
    };
  }

  // Check monthly token budget
  if (remaining <= 0) {
    const upgradeHint = tier === 'pro' ? '' : ' Upgrade for higher limits.';
    return {
      allowed: false,
      remaining: 0,
      usagePercent: 1,
      resetDate,
      dailyRemaining,
      warning: `You've reached your AI assistant limit for this period. Resets ${resetDate}.${upgradeHint}`,
    };
  }

  // Warning at 80%
  let warning: string | undefined;
  if (usagePercent >= 0.80 && usagePercent < 1.0) {
    warning = `You've used ${Math.round(usagePercent * 100)}% of your AI assistant budget this period.`;
  }

  return {
    allowed: true,
    remaining,
    usagePercent,
    resetDate,
    dailyRemaining,
    warning,
  };
}

/**
 * Record token usage after a response.
 */
export async function recordTokenUsage(
  supabase: SupabaseClient,
  userId: string,
  inputTokens: number,
  outputTokens: number,
  source: 'ai_generated' | 'kb_match' | 'canned'
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  // Estimate cost in cents (Gemini Flash pricing: $0.10/M input, $0.40/M output)
  const costCents = (inputTokens * 0.10 / 1_000_000 + outputTokens * 0.40 / 1_000_000) * 100;

  // Try to update existing row
  const { data: existing } = await supabase
    .from('token_usage_daily')
    .select('id, input_tokens, output_tokens, message_count, ai_message_count, kb_match_count, canned_response_count, cost_estimate_cents')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (existing) {
    await supabase
      .from('token_usage_daily')
      .update({
        input_tokens: (existing.input_tokens || 0) + inputTokens,
        output_tokens: (existing.output_tokens || 0) + outputTokens,
        message_count: (existing.message_count || 0) + 1,
        ai_message_count: (existing.ai_message_count || 0) + (source === 'ai_generated' ? 1 : 0),
        kb_match_count: (existing.kb_match_count || 0) + (source === 'kb_match' ? 1 : 0),
        canned_response_count: (existing.canned_response_count || 0) + (source === 'canned' ? 1 : 0),
        cost_estimate_cents: (existing.cost_estimate_cents || 0) + costCents,
      })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('token_usage_daily')
      .insert({
        user_id: userId,
        date: today,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        message_count: 1,
        ai_message_count: source === 'ai_generated' ? 1 : 0,
        kb_match_count: source === 'kb_match' ? 1 : 0,
        canned_response_count: source === 'canned' ? 1 : 0,
        cost_estimate_cents: costCents,
      });
  }
}

/**
 * Get max output tokens for a tier.
 */
export function getMaxOutputTokens(tier: ChatTier): number {
  return TOKEN_BUDGETS[tier].maxOutputPerResponse;
}
