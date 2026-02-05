export const maxDuration = 60;
import { NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { getUserTier, RATE_LIMITS, type AIFeature, type SubscriptionTier } from '@/lib/ai/rate-limiter';

const ALL_FEATURES: AIFeature[] = ['insights', 'auto_budget', 'afford_check', 'product_scan', 'receipt_scan', 'coaching', 'payoff_plan'];

function getPeriodKey(period: 'daily' | 'weekly' | 'monthly'): string {
  const now = new Date();
  switch (period) {
    case 'daily':
      return `daily:${now.toISOString().split('T')[0]}`;
    case 'weekly': {
      const jan1 = new Date(now.getFullYear(), 0, 1);
      const days = Math.floor((now.getTime() - jan1.getTime()) / 86400000);
      const week = Math.ceil((days + jan1.getDay() + 1) / 7);
      return `weekly:${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
    }
    case 'monthly':
      return `monthly:${now.toISOString().slice(0, 7)}`;
  }
}

export async function GET() {
  try {
    const guard = await apiGuard(10);
    if (guard.error) return guard.error;
    const { user, supabase } = guard;

    const { tier, hasByok } = await getUserTier(supabase, user.id);
    const tierConfig = RATE_LIMITS[tier as SubscriptionTier] || RATE_LIMITS.free;

    // Fetch all usage counts for this user in current periods
    const periodKeys: string[] = [];
    const periodsSet = new Set<string>();
    for (const feature of ALL_FEATURES) {
      const config = tierConfig[feature];
      const key = getPeriodKey(config.period);
      if (!periodsSet.has(key)) {
        periodsSet.add(key);
        periodKeys.push(key);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: usageRows } = await (supabase.from as any)('ai_usage_counts')
      .select('feature, period, count')
      .eq('user_id', user.id)
      .in('period', periodKeys);

    // Build a lookup map
    const usageMap: Record<string, number> = {};
    if (usageRows) {
      for (const row of usageRows) {
        usageMap[`${row.feature}:${row.period}`] = row.count || 0;
      }
    }

    // Build features response
    const features: Record<string, { used: number; limit: number; period: string; remaining: number }> = {};
    for (const feature of ALL_FEATURES) {
      const config = tierConfig[feature];
      const periodKey = getPeriodKey(config.period);
      const used = usageMap[`${feature}:${periodKey}`] || 0;
      const limit = (hasByok && tier === 'pro') ? -1 : config.limit;
      const remaining = limit === -1 ? -1 : limit === 0 ? 0 : Math.max(0, limit - used);

      features[feature] = {
        used,
        limit,
        period: config.period,
        remaining,
      };
    }

    return NextResponse.json({
      tier,
      hasByok,
      features,
    });
  } catch (error) {
    console.error('AI limits GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch limits' },
      { status: 500 }
    );
  }
}
