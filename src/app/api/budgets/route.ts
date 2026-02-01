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

  // Compute next month string for transaction date range
  const [yearNum, monthNum] = monthStr.split('-').map(Number);
  const nextMonth = monthNum === 12
    ? `${yearNum + 1}-01-01`
    : `${yearNum}-${String(monthNum + 1).padStart(2, '0')}-01`;

  const [categoriesRes, budgetsRes, transactionsRes, savingsRes] = await Promise.all([
    supabase.from('categories').select('id, name, icon, type, color').order('sort_order'),
    supabase.from('budgets')
      .select('id, budgeted, category_id, category:categories(id, name, icon, color)')
      .eq('user_id', user.id)
      .eq('month', monthStr),
    supabase.from('transactions')
      .select('id, amount, category:categories(id)')
      .eq('user_id', user.id)
      .gte('date', monthStr)
      .lt('date', nextMonth),
    (supabase.from as any)('savings_goals')
      .select('monthly_contribution')
      .eq('user_id', user.id)
      .eq('is_active', true),
  ]);

  // Spent per category
  const spentByCategory: Record<string, number> = {};
  (transactionsRes.data || []).filter((t: { amount: number }) => t.amount < 0).forEach((t: { amount: number; category: { id: string } | null }) => {
    if (t.category?.id) {
      spentByCategory[t.category.id] = (spentByCategory[t.category.id] || 0) + Math.abs(t.amount);
    }
  });

  // Fetch monthly income
  let monthlyIncome = 0;
  try {
    const { data: profileData } = await (supabase.from as any)('profiles')
      .select('monthly_income')
      .eq('id', user.id)
      .single();
    monthlyIncome = profileData?.monthly_income || 0;
  } catch { /* column may not exist yet */ }

  // Compute total savings target from active savings goals
  const savingsGoals = savingsRes.data || [];
  const totalSavingsTarget = savingsGoals.reduce((sum: number, g: { monthly_contribution: number }) => sum + (g.monthly_contribution || 0), 0);

  return NextResponse.json({
    categories: categoriesRes.data || [],
    budgets: (budgetsRes.data || []).map((b: { id: string; budgeted: number; category_id: string; category: { id: string; name: string; icon: string | null; color: string | null } | null }) => ({
      ...b,
      spent: spentByCategory[b.category?.id || b.category_id || ''] || 0,
    })),
    spentByCategory,
    monthlyIncome,
    totalSavingsTarget,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
    },
  });
}
