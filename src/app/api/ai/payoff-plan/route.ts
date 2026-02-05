export const maxDuration = 60;
import { NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { generatePayoffPlan } from '@/lib/ai/openrouter';
import { checkRateLimit, incrementUsage, getUserTier } from '@/lib/ai/rate-limiter';

export async function POST() {
  try {
    const guard = await apiGuard(10);
    if (guard.error) return guard.error;
    const { user, supabase } = guard;

    // Rate limit check
    const { tier, hasByok } = await getUserTier(supabase, user.id);
    const rateCheck = await checkRateLimit(supabase, user.id, tier, 'payoff_plan', hasByok);
    if (!rateCheck.allowed) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        message: rateCheck.message,
        remaining: rateCheck.remaining,
        limit: rateCheck.limit,
      }, { status: 429 });
    }

    // Fetch all active debts for this user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: debts } = await (supabase.from as any)('debts')
      .select('name, type, current_balance, original_balance, apr, minimum_payment, monthly_payment')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('is_paid_off', false);

    const debtList = debts || [];
    if (debtList.length === 0) {
      return NextResponse.json({ error: 'No active debts found' }, { status: 400 });
    }

    // Build a data summary string with ALL debt details
    // PII stripped: debt names replaced with generic labels
    const debtSummary = `Active debts (${debtList.length}):\n` +
      `Note: All data is anonymized. Names are replaced with generic labels.\n` +
      debtList.map((d: {
        name: string;
        type: string;
        current_balance: number;
        original_balance: number | null;
        apr: number | null;
        minimum_payment: number | null;
        monthly_payment: number | null;
      }, i: number) =>
        `  ${i + 1}. Debt ${i + 1} (${d.type}): Balance $${d.current_balance.toFixed(2)}, ` +
        `Original balance $${(d.original_balance || d.current_balance).toFixed(2)}, ` +
        `APR ${d.apr || 0}%, ` +
        `Min payment $${(d.minimum_payment || 0).toFixed(2)}, ` +
        `Monthly payment $${(d.monthly_payment || 0).toFixed(2)}`
      ).join('\n') +
      `\n\nTotal debt: $${debtList.reduce((s: number, d: { current_balance: number }) => s + d.current_balance, 0).toFixed(2)}` +
      `\nTotal minimum payments: $${debtList.reduce((s: number, d: { minimum_payment: number | null }) => s + (d.minimum_payment || 0), 0).toFixed(2)}` +
      `\nTotal monthly payments: $${debtList.reduce((s: number, d: { monthly_payment: number | null }) => s + (d.monthly_payment || 0), 0).toFixed(2)}`;

    // Fetch BYOK key if applicable
    let apiKeyOverride: string | undefined;
    if (hasByok && tier === 'pro') {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('openrouter_api_key')
        .eq('id', user.id)
        .single();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiKeyOverride = (profileData as any)?.openrouter_api_key || undefined;
    }

    // Call AI to generate the payoff plan
    const response = await generatePayoffPlan(debtSummary, apiKeyOverride);

    // Try to parse the AI response as JSON
    let plan;
    try {
      // Strip markdown code fences if present
      let content = response.content.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      plan = JSON.parse(content);
    } catch {
      // If JSON parsing fails, return the raw content
      return NextResponse.json({
        plan: null,
        raw: response.content,
        error: 'Failed to parse AI response as JSON',
        model: response.model,
        usage: response.usage,
        estimatedCost: response.estimatedCost,
        generated_at: new Date().toISOString(),
      });
    }

    // Log AI usage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)('ai_usage').insert({
      user_id: user.id,
      feature: 'payoff_plan',
      tokens_input: response.usage?.prompt_tokens || 0,
      tokens_output: response.usage?.completion_tokens || 0,
    });

    // Increment rate limit counter
    await incrementUsage(supabase, user.id, 'payoff_plan');

    return NextResponse.json({
      plan,
      model: response.model,
      usage: response.usage,
      estimatedCost: response.estimatedCost,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Payoff plan error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate payoff plan' },
      { status: 500 }
    );
  }
}
