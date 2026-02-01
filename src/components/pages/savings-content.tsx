'use client';

import { useSavings } from '@/lib/hooks/use-data';
import { AddGoalDialog } from '@/components/savings/add-goal-dialog';
import { GoalCard } from '@/components/savings/goal-card';
import { ListLoading } from '@/components/layout/page-loading';
import { Card, CardContent } from '@/components/ui/card';
import { Target } from 'lucide-react';
import { InsightsPanel } from '@/components/ai/insights-panel';

export function SavingsContent() {
  const { goals, user, isLoading, refresh } = useSavings();

  const totalSaved = goals.reduce((sum: number, g: { current_amount: number }) => sum + (g.current_amount || 0), 0);
  const totalTarget = goals.reduce((sum: number, g: { target_amount: number | null }) => sum + (g.target_amount || 0), 0);
  const totalMonthly = goals.reduce((sum: number, g: { monthly_contribution: number }) => sum + (g.monthly_contribution || 0), 0);
  const activeCount = goals.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Savings & Investments</h1>
          <p className="text-muted-foreground">Track your path to financial freedom</p>
        </div>
        <AddGoalDialog onRefresh={refresh} />
      </div>

      {isLoading ? (
        <ListLoading />
      ) : goals.length > 0 ? (
        <>
          {/* Summary Row */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Saved</p>
                <p className="text-lg font-bold text-[#7aba5c]">
                  ${totalSaved.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Target</p>
                <p className="text-lg font-bold text-[#1a7a6d]">
                  ${totalTarget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Monthly Contributions</p>
                <p className="text-lg font-bold text-blue-400">
                  ${totalMonthly.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Active Goals</p>
                <p className="text-lg font-bold text-teal-400">{activeCount}</p>
              </CardContent>
            </Card>
          </div>

          {/* Goal Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal: { id: string; name: string; type: string; target_amount: number | null; current_amount: number; monthly_contribution: number; recent_contributions?: { id: string; amount: number; date: string }[] }) => (
              <GoalCard key={goal.id} goal={goal} onRefresh={refresh} />
            ))}
          </div>
        </>
      ) : (
        /* Empty State */
        <Card>
          <CardContent className="p-8 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">Create Your First Goal</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Track your emergency fund, retirement accounts, and custom savings goals all in one place.
            </p>
            <AddGoalDialog onRefresh={refresh} />
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      <InsightsPanel page="savings" />
    </div>
  );
}
