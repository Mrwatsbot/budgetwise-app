'use client';

import { useSavings } from '@/lib/hooks/use-data';
import { AddGoalDialog } from '@/components/savings/add-goal-dialog';
import { GoalCard } from '@/components/savings/goal-card';
import { ListLoading } from '@/components/layout/page-loading';
import { Card, CardContent } from '@/components/ui/card';
import { Target, TrendingUp } from 'lucide-react';
import { InsightsPanel } from '@/components/ai/insights-panel';

const INVESTMENT_TYPES = ['retirement_401k', 'ira', 'hsa', 'education_529', 'brokerage'];

export function SavingsContent() {
  const { goals, user, isLoading, refresh } = useSavings();

  // Separate goals from investments
  const savingsGoals = goals.filter((g: { type: string; target_amount: number | null }) => 
    !INVESTMENT_TYPES.includes(g.type) || (g.target_amount && g.target_amount > 0)
  );
  
  const investments = goals.filter((g: { type: string; target_amount: number | null }) => 
    INVESTMENT_TYPES.includes(g.type) && (!g.target_amount || g.target_amount === 0)
  );

  // Goals stats
  const goalsSaved = savingsGoals.reduce((sum: number, g: { current_amount: number }) => sum + (g.current_amount || 0), 0);
  const goalsTarget = savingsGoals.reduce((sum: number, g: { target_amount: number | null }) => sum + (g.target_amount || 0), 0);
  const goalsProgress = goalsTarget > 0 ? (goalsSaved / goalsTarget) * 100 : 0;

  // Investment stats
  const investmentBalance = investments.reduce((sum: number, g: { current_amount: number }) => sum + (g.current_amount || 0), 0);
  const investmentMonthly = investments.reduce((sum: number, g: { monthly_contribution: number }) => sum + (g.monthly_contribution || 0), 0);
  const investmentCount = investments.length;

  const hasGoals = savingsGoals.length > 0;
  const hasInvestments = investments.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Savings & Investments</h1>
          <p className="text-muted-foreground">Track your path to financial freedom</p>
        </div>
      </div>

      {isLoading ? (
        <ListLoading />
      ) : !hasGoals && !hasInvestments ? (
        /* Empty State */
        <Card>
          <CardContent className="p-8 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">Create Your First Goal</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Track your emergency fund, retirement accounts, and custom savings goals all in one place.
            </p>
            <AddGoalDialog onRefresh={refresh} section="goal" />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Savings Goals Section */}
          {hasGoals && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Target className="w-5 h-5 text-[#1a7a6d]" />
                    Savings Goals
                  </h2>
                  <p className="text-sm text-muted-foreground">Things you're saving for</p>
                </div>
                <AddGoalDialog onRefresh={refresh} section="goal" />
              </div>

              {/* Goals Summary */}
              <div className="grid gap-3 grid-cols-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total Saved</p>
                    <p className="text-lg font-bold text-[#7aba5c]">
                      ${goalsSaved.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total Target</p>
                    <p className="text-lg font-bold text-[#1a7a6d]">
                      ${goalsTarget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Progress</p>
                    <p className="text-lg font-bold text-teal-400">
                      {goalsProgress.toFixed(0)}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Goal Cards Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {savingsGoals.map((goal: { id: string; name: string; type: string; target_amount: number | null; current_amount: number; monthly_contribution: number; recent_contributions?: { id: string; amount: number; date: string }[] }) => (
                  <GoalCard key={goal.id} goal={goal} onRefresh={refresh} />
                ))}
              </div>
            </div>
          )}

          {/* Investment Accounts Section */}
          {hasInvestments && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#1a7a6d]" />
                    Investment Accounts
                  </h2>
                  <p className="text-sm text-muted-foreground">Where your money grows</p>
                </div>
                <AddGoalDialog onRefresh={refresh} section="investment" />
              </div>

              {/* Investment Summary */}
              <div className="grid gap-3 grid-cols-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total Balance</p>
                    <p className="text-lg font-bold text-[#7aba5c]">
                      ${investmentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Monthly Contributions</p>
                    <p className="text-lg font-bold text-blue-400">
                      ${investmentMonthly.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Accounts</p>
                    <p className="text-lg font-bold text-teal-400">
                      {investmentCount}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Investment Cards Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {investments.map((goal: { id: string; name: string; type: string; target_amount: number | null; current_amount: number; monthly_contribution: number; recent_contributions?: { id: string; amount: number; date: string }[] }) => (
                  <GoalCard key={goal.id} goal={goal} onRefresh={refresh} isInvestment={true} />
                ))}
              </div>
            </div>
          )}

          {/* Show one section prompt if only goals or investments exist */}
          {hasGoals && !hasInvestments && (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <h3 className="font-semibold mb-1 text-sm">Track Investment Accounts</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Add your 401(k), IRA, HSA, or brokerage accounts.
                </p>
                <AddGoalDialog onRefresh={refresh} section="investment" />
              </CardContent>
            </Card>
          )}

          {!hasGoals && hasInvestments && (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <Target className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <h3 className="font-semibold mb-1 text-sm">Create Savings Goals</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Set targets for emergency fund, vacation, car, or other goals.
                </p>
                <AddGoalDialog onRefresh={refresh} section="goal" />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* AI Insights */}
      <InsightsPanel page="savings" />
    </div>
  );
}
