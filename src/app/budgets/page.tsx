import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/app-shell';
import { BudgetGrid } from '@/components/budgets/budget-grid';

export default async function BudgetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get current month's first day
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthStr = currentMonth.toISOString().split('T')[0];

  // Fetch all expense categories
  const { data: categoriesData } = await supabase
    .from('categories')
    .select('id, name, icon, color, type')
    .eq('type', 'expense')
    .order('sort_order');

  type CategoryRow = { id: string; name: string; icon: string | null; color: string | null; type: string };
  const categories = (categoriesData || []) as CategoryRow[];

  // Fetch user's budgets for current month
  const { data: budgetsData } = await supabase
    .from('budgets')
    .select('id, category_id, budgeted')
    .eq('user_id', user.id)
    .eq('month', currentMonthStr);

  type BudgetRow = { id: string; category_id: string; budgeted: number };
  const budgets = (budgetsData || []) as BudgetRow[];

  // Fetch this month's transactions to calculate spent amounts
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const { data: transactionsData } = await supabase
    .from('transactions')
    .select('category_id, amount')
    .eq('user_id', user.id)
    .gte('date', currentMonthStr)
    .lt('date', nextMonth.toISOString().split('T')[0])
    .lt('amount', 0); // Only expenses

  type TxRow = { category_id: string | null; amount: number };
  const transactions = (transactionsData || []) as TxRow[];

  // Calculate spent per category
  const spentByCategory: Record<string, number> = {};
  transactions.forEach(t => {
    if (t.category_id) {
      spentByCategory[t.category_id] = (spentByCategory[t.category_id] || 0) + Math.abs(t.amount);
    }
  });

  // Create budget map
  const budgetMap: Record<string, { id: string; budgeted: number }> = {};
  budgets.forEach(b => {
    budgetMap[b.category_id] = { id: b.id, budgeted: b.budgeted };
  });

  // Combine into category budget data
  const categoryBudgets = categories.map(cat => ({
    categoryId: cat.id,
    categoryName: cat.name,
    categoryIcon: cat.icon,
    categoryColor: cat.color,
    budgetId: budgetMap[cat.id]?.id || null,
    budgeted: budgetMap[cat.id]?.budgeted || 0,
    spent: spentByCategory[cat.id] || 0,
  }));

  // Calculate totals
  const totalBudgeted = categoryBudgets.reduce((sum, b) => sum + b.budgeted, 0);
  const totalSpent = categoryBudgets.reduce((sum, b) => sum + b.spent, 0);

  const userProfile = {
    email: user.email,
    full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
  };

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <AppShell user={userProfile}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Budgets</h1>
            <p className="text-muted-foreground">{monthName}</p>
          </div>
          
          {/* Summary Card */}
          <div className="glass-card rounded-xl px-6 py-4 flex items-center gap-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Budgeted</p>
              <p className="text-xl font-bold">${totalBudgeted.toFixed(2)}</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Spent</p>
              <p className={`text-xl font-bold ${totalSpent > totalBudgeted ? 'text-red-400' : 'text-green-400'}`}>
                ${totalSpent.toFixed(2)}
              </p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className={`text-xl font-bold ${totalBudgeted - totalSpent < 0 ? 'text-red-400' : 'text-green-400'}`}>
                ${(totalBudgeted - totalSpent).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Budget Grid */}
        <BudgetGrid 
          categoryBudgets={categoryBudgets} 
          userId={user.id}
          currentMonth={currentMonthStr}
        />
      </div>
    </AppShell>
  );
}
