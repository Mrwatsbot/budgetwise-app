'use client';

import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';
import { useUser } from './use-user';

export function useTransactions() {
  const { user } = useUser();

  const { data, error, isLoading, mutate } = useSWR(
    user ? 'transactions-data' : null,
    async () => {
      const supabase = createClient();
      const userId = user!.id;

      // Fetch categories
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name, icon, type, color')
        .order('sort_order');

      // Fetch user's accounts
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id, name, type')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at');

      // Fetch transactions with category and account info
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          payee_clean,
          payee_original,
          date,
          memo,
          is_cleared,
          category:categories(id, name, icon, color),
          account:accounts(id, name)
        `)
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);

      return {
        categories: categories || [],
        accounts: accounts || [],
        transactions: transactions || [],
      };
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    categories: data?.categories,
    accounts: data?.accounts,
    transactions: data?.transactions,
    isLoading,
    error,
    mutate,
  };
}
