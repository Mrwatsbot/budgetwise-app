'use client';

import { useSavings } from '@/lib/hooks/use-data';
import { Card, CardContent } from '@/components/ui/card';
import { Target, TrendingUp, Loader2 } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { cn } from '@/lib/utils';

interface SavingsGoal {
  id: string;
  name: string;
  type: string;
  monthly_contribution: number;
  current_amount: number;
  target_amount: number | null;
  recent_contributions?: { id: string; amount: number; date: string }[];
}

export function SavingsBudgetSection() {
  const { goals, isLoading } = useSavings();

  // Calculate this month's contributions
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStr = startOfMonth.toISOString().split('T')[0];

  const goalsWithMonthlyProgress = (goals as SavingsGoal[]).map((goal) => {
    const monthlyContributions = (goal.recent_contributions || [])
      .filter((c) => c.date >= monthStr)
      .reduce((sum, c) => sum + c.amount, 0);

    return {
      ...goal,
      contributedThisMonth: monthlyContributions,
    };
  });

  const totalMonthlyTarget = goalsWithMonthlyProgress.reduce(
    (sum, g) => sum + g.monthly_contribution,
    0
  );
  const totalContributedThisMonth = goalsWithMonthlyProgress.reduce(
    (sum, g) => sum + g.contributedThisMonth,
    0
  );

  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (goals.length === 0) {
    return null; // Don't show section if no savings goals exist
  }

  const overallPercentage =
    totalMonthlyTarget > 0 ? (totalContributedThisMonth / totalMonthlyTarget) * 100 : 0;
  const isOnTrack = overallPercentage >= 90;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[#7aba5c]" />
          <h2 className="text-lg font-semibold">Savings & Investments</h2>
        </div>
      </div>

      {/* Summary Card */}
      <div className="glass-card rounded-xl px-4 sm:px-6 py-4">
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">Monthly Target</p>
            <p className="text-base sm:text-xl font-bold text-[#7aba5c]">
              ${totalMonthlyTarget.toFixed(2)}
            </p>
          </div>
          <div className="text-center border-l border-border">
            <p className="text-xs sm:text-sm text-muted-foreground">Contributed</p>
            <p
              className={cn(
                'text-base sm:text-xl font-bold',
                isOnTrack ? 'text-[#7aba5c]' : 'text-teal-400'
              )}
            >
              ${totalContributedThisMonth.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {overallPercentage.toFixed(0)}% of target
            </span>
            <span
              className={cn(
                totalMonthlyTarget - totalContributedThisMonth < 0
                  ? 'text-[#7aba5c]'
                  : 'text-muted-foreground'
              )}
            >
              ${(totalMonthlyTarget - totalContributedThisMonth).toFixed(2)} remaining
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-border/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all bg-gradient-to-r from-[#7aba5c] to-[#5a9a3c]"
              style={{
                width: `${Math.min(overallPercentage, 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Individual Goals */}
      <div className="space-y-2">
        {goalsWithMonthlyProgress.map((goal) => {
          const goalPercentage =
            goal.monthly_contribution > 0
              ? (goal.contributedThisMonth / goal.monthly_contribution) * 100
              : 0;
          const isGoalOnTrack = goalPercentage >= 90;

          return (
            <div
              key={goal.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/50 transition-colors relative"
            >
              {/* Icon */}
              <div className="w-9 h-9 rounded-lg bg-[#7aba5c]/15 flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 text-[#7aba5c]" />
              </div>

              {/* Name + Type */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{goal.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{goal.type}</p>
              </div>

              {/* Amounts */}
              <div className="text-right flex-shrink-0">
                <p
                  className={cn(
                    'text-sm font-semibold',
                    isGoalOnTrack ? 'text-[#7aba5c]' : 'text-muted-foreground'
                  )}
                >
                  $<AnimatedNumber value={goal.contributedThisMonth} format="integer" />
                </p>
                <p className="text-xs text-muted-foreground">
                  / $<AnimatedNumber value={goal.monthly_contribution} format="integer" />
                </p>
              </div>

              {/* Progress bar (full width below) */}
              <div className="absolute left-3 right-3 bottom-0 h-1 bg-secondary/30 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all rounded-full bg-gradient-to-r from-[#7aba5c] to-[#5a9a3c]"
                  style={{
                    width: `${Math.min(goalPercentage, 100)}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
