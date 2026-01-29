'use client';

import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from './use-user';

export function useDashboard() {
  const router = useRouter();
  const { user } = useUser();

  const { data, error, isLoading, mutate } = useSWR(
    user ? 'dashboard-data' : null,
    async () => {
      const supabase = createClient();
      const userId = user!.id;

      // Fetch active accounts
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('id, name, type, balance')
        .eq('user_id', userId)
        .eq('is_active', true);

      const accounts = (accountsData || []) as { id: string; name: string; type: string; balance: number }[];

      // Fetch this month's transactions with category join
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: transactionsData } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          payee_clean,
          payee_original,
          date,
          category:categories(id, name, icon, color)
        `)
        .eq('user_id', userId)
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      type TransactionRow = {
        id: string;
        amount: number;
        payee_clean: string | null;
        payee_original: string | null;
        date: string;
        category: { id: string; name: string; icon: string | null; color: string | null } | null;
      };
      const transactions = (transactionsData || []) as TransactionRow[];

      // Calculate totals
      const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
      const monthlyIncome = transactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);
      const monthlyExpenses = transactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      // Format recent transactions for display
      const recentTransactions = transactions.slice(0, 5).map(t => {
        const date = new Date(t.date + 'T00:00:00');
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (date.toDateString() === today.toDateString()) dateStr = 'Today';
        if (date.toDateString() === yesterday.toDateString()) dateStr = 'Yesterday';

        return {
          id: t.id,
          payee: t.payee_clean || t.payee_original || 'Unknown',
          amount: t.amount,
          category: t.category?.name || 'Uncategorized',
          date: dateStr,
        };
      });

      // Fetch real budgets
      const currentMonthStr = startOfMonth.toISOString().split('T')[0];
      const { data: budgetsData } = await supabase
        .from('budgets')
        .select(`
          id,
          budgeted,
          category:categories(id, name, icon, color)
        `)
        .eq('user_id', userId)
        .eq('month', currentMonthStr);

      // Calculate spent per category from transactions
      const spentByCategory: Record<string, number> = {};
      transactions.filter(t => t.amount < 0).forEach(t => {
        if (t.category?.id) {
          spentByCategory[t.category.id] = (spentByCategory[t.category.id] || 0) + Math.abs(t.amount);
        }
      });

      // Format budgets for display
      type BudgetRow = {
        id: string;
        budgeted: number;
        category: { id: string; name: string; icon: string | null; color: string | null } | null;
      };
      const budgets = ((budgetsData || []) as BudgetRow[]).map(b => ({
        name: b.category?.name || 'Unknown',
        icon: b.category?.icon || '📦',
        budgeted: b.budgeted,
        spent: spentByCategory[b.category?.id || ''] || 0,
        color: b.category?.color || '#a855f7',
      })).slice(0, 4);

      const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      return {
        accounts,
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        recentTransactions,
        budgets,
        currentMonth,
      };
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  // Redirect to onboarding if no accounts
  useEffect(() => {
    if (!isLoading && data && data.accounts.length === 0) {
      router.push('/onboarding');
    }
  }, [data, isLoading, router]);

  return {
    accounts: data?.accounts,
    totalBalance: data?.totalBalance,
    monthlyIncome: data?.monthlyIncome,
    monthlyExpenses: data?.monthlyExpenses,
    recentTransactions: data?.recentTransactions,
    budgets: data?.budgets,
    currentMonth: data?.currentMonth,
    isLoading,
    error,
    mutate,
  };
}
