/**
 * Financial Summary Cache — Phase 1
 * Builds a compact ~200 token summary of user's financial state
 * for injection into AI context. Cached in-memory per user.
 */

import { SupabaseClient } from '@supabase/supabase-js';

interface FinancialSummaryCache {
  summary: string;
  generatedAt: number;
  dataHash: string;
}

// In-memory cache (per serverless instance)
const summaryCache = new Map<string, FinancialSummaryCache>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function fmt(n: number): string {
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toFixed(0);
}

function simpleHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

export async function getFinancialSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  // Check cache
  const cached = summaryCache.get(userId);
  if (cached && Date.now() - cached.generatedAt < CACHE_TTL_MS) {
    return cached.summary;
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthStr = startOfMonth.toISOString().split('T')[0];

  // Fetch data in parallel
  const [profileRes, budgetsRes, transactionsRes, debtsRes, savingsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('monthly_income')
      .eq('id', userId)
      .single(),
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
      .from('debts')
      .select('current_balance, type')
      .eq('user_id', userId)
      .eq('is_active', true),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from as any)('savings_goals')
      .select('type, target_amount, current_amount')
      .eq('user_id', userId),
  ]);

  const income = profileRes.data?.monthly_income || 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const budgets = (budgetsRes.data || []) as any[];
  const totalBudgeted = budgets.reduce((s: number, b: { budgeted: number }) => s + (b.budgeted || 0), 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transactions = (transactionsRes.data || []) as any[];
  const expenses = transactions.filter((t: { amount: number }) => t.amount < 0);
  const totalSpent = expenses.reduce((s: number, t: { amount: number }) => s + Math.abs(t.amount), 0);

  // Top spending categories
  const catSpend: Record<string, number> = {};
  for (const t of expenses) {
    const name = t.category?.name || 'Other';
    catSpend[name] = (catSpend[name] || 0) + Math.abs(t.amount);
  }
  const topCats = Object.entries(catSpend)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Budget status
  const budgetStatus = budgets.map((b: { budgeted: number; category: { name: string } | null }) => {
    const name = b.category?.name || 'Unknown';
    const spent = catSpend[name] || 0;
    const pct = b.budgeted > 0 ? Math.round((spent / b.budgeted) * 100) : 0;
    return { name, budgeted: b.budgeted, spent, pct };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const debts = (debtsRes.data || []) as any[];
  const totalDebt = debts.reduce((s: number, d: { current_balance: number }) => s + (d.current_balance || 0), 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const savings = (savingsRes.data || []) as any[];

  // Build compact summary
  const lines: string[] = [];

  lines.push(`Income: $${fmt(income)}/mo | Spent this month: $${fmt(totalSpent)} | Budgeted: $${fmt(totalBudgeted)}`);

  const net = income - totalSpent;
  lines.push(`Net cashflow: ${net >= 0 ? '+' : ''}$${fmt(net)}/mo`);

  if (topCats.length > 0) {
    const cats = topCats.map(([name, amount]) => `${name}: $${fmt(amount)}`).join(', ');
    lines.push(`Top spending: ${cats}`);
  }

  const overBudget = budgetStatus.filter(b => b.pct > 90);
  const underBudget = budgetStatus.filter(b => b.pct < 50 && b.budgeted > 0);

  if (overBudget.length > 0) {
    lines.push(`⚠️ Near/over budget: ${overBudget.map(b => `${b.name} (${b.pct}%)`).join(', ')}`);
  }
  if (underBudget.length > 0) {
    lines.push(`✅ Under budget: ${underBudget.slice(0, 3).map(b => `${b.name} (${b.pct}%)`).join(', ')}`);
  }

  if (totalDebt > 0) {
    lines.push(`Debt: $${fmt(totalDebt)} across ${debts.length} accounts`);
  }

  if (savings.length > 0) {
    const goalSummaries = savings
      .filter((g: { target_amount: number | null }) => g.target_amount && g.target_amount > 0)
      .slice(0, 3)
      .map((g: { type: string; target_amount: number; current_amount: number }) => {
        const pct = Math.round((g.current_amount / g.target_amount) * 100);
        return `${g.type}: ${pct}%`;
      });
    if (goalSummaries.length > 0) {
      lines.push(`Savings goals: ${goalSummaries.join(', ')}`);
    }
  }

  const summary = lines.join('\n');

  // Build hash of source data for cache invalidation
  const hashInput = JSON.stringify({ income, totalBudgeted, totalSpent, totalDebt, savingsCount: savings.length });
  const hash = simpleHash(hashInput);

  // Update cache
  summaryCache.set(userId, {
    summary,
    generatedAt: Date.now(),
    dataHash: hash,
  });

  return summary;
}
