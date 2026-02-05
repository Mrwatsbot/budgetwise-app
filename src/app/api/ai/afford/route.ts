export const maxDuration = 60;
import { NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { checkAffordability } from '@/lib/ai/openrouter';
import { checkRateLimit, incrementUsage, getUserTier } from '@/lib/ai/rate-limiter';

export async function POST(request: Request) {
  try {
    const guard = await apiGuard(10);
    if (guard.error) return guard.error;
    const { user, supabase } = guard;

    // Rate limit check
    const { tier, hasByok } = await getUserTier(supabase, user.id);
    const rateCheck = await checkRateLimit(supabase, user.id, tier, 'afford_check', hasByok);
    if (!rateCheck.allowed) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        message: rateCheck.message,
        remaining: rateCheck.remaining,
        limit: rateCheck.limit,
      }, { status: 429 });
    }

    const body = await request.json();
    const {
      item_description,
      category,
      price,
      payment_type = 'cash',
      finance_monthly,
      finance_term_months,
      finance_apr,
    } = body;

    if (!item_description || !price || price <= 0) {
      return NextResponse.json({ error: 'Item description and price are required' }, { status: 400 });
    }

    // Fetch financial context server-side
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthStr = startOfMonth.toISOString().split('T')[0];
    const nextMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1)
      .toISOString().split('T')[0];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [budgetsRes, transactionsRes, debtsRes, savingsRes, accountsRes] = await Promise.all([
      (supabase.from as any)('budgets')
        .select('budgeted, category_id, category:categories(id, name)')
        .eq('user_id', user.id)
        .eq('month', monthStr),
      (supabase.from as any)('transactions')
        .select('amount, category:categories(id, name)')
        .eq('user_id', user.id)
        .gte('date', monthStr)
        .lt('date', nextMonth),
      (supabase.from as any)('debts')
        .select('name, monthly_payment, minimum_payment, current_balance')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('is_paid_off', false),
      (supabase.from as any)('savings_goals')
        .select('name, monthly_contribution, target_amount, current_amount')
        .eq('user_id', user.id)
        .eq('is_active', true),
      (supabase.from as any)('accounts')
        .select('name, type, balance')
        .eq('user_id', user.id)
        .eq('is_active', true),
    ]);

    const budgets = budgetsRes.data || [];
    const transactions = transactionsRes.data || [];
    const debts = debtsRes.data || [];
    const savings = savingsRes.data || [];
    const accounts = accountsRes.data || [];

    // Calculate spending per category this month
    const spentByCategory: Record<string, number> = {};
    transactions
      .filter((t: { amount: number }) => t.amount < 0)
      .forEach((t: { amount: number; category: { id: string; name: string } | null }) => {
        if (t.category?.name) {
          spentByCategory[t.category.name] = (spentByCategory[t.category.name] || 0) + Math.abs(t.amount);
        }
      });

    // Total income this month (positive transactions)
    const monthlyIncome = transactions
      .filter((t: { amount: number }) => t.amount > 0)
      .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

    const totalSpent = transactions
      .filter((t: { amount: number }) => t.amount < 0)
      .reduce((sum: number, t: { amount: number }) => sum + Math.abs(t.amount), 0);

    const totalBudgeted = budgets.reduce(
      (sum: number, b: { budgeted: number }) => sum + b.budgeted, 0
    );

    // Build purchase data string
    const purchaseStr = `Item: ${item_description}
Category: ${category}
Price: $${price.toFixed(2)}
Payment type: ${payment_type}${
  payment_type === 'finance'
    ? `\nMonthly payment: $${(finance_monthly || 0).toFixed(2)}\nTerm: ${finance_term_months || 0} months\nAPR: ${finance_apr || 0}%`
    : ''
}`;

    // Build financial context string
    const budgetLines = budgets.map(
      (b: { budgeted: number; category: { name: string } | null }) => {
        const catName = b.category?.name || 'Unknown';
        const spent = spentByCategory[catName] || 0;
        return `  - ${catName}: budgeted $${b.budgeted.toFixed(2)}, spent $${spent.toFixed(2)}, remaining $${(b.budgeted - spent).toFixed(2)}`;
      }
    ).join('\n') || '  (no budgets set)';

    // PII stripped: debt names, savings goal names, and account names replaced with generic labels
    const debtStr = debts.length > 0
      ? debts.map(
          (d: { name: string; monthly_payment: number | null; minimum_payment: number | null; current_balance: number }, i: number) =>
            `  - Debt ${i + 1}: $${(d.monthly_payment || d.minimum_payment || 0).toFixed(2)}/mo, balance $${d.current_balance.toFixed(2)}`
        ).join('\n')
      : '  (no debts)';

    const savingsStr = savings.length > 0
      ? savings.map(
          (s: { name: string; monthly_contribution: number | null; target_amount: number | null; current_amount: number }, i: number) =>
            `  - Goal ${i + 1}: $${(s.monthly_contribution || 0).toFixed(2)}/mo, saved $${s.current_amount.toFixed(2)}${s.target_amount ? ` of $${s.target_amount.toFixed(2)}` : ''}`
        ).join('\n')
      : '  (no savings goals)';

    const accountStr = accounts.map(
      (a: { name: string; type: string; balance: number }, i: number) =>
        `  - Account ${i + 1} (${a.type}): $${a.balance.toFixed(2)}`
    ).join('\n') || '  (no accounts)';

    const financialContext = `Monthly income this month: $${monthlyIncome.toFixed(2)}
Total budgeted: $${totalBudgeted.toFixed(2)}
Total spent this month: $${totalSpent.toFixed(2)}

Budgets & spending:
${budgetLines}

Debts:
${debtStr}

Savings goals:
${savingsStr}

Accounts:
${accountStr}`;

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
    const response = await checkAffordability(purchaseStr, financialContext, apiKeyOverride);

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

    // Log AI usage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)('ai_usage').insert({
      user_id: user.id,
      feature: 'afford_check',
      tokens_input: response.usage?.prompt_tokens || 0,
      tokens_output: response.usage?.completion_tokens || 0,
    });

    // Increment rate limit counter
    await incrementUsage(supabase, user.id, 'afford_check');

    return NextResponse.json({
      result,
      model: response.model,
      usage: response.usage,
      estimatedCost: response.estimatedCost,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Affordability check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check affordability' },
      { status: 500 }
    );
  }
}
