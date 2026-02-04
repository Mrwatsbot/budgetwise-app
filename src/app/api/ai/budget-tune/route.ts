export const maxDuration = 60;
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateBudgetTune } from '@/lib/ai/openrouter';
import { checkRateLimit, incrementUsage, getUserTier } from '@/lib/ai/rate-limiter';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
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

    // Rate limit check — share limits with auto_budget
    const { tier, hasByok } = await getUserTier(supabase, user.id);
    const rateCheck = await checkRateLimit(supabase, user.id, tier, 'auto_budget', hasByok);
    if (!rateCheck.allowed) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        message: rateCheck.message,
        remaining: rateCheck.remaining,
        limit: rateCheck.limit,
      }, { status: 429 });
    }

    // Get current month in local timezone format
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // Fetch current month's budgets + actual spending
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: budgets } = await (supabase.from as any)('budgets')
      .select('*, category:categories(id, name, type)')
      .eq('user_id', user.id)
      .eq('month', currentMonth);

    // Fetch current month transactions
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: currentTransactions } = await (supabase.from as any)('transactions')
      .select('amount, category:categories(id, name, type)')
      .eq('user_id', user.id)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      .eq('type', 'expense');

    // Calculate current month spending by category
    const currentSpending: Record<string, number> = {};
    (currentTransactions || []).forEach((t: { amount: number; category?: { id: string; name: string } | null }) => {
      if (t.category?.id) {
        currentSpending[t.category.id] = (currentSpending[t.category.id] || 0) + Math.abs(t.amount);
      }
    });

    // Fetch previous months' spending (up to 3 months back)
    const monthsHistory: { month: string; spending: Record<string, number> }[] = [];
    for (let i = 1; i <= 3; i++) {
      const histMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const histMonthStr = `${histMonth.getFullYear()}-${String(histMonth.getMonth() + 1).padStart(2, '0')}-01`;
      const histStart = new Date(histMonth.getFullYear(), histMonth.getMonth(), 1).toISOString();
      const histEnd = new Date(histMonth.getFullYear(), histMonth.getMonth() + 1, 0, 23, 59, 59).toISOString();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: histTransactions } = await (supabase.from as any)('transactions')
        .select('amount, category:categories(id, name, type)')
        .eq('user_id', user.id)
        .gte('date', histStart)
        .lte('date', histEnd)
        .eq('type', 'expense');

      const histSpending: Record<string, number> = {};
      (histTransactions || []).forEach((t: { amount: number; category?: { id: string; name: string } | null }) => {
        if (t.category?.id) {
          histSpending[t.category.id] = (histSpending[t.category.id] || 0) + Math.abs(t.amount);
        }
      });

      monthsHistory.push({
        month: histMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        spending: histSpending,
      });
    }

    // Fetch categories, debts, savings goals, monthly income (same as auto-budget)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [categoriesRes, debtsRes, savingsRes, profileRes] = await Promise.all([
      (supabase.from as any)('categories')
        .select('id, name, type, icon, color')
        .order('sort_order'),
      (supabase.from as any)('debts')
        .select('name, monthly_payment, minimum_payment, current_balance, apr')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('is_paid_off', false),
      (supabase.from as any)('savings_goals')
        .select('name, monthly_contribution, target_amount, current_amount')
        .eq('user_id', user.id)
        .eq('is_active', true),
      (supabase.from as any)('profiles')
        .select('monthly_income')
        .eq('id', user.id)
        .single(),
    ]);

    const categories = categoriesRes.data || [];
    const debts = debtsRes.data || [];
    const savings = savingsRes.data || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const monthlyIncome = (profileRes.data as any)?.monthly_income || 0;

    // Build financial profile string for AI
    const budgetCategories = categories.filter((c: { type: string }) => c.type !== 'income');
    const categoryList = budgetCategories.map(
      (c: { id: string; name: string; type: string }) => `  - ${c.name} (id: ${c.id}, type: ${c.type})`
    ).join('\n');

    // Build current month budget vs actual table
    const budgetMap: Record<string, { budgeted: number; categoryName: string }> = {};
    (budgets || []).forEach((b: { category_id: string; budgeted: number; category?: { name: string } | null }) => {
      if (b.category_id) {
        budgetMap[b.category_id] = {
          budgeted: b.budgeted,
          categoryName: b.category?.name || 'Unknown',
        };
      }
    });

    const currentMonthStr = budgetCategories
      .filter((c: { id: string }) => budgetMap[c.id] || currentSpending[c.id])
      .map((c: { id: string; name: string }) => {
        const budgeted = budgetMap[c.id]?.budgeted || 0;
        const spent = currentSpending[c.id] || 0;
        const diff = spent - budgeted;
        const status = diff > 0 ? `OVER by $${diff.toFixed(2)}` : diff < 0 ? `under by $${Math.abs(diff).toFixed(2)}` : 'on track';
        return `  - ${c.name}: budgeted $${budgeted.toFixed(2)}, spent $${spent.toFixed(2)} (${status})`;
      })
      .join('\n');

    // Build historical spending table
    const historicalStr = monthsHistory
      .map(({ month, spending }) => {
        const categoryLines = budgetCategories
          .filter((c: { id: string }) => spending[c.id])
          .map((c: { id: string; name: string }) => `      ${c.name}: $${(spending[c.id] || 0).toFixed(2)}`)
          .join('\n');
        return `  ${month}:\n${categoryLines || '      (no data)'}`;
      })
      .join('\n');

    const totalDebtPayments = debts.reduce(
      (sum: number, d: { monthly_payment: number | null; minimum_payment: number | null }) =>
        sum + (d.monthly_payment || d.minimum_payment || 0),
      0
    );
    const totalSavingsContributions = savings.reduce(
      (sum: number, s: { monthly_contribution: number | null }) =>
        sum + (s.monthly_contribution || 0),
      0
    );

    const profile = `Monthly take-home income: $${monthlyIncome}

Current Month Budget vs Actual:
${currentMonthStr || '  (no budgets set)'}

Previous Months' Spending:
${historicalStr || '  (no historical data)'}

Total monthly debt payments: $${totalDebtPayments.toFixed(2)}
Total monthly savings contributions: $${totalSavingsContributions.toFixed(2)}

Available budget categories (allocate to these ONLY — use exact names and IDs):
${categoryList}

IMPORTANT: Analyze spending patterns across months. Identify categories that are consistently over or under budget. Reallocate to match reality while keeping total = income. Do NOT raid savings to fund overspending — adjust expense categories only.`;

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

    // Call AI
    const response = await generateBudgetTune(profile, apiKeyOverride);

    // Parse response
    let result;
    try {
      let content = response.content.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      result = JSON.parse(content);
    } catch {
      return NextResponse.json({
        result: null,
        raw: response.content,
        error: 'Failed to parse AI response as JSON',
        model: response.model,
        usage: response.usage,
        estimatedCost: response.estimatedCost,
        generated_at: new Date().toISOString(),
      });
    }

    // Attach current budgets to result for diff view
    result.current_budgets = budgetMap;

    // Log AI usage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)('ai_usage').insert({
      user_id: user.id,
      feature: 'auto_budget', // Share feature key with auto-budget
      tokens_input: response.usage?.prompt_tokens || 0,
      tokens_output: response.usage?.completion_tokens || 0,
    });

    // Increment rate limit counter
    await incrementUsage(supabase, user.id, 'auto_budget');

    return NextResponse.json({
      result,
      model: response.model,
      usage: response.usage,
      estimatedCost: response.estimatedCost,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Budget tune error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate budget tune-up' },
      { status: 500 }
    );
  }
}
