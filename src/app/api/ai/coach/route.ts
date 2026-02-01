import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  analyzeSpending,
  debtStrategy,
  budgetSuggestions,
  scoreCoach,
  findSavings,
} from '@/lib/ai/openrouter';
import { checkRateLimit, incrementUsage, getUserTier } from '@/lib/ai/rate-limiter';
import { rateLimit } from '@/lib/rate-limit';

const VALID_TYPES = ['spending', 'debt', 'budget', 'savings', 'score'];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = rateLimit(user.id, 10);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      );
    }

    // Rate limit check
    const { tier, hasByok } = await getUserTier(supabase, user.id);
    const rateCheck = await checkRateLimit(supabase, user.id, tier, 'coaching', hasByok);
    if (!rateCheck.allowed) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        message: rateCheck.message,
        remaining: rateCheck.remaining,
        limit: rateCheck.limit,
      }, { status: 429 });
    }

    const body = await request.json();
    const { type } = body;

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid coaching type' }, { status: 400 });
    }

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

    // Gather relevant data server-side
    const contextData = await gatherCoachingData(supabase, user.id, type);

    // Call the appropriate AI function
    let response;
    switch (type) {
      case 'spending':
        response = await analyzeSpending(contextData, apiKeyOverride);
        break;
      case 'debt':
        response = await debtStrategy(contextData, apiKeyOverride);
        break;
      case 'budget':
        response = await budgetSuggestions(contextData, apiKeyOverride);
        break;
      case 'savings':
        response = await scoreCoach(contextData, apiKeyOverride);
        break;
      case 'score':
        response = await scoreCoach(contextData, apiKeyOverride);
        break;
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // Log AI usage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)('ai_usage').insert({
      user_id: user.id,
      feature: `coach_${type}`,
      tokens_input: response.usage?.prompt_tokens || 0,
      tokens_output: response.usage?.completion_tokens || 0,
    });

    // Increment rate limit counter
    await incrementUsage(supabase, user.id, 'coaching');

    return NextResponse.json({
      result: response.content,
      type,
      model: response.model,
      usage: response.usage,
      estimatedCost: response.estimatedCost,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('AI coach error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Coaching failed' },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function gatherCoachingData(supabase: any, userId: string, type: string): Promise<string> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthStr = startOfMonth.toISOString().split('T')[0];

  switch (type) {
    case 'spending': {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, date, category:categories(name)')
        .eq('user_id', userId)
        .gte('date', monthStr)
        .order('date', { ascending: false })
        .limit(100);

      const txns = transactions || [];
      const categoryTotals: Record<string, number> = {};
      txns.filter((t: { amount: number }) => t.amount < 0).forEach((t: { amount: number; category: { name: string } | null }) => {
        const cat = t.category?.name || 'Uncategorized';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(t.amount);
      });

      // PII stripped: no payee names in transaction list
      return `Monthly transactions (${txns.length} total):\n` +
        `Total income: $${txns.filter((t: { amount: number }) => t.amount > 0).reduce((s: number, t: { amount: number }) => s + t.amount, 0).toFixed(2)}\n` +
        `Total expenses: $${txns.filter((t: { amount: number }) => t.amount < 0).reduce((s: number, t: { amount: number }) => s + Math.abs(t.amount), 0).toFixed(2)}\n\n` +
        `Spending by category:\n${Object.entries(categoryTotals).sort(([, a], [, b]) => (b as number) - (a as number)).map(([cat, amt]) => `  ${cat}: $${(amt as number).toFixed(2)}`).join('\n')}\n\n` +
        `Note: All data is anonymized. Names are replaced with generic labels.\n\n` +
        `Recent transactions:\n${txns.slice(0, 20).map((t: { amount: number; date: string; category: { name: string } | null }) => `  ${t.date} | $${Math.abs(t.amount).toFixed(2)} | ${t.category?.name || 'Uncategorized'}`).join('\n')}`;
    }

    case 'debt': {
      const { data: debts } = await supabase
        .from('debts')
        .select('type, current_balance, original_balance, apr, minimum_payment, monthly_payment')
        .eq('user_id', userId)
        .eq('is_active', true);

      const debtList = debts || [];
      // PII stripped: debt names replaced with generic labels
      return `Active debts (${debtList.length}):\n` +
        `Note: All data is anonymized. Names are replaced with generic labels.\n` +
        debtList.map((d: { type: string; current_balance: number; original_balance: number | null; apr: number | null; minimum_payment: number | null; monthly_payment: number | null }, i: number) =>
          `  Debt ${i + 1} (${d.type}): Balance $${d.current_balance.toFixed(2)}, APR ${d.apr || 0}%, Min payment $${(d.minimum_payment || 0).toFixed(2)}, Monthly payment $${(d.monthly_payment || 0).toFixed(2)}`
        ).join('\n') +
        `\n\nTotal debt: $${debtList.reduce((s: number, d: { current_balance: number }) => s + d.current_balance, 0).toFixed(2)}` +
        `\nTotal minimum payments: $${debtList.reduce((s: number, d: { minimum_payment: number | null }) => s + (d.minimum_payment || 0), 0).toFixed(2)}`;
    }

    case 'budget': {
      const [budgetsRes, transactionsRes, accountsRes] = await Promise.all([
        supabase
          .from('budgets')
          .select('budgeted, category:categories(name)')
          .eq('user_id', userId)
          .eq('month', monthStr),
        supabase
          .from('transactions')
          .select('amount, category:categories(name)')
          .eq('user_id', userId)
          .gte('date', monthStr),
        supabase
          .from('accounts')
          .select('balance')
          .eq('user_id', userId)
          .eq('is_active', true),
      ]);

      const budgets = budgetsRes.data || [];
      const transactions = transactionsRes.data || [];
      const accounts = accountsRes.data || [];
      const income = transactions.filter((t: { amount: number }) => t.amount > 0).reduce((s: number, t: { amount: number }) => s + t.amount, 0);
      const expenses = transactions.filter((t: { amount: number }) => t.amount < 0).reduce((s: number, t: { amount: number }) => s + Math.abs(t.amount), 0);
      const totalBalance = accounts.reduce((s: number, a: { balance: number }) => s + (a.balance || 0), 0);

      return `Monthly income: $${income.toFixed(2)}\nMonthly expenses: $${expenses.toFixed(2)}\nTotal balance: $${totalBalance.toFixed(2)}\n\nCurrent budgets:\n` +
        budgets.map((b: { budgeted: number; category: { name: string } | null }) =>
          `  ${b.category?.name || 'Unknown'}: budgeted $${b.budgeted.toFixed(2)}`
        ).join('\n');
    }

    case 'savings':
    case 'score': {
      // Gather comprehensive data for score coaching
      const [accountsRes, transactionsRes, debtsRes] = await Promise.all([
        supabase
          .from('accounts')
          .select('balance')
          .eq('user_id', userId)
          .eq('is_active', true),
        supabase
          .from('transactions')
          .select('amount, category:categories(name)')
          .eq('user_id', userId)
          .gte('date', monthStr),
        supabase
          .from('debts')
          .select('current_balance, apr, minimum_payment')
          .eq('user_id', userId)
          .eq('is_active', true),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: savingsGoals } = await (supabase.from as any)('savings_goals')
        .select('target_amount, current_amount, monthly_contribution')
        .eq('user_id', userId);

      const accounts = accountsRes.data || [];
      const transactions = transactionsRes.data || [];
      const debts = debtsRes.data || [];
      const goals = savingsGoals || [];

      const income = transactions.filter((t: { amount: number }) => t.amount > 0).reduce((s: number, t: { amount: number }) => s + t.amount, 0);
      const expenses = transactions.filter((t: { amount: number }) => t.amount < 0).reduce((s: number, t: { amount: number }) => s + Math.abs(t.amount), 0);
      const totalBalance = accounts.reduce((s: number, a: { balance: number }) => s + (a.balance || 0), 0);
      const totalDebt = debts.reduce((s: number, d: { current_balance: number }) => s + (d.current_balance || 0), 0);
      const totalSaved = goals.reduce((s: number, g: { current_amount: number }) => s + (g.current_amount || 0), 0);

      // PII stripped: goal names replaced with generic labels
      return `Financial overview:\n` +
        `Note: All data is anonymized. Names are replaced with generic labels.\n` +
        `  Total balance: $${totalBalance.toFixed(2)}\n` +
        `  Monthly income: $${income.toFixed(2)}\n` +
        `  Monthly expenses: $${expenses.toFixed(2)}\n` +
        `  Savings rate: ${income > 0 ? ((1 - expenses / income) * 100).toFixed(1) : 0}%\n` +
        `  Total debt: $${totalDebt.toFixed(2)}\n` +
        `  Total saved: $${totalSaved.toFixed(2)}\n\n` +
        `Savings goals:\n${goals.map((g: { target_amount: number | null; current_amount: number; monthly_contribution: number }, i: number) => `  Goal ${i + 1}: $${g.current_amount.toFixed(2)} / $${(g.target_amount || 0).toFixed(2)} (contributing $${g.monthly_contribution.toFixed(2)}/mo)`).join('\n')}`;
    }

    default:
      return '{}';
  }
}
