'use client';

import { useUser } from '@/hooks/use-user';
import { useBudgets } from '@/hooks/use-budgets';
import { AppShell } from '@/components/layout/app-shell';
import { BudgetsSkeleton } from '@/components/ui/page-skeleton';
import { BudgetGrid } from '@/components/budgets/budget-grid';

export default function BudgetsPage() {
  const { user, userProfile, isLoading: userLoading } = useUser();
  const {
    categoryBudgets,
    totalBudgeted,
    totalSpent,
    currentMonthStr,
    monthName,
    isLoading: dataLoading,
    mutate,
  } = useBudgets();

  const isLoading = userLoading || dataLoading;

  if (isLoading || !categoryBudgets || totalBudgeted === undefined || totalSpent === undefined) {
    return (
      <AppShell user={{ email: '', full_name: '' }}>
        <BudgetsSkeleton />
      </AppShell>
    );
  }

  const remaining = totalBudgeted - totalSpent;

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
              <p className={`text-xl font-bold ${remaining < 0 ? 'text-red-400' : 'text-green-400'}`}>
                ${remaining.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Budget Grid */}
        <BudgetGrid 
          categoryBudgets={categoryBudgets} 
          userId={user!.id}
          currentMonth={currentMonthStr!}
          onMutate={() => mutate()}
        />
      </div>
    </AppShell>
  );
}
