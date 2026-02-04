import { NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';

export async function GET(request: Request) {
  const guard = await apiGuard(60);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  // Parse month param (defaults to current month in user's timezone)
  const url = new URL(request.url);
  const clientMonth = url.searchParams.get('month');
  let monthStr: string;
  if (clientMonth && /^\d{4}-\d{2}-\d{2}$/.test(clientMonth)) {
    monthStr = clientMonth;
  } else {
    const now = new Date();
    monthStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
  }

  // Compute date boundaries
  const [yearNum, monthNum] = monthStr.split('-').map(Number);
  const nextMonth = monthNum === 12
    ? `${yearNum + 1}-01-01`
    : `${yearNum}-${String(monthNum + 1).padStart(2, '0')}-01`;

  // Previous month boundaries
  const prevMonthDate = new Date(yearNum, monthNum - 2, 1);
  const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
  const prevMonthEnd = monthStr; // current month start = prev month end

  // Fetch all data in parallel
  const [
    profileRes,
    categoriesRes,
    budgetsRes,
    transactionsRes,
    prevTransactionsRes,
    savingsRes,
    tierRes,
  ] = await Promise.all([
    (supabase.from as any)('profiles')
      .select('monthly_income')
      .eq('id', user.id)
      .single(),
    supabase.from('categories')
      .select('id, name, icon, type, color')
      .order('sort_order'),
    supabase.from('budgets')
      .select('id, budgeted, category_id, category:categories(id, name, icon, color)')
      .eq('user_id', user.id)
      .eq('month', monthStr),
    supabase.from('transactions')
      .select('amount, category:categories(id, name)')
      .eq('user_id', user.id)
      .gte('date', monthStr)
      .lt('date', nextMonth),
    supabase.from('transactions')
      .select('amount, category:categories(id, name)')
      .eq('user_id', user.id)
      .gte('date', prevMonthStr)
      .lt('date', prevMonthEnd),
    (supabase.from as any)('savings_goals')
      .select('monthly_contribution')
      .eq('user_id', user.id)
      .eq('is_active', true),
    (supabase.from as any)('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single(),
  ]);

  const monthlyIncome = profileRes.data?.monthly_income || 0;
  const tier = tierRes.data?.subscription_tier || 'free';
  const categories = categoriesRes.data || [];
  const budgets = budgetsRes.data || [];
  const savingsGoals = savingsRes.data || [];
  const totalSavingsTarget = savingsGoals.reduce(
    (sum: number, g: { monthly_contribution: number }) => sum + (g.monthly_contribution || 0),
    0,
  );

  // Current month: spent per category (expenses only)
  const spentByCategory: Record<string, number> = {};
  (transactionsRes.data || [])
    .filter((t: { amount: number }) => t.amount < 0)
    .forEach((t: { amount: number; category: { id: string; name: string } | null }) => {
      if (t.category?.id) {
        spentByCategory[t.category.id] =
          (spentByCategory[t.category.id] || 0) + Math.abs(t.amount);
      }
    });

  // Previous month: spent per category
  const prevSpentByCategory: Record<string, number> = {};
  (prevTransactionsRes.data || [])
    .filter((t: { amount: number }) => t.amount < 0)
    .forEach((t: { amount: number; category: { id: string; name: string } | null }) => {
      if (t.category?.id) {
        prevSpentByCategory[t.category.id] =
          (prevSpentByCategory[t.category.id] || 0) + Math.abs(t.amount);
      }
    });

  // Build per-category report data (exclude transfer/income categories)
  const transferCatIds = new Set(
    (categories as { id: string; type: string }[])
      .filter((c) => c.type === 'transfer' || c.type === 'income')
      .map((c) => c.id),
  );

  const categoryReports = budgets
    .filter(
      (b: { category_id: string; category: { id: string } | null }) =>
        !transferCatIds.has(b.category?.id || b.category_id),
    )
    .map(
      (b: {
        id: string;
        budgeted: number;
        category_id: string;
        category: { id: string; name: string; icon: string | null; color: string | null } | null;
      }) => {
        const catId = b.category?.id || b.category_id;
        return {
          id: catId,
          name: b.category?.name || 'Unknown',
          icon: b.category?.icon || null,
          color: b.category?.color || '#a855f7',
          budgeted: b.budgeted,
          spent: spentByCategory[catId] || 0,
          prevSpent: prevSpentByCategory[catId] || 0,
        };
      },
    );

  // Add savings goals as a synthetic category if there's a target
  if (totalSavingsTarget > 0) {
    // Check actual savings contributions this month
    let savingsContributed = 0;
    try {
      const { data: contribs } = await (supabase.from as any)('savings_contributions')
        .select('amount')
        .eq('user_id', user.id)
        .gte('created_at', monthStr)
        .lt('created_at', nextMonth);
      savingsContributed = (contribs || []).reduce(
        (sum: number, c: { amount: number }) => sum + (c.amount || 0), 0
      );
    } catch { /* table may not exist yet */ }

    // Previous month savings contributions
    let prevSavingsContributed = 0;
    try {
      const { data: prevContribs } = await (supabase.from as any)('savings_contributions')
        .select('amount')
        .eq('user_id', user.id)
        .gte('created_at', prevMonthStr)
        .lt('created_at', prevMonthEnd);
      prevSavingsContributed = (prevContribs || []).reduce(
        (sum: number, c: { amount: number }) => sum + (c.amount || 0), 0
      );
    } catch { /* table may not exist yet */ }

    categoryReports.push({
      id: '__savings__',
      name: 'Savings',
      icon: '💰',
      color: '#22c55e',
      budgeted: totalSavingsTarget,
      spent: savingsContributed,
      prevSpent: prevSavingsContributed,
    });
  }

  // Total spent & surplus
  const totalSpent = Object.values(spentByCategory).reduce((a: number, b: unknown) => a + (b as number), 0);
  const surplus = monthlyIncome - totalSpent;

  return NextResponse.json({
    monthlyIncome,
    totalSpent,
    surplus,
    totalSavingsTarget,
    categories: categoryReports,
    allCategories: categories,
    spentByCategory,
    prevSpentByCategory,
    tier,
  });
}
