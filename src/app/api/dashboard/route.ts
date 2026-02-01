import { NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';

export async function GET(request: Request) {
  const guard = await apiGuard(60);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  // Use client-provided month to avoid timezone mismatch (client=CST, server=UTC)
  const url = new URL(request.url);
  const clientMonth = url.searchParams.get('month');
  let monthStr: string;
  if (clientMonth && /^\d{4}-\d{2}-\d{2}$/.test(clientMonth)) {
    monthStr = clientMonth;
  } else {
    const now = new Date();
    monthStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
  }

  // Year-to-date boundaries (derive from monthStr to stay consistent)
  const [yearNum] = monthStr.split('-').map(Number);
  const yearStr = `${yearNum}-01-01`;

  const [accountsRes, transactionsRes, budgetsRes, scoreRes, achievementsRes, savingsRes, plaidRes, yearlyTransactionsRes] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name, type, balance')
      .eq('user_id', user.id)
      .eq('is_active', true),
    supabase
      .from('transactions')
      .select('id, amount, payee_clean, payee_original, date, category:categories(id, name, icon, color)')
      .eq('user_id', user.id)
      .gte('date', monthStr)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('budgets')
      .select('id, budgeted, category:categories(id, name, icon, color)')
      .eq('user_id', user.id)
      .eq('month', monthStr),
    // Latest score
    (supabase.from as any)('score_history')
      .select('total_score, level, scored_at')
      .eq('user_id', user.id)
      .order('scored_at', { ascending: false })
      .limit(1)
      .single(),
    // Recent achievements (last 3)
    (supabase.from as any)('user_achievements')
      .select('unlocked_at, achievement:achievement_definitions(name, icon)')
      .eq('user_id', user.id)
      .order('unlocked_at', { ascending: false })
      .limit(3),
    // Savings goals for allocation calculation
    (supabase.from as any)('savings_goals')
      .select('monthly_contribution')
      .eq('user_id', user.id)
      .eq('is_active', true),
    // Plaid connections (last synced)
    (supabase.from as any)('plaid_connections')
      .select('last_synced_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('last_synced_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Yearly transactions (just amount + date for monthly summaries)
    supabase
      .from('transactions')
      .select('amount, date')
      .eq('user_id', user.id)
      .gte('date', yearStr)
      .lt('date', monthStr) // exclude current month (already fetched above)
      .order('date', { ascending: true }),
  ]);

  // Fetch monthly_income separately (column may not exist yet)
  let budgetedMonthlyIncome = 0;
  try {
    const { data: profileData } = await (supabase.from as any)('profiles')
      .select('monthly_income')
      .eq('id', user.id)
      .single();
    budgetedMonthlyIncome = profileData?.monthly_income || 0;
  } catch { /* column may not exist yet */ }

  const accounts = accountsRes.data || [];
  const transactions = transactionsRes.data || [];
  const budgets = budgetsRes.data || [];
  const savingsGoals = savingsRes.data || [];

  // Compute stats
  const totalBalance = accounts.reduce((sum: number, acc: { balance: number }) => sum + (acc.balance || 0), 0);
  const monthlyIncome = transactions
    .filter((t: { amount: number }) => t.amount > 0)
    .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
  const monthlyExpenses = transactions
    .filter((t: { amount: number }) => t.amount < 0)
    .reduce((sum: number, t: { amount: number }) => sum + Math.abs(t.amount), 0);

  // Compute TOTAL budgeted from ALL budgets (for accurate allocation display)
  const totalBudgeted = budgets.reduce((sum: number, b: { budgeted: number }) => sum + (b.budgeted || 0), 0);
  
  // Compute total savings target from active savings goals
  const totalSavingsTarget = savingsGoals.reduce((sum: number, g: { monthly_contribution: number }) => sum + (g.monthly_contribution || 0), 0);

  // Spent by category
  const spentByCategory: Record<string, number> = {};
  transactions.filter((t: { amount: number }) => t.amount < 0).forEach((t: { amount: number; category: { id: string } | null }) => {
    if (t.category?.id) {
      spentByCategory[t.category.id] = (spentByCategory[t.category.id] || 0) + Math.abs(t.amount);
    }
  });

  // Score data — derive level title from score
  function getLevelTitle(score: number): string {
    if (score >= 900) return 'Elite';
    if (score >= 750) return 'Strong';
    if (score >= 600) return 'Good';
    if (score >= 400) return 'Building';
    if (score >= 200) return 'Starting';
    return 'Beginning';
  }

  const scoreData = scoreRes.data ? {
    score: scoreRes.data.total_score,
    level: scoreRes.data.level,
    levelTitle: getLevelTitle(scoreRes.data.total_score),
    previousScore: null,
  } : null;

  const recentAchievements = (achievementsRes.data || []).map((a: { unlocked_at: string; achievement: { name: string; icon: string } | null }) => ({
    name: a.achievement?.name || '',
    icon: a.achievement?.icon || '🏆',
    unlocked_at: a.unlocked_at,
  }));

  // Build month-by-month surplus/deficit for the year
  // Income source: use budgetedMonthlyIncome (profile setting) as baseline.
  // If actual transaction income (e.g. Plaid deposits) is higher, use that instead.
  const yearlyTransactions = yearlyTransactionsRes.data || [];
  const monthlyMap: Record<string, { transactionIncome: number; expenses: number }> = {};

  // Past months from yearly query
  yearlyTransactions.forEach((t: { amount: number; date: string }) => {
    const monthKey = t.date.substring(0, 7); // "2026-01"
    if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { transactionIncome: 0, expenses: 0 };
    if (t.amount > 0) {
      monthlyMap[monthKey].transactionIncome += t.amount;
    } else {
      monthlyMap[monthKey].expenses += Math.abs(t.amount);
    }
  });

  // Current month from existing transactions
  const currentMonthKey = monthStr.substring(0, 7);
  monthlyMap[currentMonthKey] = { transactionIncome: monthlyIncome, expenses: monthlyExpenses };

  // Build sorted array with running total (use parsed month, not server time)
  const [parsedYear, parsedMonth] = monthStr.split('-').map(Number);
  const currentYear = parsedYear;
  const currentMonthIndex = parsedMonth - 1; // 0-indexed
  let runningTotal = 0;
  const monthlySummary = [];

  for (let m = 0; m <= currentMonthIndex; m++) {
    const key = `${currentYear}-${String(m + 1).padStart(2, '0')}`;
    const data = monthlyMap[key] || { transactionIncome: 0, expenses: 0 };
    // Use the higher of budgeted income or actual transaction income
    const effectiveIncome = Math.max(budgetedMonthlyIncome, data.transactionIncome);
    const surplus = effectiveIncome - data.expenses;
    runningTotal += surplus;
    monthlySummary.push({
      month: key,
      label: new Date(currentYear, m).toLocaleDateString('en-US', { month: 'short' }),
      income: Math.round(effectiveIncome * 100) / 100,
      expenses: Math.round(data.expenses * 100) / 100,
      surplus: Math.round(surplus * 100) / 100,
      runningTotal: Math.round(runningTotal * 100) / 100,
      isCurrent: m === currentMonthIndex,
    });
  }

  return NextResponse.json({
    accounts,
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    recentTransactions: transactions.slice(0, 5),
    budgets: budgets.map((b: { budgeted: number; category: { id: string; name: string; icon: string | null; color: string | null } | null }) => ({
      name: b.category?.name || 'Unknown',
      icon: b.category?.icon || null,
      budgeted: b.budgeted,
      spent: spentByCategory[b.category?.id || ''] || 0,
      color: b.category?.color || '#a855f7',
    })).slice(0, 4),
    totalBudgeted, // Total from ALL budgets (not just the 4 shown)
    totalSavingsTarget, // Total monthly savings contributions
    budgetedMonthlyIncome,
    scoreData,
    recentAchievements,
    monthlySummary,
    ytdSurplus: Math.round(runningTotal * 100) / 100,
    plaidLastSynced: plaidRes.data?.last_synced_at || null,
    user: {
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
    },
  });
}
