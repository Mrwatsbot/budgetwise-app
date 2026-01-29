'use client';

import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';
import { useUser } from './use-user';

export function useBudgets() {
  const { user } = useUser();

  const { data, error, isLoading, mutate } = useSWR(
    user ? 'budgets-data' : null,
    async () => {
      const supabase = createClient();
      const userId = user!.id;

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
        .eq('user_id', userId)
        .eq('month', currentMonthStr);

      type BudgetRow = { id: string; category_id: string; budgeted: number };
      const budgets = (budgetsData || []) as BudgetRow[];

      // Fetch this month's expense transactions
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('category_id, amount')
        .eq('user_id', userId)
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

      const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      return {
        categoryBudgets,
        totalBudgeted,
        totalSpent,
        currentMonthStr,
        monthName,
      };
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    categoryBudgets: data?.categoryBudgets,
    totalBudgeted: data?.totalBudgeted,
    totalSpent: data?.totalSpent,
    currentMonthStr: data?.currentMonthStr,
    monthName: data?.monthName,
    isLoading,
    error,
    mutate,
  };
}
