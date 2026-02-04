export const maxDuration = 60;
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeSpending, findSavings, debtStrategy, budgetSuggestions, scoreCoach } from '@/lib/ai/openrouter';
import { rateLimit } from '@/lib/rate-limit';
import { checkRateLimit, incrementUsage, getUserTier, type AIFeature } from '@/lib/ai/rate-limiter';

const ACTION_FEATURE_MAP: Record<string, AIFeature> = {
  analyze_spending: 'insights',
  find_savings: 'insights',
  debt_strategy: 'coaching',
  budget_suggestions: 'coaching',
  score_coach: 'coaching',
};

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await rateLimit(user.id, 10);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json();
    const { action, data } = body;

    if (!action || !data) {
      return NextResponse.json({ error: 'Missing action or data' }, { status: 400 });
    }

    const validActions = ['analyze_spending', 'find_savings', 'debt_strategy', 'budget_suggestions', 'score_coach'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Tier-based rate limiting (prevents free users from bypassing gates)
    const { tier, hasByok } = await getUserTier(supabase, user.id);
    const feature = ACTION_FEATURE_MAP[action] || 'insights';
    const rateCheck = await checkRateLimit(supabase, user.id, tier, feature, hasByok);
    if (!rateCheck.allowed) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        message: rateCheck.message,
        remaining: rateCheck.remaining,
        limit: rateCheck.limit,
      }, { status: 429 });
    }

    let response;

    switch (action) {
      case 'analyze_spending':
        response = await analyzeSpending(data);
        break;
      case 'find_savings':
        response = await findSavings(data);
        break;
      case 'debt_strategy':
        response = await debtStrategy(data);
        break;
      case 'budget_suggestions':
        response = await budgetSuggestions(data);
        break;
      case 'score_coach':
        response = await scoreCoach(data);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Log AI usage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)('ai_usage').insert({
      user_id: user.id,
      feature: action,
      tokens_input: response.usage?.prompt_tokens || 0,
      tokens_output: response.usage?.completion_tokens || 0,
    });

    // Increment rate limit counter
    await incrementUsage(supabase, user.id, feature);

    return NextResponse.json({
      result: response.content,
    });
  } catch (error) {
    console.error('AI API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI analysis failed' },
      { status: 500 }
    );
  }
}
