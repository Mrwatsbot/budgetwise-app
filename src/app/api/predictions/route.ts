import { NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';

export async function GET(request: Request) {
  const guard = await apiGuard(60);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  const url = new URL(request.url);
  const clientMonth = url.searchParams.get('month');
  let monthStr: string;
  
  if (clientMonth && /^\d{4}-\d{2}-\d{2}$/.test(clientMonth)) {
    monthStr = clientMonth;
  } else {
    const now = new Date();
    monthStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
  }

  // Parse month to get days calculation
  const [year, month] = monthStr.split('-').map(Number);
  const today = new Date();
  const currentDayOfMonth = today.getDate();
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysElapsed = Math.min(currentDayOfMonth, daysInMonth);
  const daysRemaining = daysInMonth - daysElapsed;

  // Compute next month for transaction filtering
  const nextMonth = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`;

  // Fetch budgets and transactions for this month
  const [budgetsRes, transactionsRes] = await Promise.all([
    (supabase.from as any)('budgets')
      .select('id, budgeted, rollover_amount, category_id, category:categories(id, name, icon, color)')
      .eq('user_id', user.id)
      .eq('month', monthStr),
    supabase.from('transactions')
      .select('id, amount, category:categories(id), is_split')
      .eq('user_id', user.id)
      .gte('date', monthStr)
      .lt('date', nextMonth),
  ]);

  // Calculate spent per category
  // Exclude parent split transactions (is_split=true) - only count split children
  const spentByCategory: Record<string, number> = {};
  (transactionsRes.data || [])
    .filter((t: { amount: number; is_split?: boolean }) => t.amount < 0 && !t.is_split)
    .forEach((t: { amount: number; category: { id: string } | null }) => {
      if (t.category?.id) {
        spentByCategory[t.category.id] = (spentByCategory[t.category.id] || 0) + Math.abs(t.amount);
      }
    });

  // Build predictions for each budget
  const predictions = (budgetsRes.data || []).map((budget: {
    id: string;
    budgeted: number;
    rollover_amount: number;
    category_id: string;
    category: { id: string; name: string; icon: string | null; color: string | null } | null;
  }) => {
    const spent = spentByCategory[budget.category?.id || budget.category_id] || 0;
    const totalBudget = budget.budgeted + (budget.rollover_amount || 0);
    
    // Calculate daily spend rate
    const dailyRate = daysElapsed > 0 ? spent / daysElapsed : 0;
    
    // Project end-of-month total
    const projectedTotal = spent + (dailyRate * daysRemaining);
    
    // Calculate status
    let status: 'on_pace' | 'over_pace' | 'under_pace';
    let projectedOverspend = 0;
    
    if (projectedTotal > totalBudget) {
      status = 'over_pace';
      projectedOverspend = projectedTotal - totalBudget;
    } else {
      // Check if we're within 5% of expected pace
      const expectedPace = (daysElapsed / daysInMonth);
      const actualPace = totalBudget > 0 ? (spent / totalBudget) : 0;
      
      if (actualPace <= expectedPace + 0.05) {
        status = 'on_pace';
      } else {
        status = 'over_pace';
        projectedOverspend = projectedTotal - totalBudget;
      }
    }
    
    return {
      categoryId: budget.category?.id || budget.category_id,
      categoryName: budget.category?.name || 'Unknown',
      categoryIcon: budget.category?.icon || null,
      categoryColor: budget.category?.color || null,
      budgetAmount: totalBudget,
      spent,
      dailyRate,
      projectedTotal,
      projectedOverspend,
      status,
      daysElapsed,
      daysRemaining,
    };
  });

  // Filter to only categories projected to overspend
  const atRiskCategories = predictions.filter((p: typeof predictions[0]) => p.status === 'over_pace' && p.projectedOverspend > 0);

  return NextResponse.json({
    predictions,
    atRiskCategories,
    daysElapsed,
    daysRemaining,
    daysInMonth,
  });
}
