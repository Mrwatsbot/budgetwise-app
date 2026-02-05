export const maxDuration = 60;
import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { generatePageInsights } from '@/lib/ai/openrouter';
import { checkRateLimit, incrementUsage, getUserTier } from '@/lib/ai/rate-limiter';

const VALID_PAGES = ['dashboard', 'budgets', 'transactions', 'savings', 'debts'];
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request: NextRequest) {
  try {
    const guard = await apiGuard(10);
    if (guard.error) return guard.error;
    const { user, supabase } = guard;

    const page = request.nextUrl.searchParams.get('page');
    if (!page || !VALID_PAGES.includes(page)) {
      return NextResponse.json({ error: 'Invalid or missing page parameter' }, { status: 400 });
    }

    // Check cache
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cached } = await (supabase.from as any)('ai_page_insights')
      .select('insights, generated_at')
      .eq('user_id', user.id)
      .eq('page', page)
      .single();

    if (cached && cached.generated_at) {
      const age = Date.now() - new Date(cached.generated_at).getTime();
      if (age < CACHE_TTL_MS) {
        return NextResponse.json({
          insights: cached.insights,
          generated_at: cached.generated_at,
          stale: false,
        });
      }
    }

    // No cache or stale
    return NextResponse.json({
      insights: cached?.insights || null,
      generated_at: cached?.generated_at || null,
      stale: true,
    });
  } catch (error) {
    console.error('AI insights GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await apiGuard(10);
    if (guard.error) return guard.error;
    const { user, supabase } = guard;

    // Rate limit check
    const { tier } = await getUserTier(supabase, user.id);
    const rateCheck = await checkRateLimit(supabase, user.id, tier, 'insights');
    if (!rateCheck.allowed) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        message: rateCheck.message,
        remaining: rateCheck.remaining,
        limit: rateCheck.limit,
      }, { status: 429 });
    }

    const body = await request.json();
    const { page } = body;

    if (!page || !VALID_PAGES.includes(page)) {
      return NextResponse.json({ error: 'Invalid or missing page parameter' }, { status: 400 });
    }

    // Gather page data server-side
    const contextData = await gatherPageData(supabase, user.id, page);

    // Call AI
    const response = await generatePageInsights(page, contextData);

    // Parse structured insights from AI response
    let insights;
    try {
      // Strip markdown code fences if present
      let content = response.content.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      insights = JSON.parse(content);
      // Add IDs to each insight
      if (Array.isArray(insights)) {
        insights = insights.map((insight: Record<string, unknown>, i: number) => ({
          id: `${page}-${i}-${Date.now()}`,
          ...insight,
        }));
      }
    } catch {
      // If JSON parsing fails, create a single insight from the raw text
      insights = [{
        id: `${page}-0-${Date.now()}`,
        type: 'tip',
        title: 'AI Analysis',
        body: response.content.slice(0, 200),
      }];
    }

    // Upsert cache
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)('ai_page_insights')
      .upsert({
        user_id: user.id,
        page,
        insights,
        generated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,page',
      });

    // Log AI usage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)('ai_usage').insert({
      user_id: user.id,
      feature: 'page_insights',
      tokens_input: response.usage?.prompt_tokens || 0,
      tokens_output: response.usage?.completion_tokens || 0,
    });

    // Increment rate limit counter
    await incrementUsage(supabase, user.id, 'insights');

    return NextResponse.json({
      insights,
      generated_at: new Date().toISOString(),
      stale: false,
      model: response.model,
      estimatedCost: response.estimatedCost,
    });
  } catch (error) {
    console.error('AI insights POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate insights' },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function gatherPageData(supabase: any, userId: string, page: string): Promise<string> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthStr = startOfMonth.toISOString().split('T')[0];

  switch (page) {
    case 'dashboard': {
      const [accountsRes, transactionsRes] = await Promise.all([
        supabase
          .from('accounts')
          .select('balance')
          .eq('user_id', userId)
          .eq('is_active', true),
        supabase
          .from('transactions')
          .select('amount, date, category:categories(name)')
          .eq('user_id', userId)
          .gte('date', monthStr)
          .order('date', { ascending: false })
          .limit(50),
      ]);
      const accounts = accountsRes.data || [];
      const transactions = transactionsRes.data || [];
      const totalBalance = accounts.reduce((s: number, a: { balance: number }) => s + (a.balance || 0), 0);
      const income = transactions.filter((t: { amount: number }) => t.amount > 0).reduce((s: number, t: { amount: number }) => s + t.amount, 0);
      const expenses = transactions.filter((t: { amount: number }) => t.amount < 0).reduce((s: number, t: { amount: number }) => s + Math.abs(t.amount), 0);

      // PII stripped: no account names, no payee names
      return JSON.stringify({
        totalBalance,
        monthlyIncome: income,
        monthlyExpenses: expenses,
        accountCount: accounts.length,
        topExpenses: transactions
          .filter((t: { amount: number }) => t.amount < 0)
          .slice(0, 10)
          .map((t: { amount: number; category: { name: string } | null }) => ({
            amount: Math.abs(t.amount),
            category: t.category?.name,
          })),
      });
    }

    case 'budgets': {
      const [budgetsRes, transactionsRes] = await Promise.all([
        supabase
          .from('budgets')
          .select('budgeted, category:categories(name)')
          .eq('user_id', userId)
          .eq('month', monthStr),
        supabase
          .from('transactions')
          .select('amount, category:categories(id, name)')
          .eq('user_id', userId)
          .gte('date', monthStr)
          .lt('amount', 0),
      ]);
      const budgets = budgetsRes.data || [];
      const transactions = transactionsRes.data || [];
      const spentByCategory: Record<string, number> = {};
      transactions.forEach((t: { amount: number; category: { id: string; name: string } | null }) => {
        const name = t.category?.name || 'Uncategorized';
        spentByCategory[name] = (spentByCategory[name] || 0) + Math.abs(t.amount);
      });

      return JSON.stringify({
        budgets: budgets.map((b: { budgeted: number; category: { name: string } | null }) => ({
          category: b.category?.name,
          budgeted: b.budgeted,
          spent: spentByCategory[b.category?.name || ''] || 0,
        })),
        unbudgetedSpending: Object.entries(spentByCategory)
          .filter(([cat]) => !budgets.some((b: { category: { name: string } | null }) => b.category?.name === cat))
          .map(([cat, amount]) => ({ category: cat, spent: amount })),
      });
    }

    case 'transactions': {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, date, category:categories(name)')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(100);

      const txns = transactions || [];
      // PII stripped: no payee names
      return JSON.stringify({
        recentTransactions: txns.slice(0, 20).map((t: { amount: number; date: string; category: { name: string } | null }) => ({
          amount: t.amount,
          date: t.date,
          category: t.category?.name,
        })),
        totalTransactions: txns.length,
        totalSpent: txns.filter((t: { amount: number }) => t.amount < 0).reduce((s: number, t: { amount: number }) => s + Math.abs(t.amount), 0),
        totalIncome: txns.filter((t: { amount: number }) => t.amount > 0).reduce((s: number, t: { amount: number }) => s + t.amount, 0),
      });
    }

    case 'savings': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: goals } = await (supabase.from as any)('savings_goals')
        .select('type, target_amount, current_amount, monthly_contribution')
        .eq('user_id', userId);

      const savingsGoals = goals || [];
      // PII stripped: goal names replaced with generic labels
      return JSON.stringify({
        goals: savingsGoals.map((g: { type: string; target_amount: number | null; current_amount: number; monthly_contribution: number }, i: number) => ({
          name: `Goal ${i + 1}`,
          type: g.type,
          target: g.target_amount,
          current: g.current_amount,
          monthlyContribution: g.monthly_contribution,
          percentComplete: g.target_amount ? Math.round((g.current_amount / g.target_amount) * 100) : null,
        })),
        totalSaved: savingsGoals.reduce((s: number, g: { current_amount: number }) => s + (g.current_amount || 0), 0),
        totalTarget: savingsGoals.reduce((s: number, g: { target_amount: number | null }) => s + (g.target_amount || 0), 0),
        totalMonthly: savingsGoals.reduce((s: number, g: { monthly_contribution: number }) => s + (g.monthly_contribution || 0), 0),
      });
    }

    case 'debts': {
      const { data: debts } = await supabase
        .from('debts')
        .select('type, current_balance, original_balance, apr, minimum_payment, monthly_payment')
        .eq('user_id', userId)
        .eq('is_active', true);

      const debtList = debts || [];
      // PII stripped: debt names replaced with generic labels
      return JSON.stringify({
        debts: debtList.map((d: { type: string; current_balance: number; original_balance: number | null; apr: number | null; minimum_payment: number | null; monthly_payment: number | null }, i: number) => ({
          name: `Debt ${i + 1}`,
          type: d.type,
          balance: d.current_balance,
          originalBalance: d.original_balance,
          apr: d.apr,
          minimumPayment: d.minimum_payment,
          monthlyPayment: d.monthly_payment,
        })),
        totalDebt: debtList.reduce((s: number, d: { current_balance: number }) => s + (d.current_balance || 0), 0),
        totalMinPayments: debtList.reduce((s: number, d: { minimum_payment: number | null }) => s + (d.minimum_payment || 0), 0),
        debtCount: debtList.length,
      });
    }

    default:
      return '{}';
  }
}
