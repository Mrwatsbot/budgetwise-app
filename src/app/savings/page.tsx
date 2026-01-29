'use client';

import { useUser } from '@/hooks/use-user';
import { useSavings } from '@/hooks/use-savings';
import { AppShell } from '@/components/layout/app-shell';
import { SavingsSkeleton } from '@/components/ui/page-skeleton';
import { GoalCard } from '@/components/savings/goal-card';
import { AddGoalDialog } from '@/components/savings/add-goal-dialog';
import { Target, TrendingUp, Calendar, Hash } from 'lucide-react';

export default function SavingsPage() {
  const { user, userProfile, isLoading: userLoading } = useUser();
  const {
    goals,
    totalSaved,
    totalTarget,
    totalMonthlyContribution,
    isLoading: dataLoading,
    mutate,
  } = useSavings();

  const isLoading = userLoading || dataLoading;

  if (isLoading || !goals || totalSaved === undefined) {
    return (
      <AppShell user={{ email: '', full_name: '' }}>
        <SavingsSkeleton />
      </AppShell>
    );
  }

  const handleMutate = () => mutate();

  return (
    <AppShell user={userProfile}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Savings & Investments</h1>
            <p className="text-muted-foreground">Track your goals and grow your wealth</p>
          </div>
          <AddGoalDialog userId={user!.id} onMutate={handleMutate} />
        </div>

        {/* Summary Stats Row */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <p className="text-sm text-muted-foreground">Total Saved</p>
            </div>
            <p className="text-xl font-bold text-green-400">
              ${totalSaved!.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-purple-400" />
              <p className="text-sm text-muted-foreground">Total Target</p>
            </div>
            <p className="text-xl font-bold">
              ${totalTarget!.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-blue-400" />
              <p className="text-sm text-muted-foreground">Monthly</p>
            </div>
            <p className="text-xl font-bold">
              ${totalMonthlyContribution!.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Hash className="h-4 w-4 text-amber-400" />
              <p className="text-sm text-muted-foreground">Active Goals</p>
            </div>
            <p className="text-xl font-bold">{goals.length}</p>
          </div>
        </div>

        {/* Goal Cards Grid or Empty State */}
        {goals.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
              <Target className="h-8 w-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No savings goals yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Start building your financial future by creating your first savings or investment goal.
            </p>
            <AddGoalDialog userId={user!.id} onMutate={handleMutate} />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} onMutate={handleMutate} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
