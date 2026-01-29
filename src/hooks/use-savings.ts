'use client';

import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';
import { useUser } from './use-user';
import type { SavingsGoal, SavingsContribution } from '@/types/database';

export function useSavings() {
  const { user } = useUser();

  const { data, error, isLoading, mutate } = useSWR(
    user ? 'savings-data' : null,
    async () => {
      const supabase = createClient();
      const userId = user!.id;

      // Fetch active savings goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (goalsError) throw goalsError;
      const goals = (goalsData || []) as SavingsGoal[];

      // Fetch recent contributions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: contributionsData, error: contribError } = await supabase
        .from('savings_contributions')
        .select('*')
        .eq('user_id', userId)
        .gte('date', thirtyDaysAgoStr)
        .order('date', { ascending: false });

      if (contribError) throw contribError;
      const recentContributions = (contributionsData || []) as SavingsContribution[];

      // Compute totals
      const totalSaved = goals.reduce((sum, g) => sum + (g.current_amount || 0), 0);
      const totalTarget = goals.reduce((sum, g) => sum + (g.target_amount || 0), 0);
      const totalMonthlyContribution = goals.reduce((sum, g) => sum + (g.monthly_contribution || 0), 0);

      return {
        goals,
        recentContributions,
        totalSaved,
        totalTarget,
        totalMonthlyContribution,
      };
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    goals: data?.goals,
    recentContributions: data?.recentContributions,
    totalSaved: data?.totalSaved,
    totalTarget: data?.totalTarget,
    totalMonthlyContribution: data?.totalMonthlyContribution,
    isLoading,
    error,
    mutate,
  };
}
