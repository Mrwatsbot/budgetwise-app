'use client';

import { useState } from 'react';
import { useDashboard } from '@/lib/hooks/use-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, TrendingUp, TrendingDown, DollarSign, Pencil, Check, X, Loader2, Briefcase } from 'lucide-react';
import { getCategoryIcon } from '@/lib/category-icons';
import { ScoreWidget } from '@/components/score/score-widget';
import { DashboardLoading } from '@/components/layout/page-loading';
import { InsightsPanel } from '@/components/ai/insights-panel';
import { SafeToSpendWidget } from '@/components/dashboard/safe-to-spend-widget';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { toast } from 'sonner';

export function CreatorDashboardContent() {
  const { data, isLoading, refresh } = useDashboard();
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeValue, setIncomeValue] = useState('');
  const [savingIncome, setSavingIncome] = useState(false);

  if (isLoading || !data) {
    return <DashboardLoading />;
  }

  const { totalBalance, monthlyIncome, monthlyExpenses, recentTransactions, budgets, user, accounts, budgetedMonthlyIncome, scoreData, recentAchievements } = data;
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const hasIncome = budgetedMonthlyIncome > 0;
  const netCashFlow = monthlyIncome - monthlyExpenses;

  // Calculate budget allocation
  const totalBudgeted = (data.budgets || []).reduce((sum: number, b: { budgeted: number }) => sum + (b.budgeted || 0), 0);
  const budgetedPercent = budgetedMonthlyIncome > 0 ? Math.min((totalBudgeted / budgetedMonthlyIncome) * 100, 100) : 0;
  const unallocated = budgetedMonthlyIncome - totalBudgeted;
  const isOverAllocated = totalBudgeted > budgetedMonthlyIncome;

  const handleEditIncome = () => {
    setIncomeValue(budgetedMonthlyIncome > 0 ? budgetedMonthlyIncome.toString() : '');
    setEditingIncome(true);
  };

  const handleSaveIncome = async () => {
    const amount = parseFloat(incomeValue);
    if (isNaN(amount) || amount < 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSavingIncome(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthly_income: amount }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Monthly income updated!');
      setEditingIncome(false);
      refresh();
    } catch {
      toast.error('Failed to update income');
    } finally {
      setSavingIncome(false);
    }
  };

  const formattedTransactions = (recentTransactions || []).map((t: { id: string; amount: number; payee_clean: string | null; payee_original: string | null; date: string; category: { name: string } | null }) => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Creator Dashboard</h1>
          <p className="text-muted-foreground">{currentMonth}</p>
        </div>
        <Button className="gradient-btn border-0" asChild>
          <a href="/transactions">
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </a>
        </Button>
      </div>

      {/* Monthly Income Banner */}
      <div className="glass-card rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6db555]/20 to-emerald-500/20 border border-[#6db555]/30 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-[#7aba5c]" />
            </div>
            <div>
              <p className="font-medium">Monthly Income</p>
              <p className="text-xs text-muted-foreground">Take-home pay after taxes</p>
            </div>
          </div>
          {!editingIncome && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleEditIncome}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>

        {editingIncome ? (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={incomeValue}
                onChange={(e) => setIncomeValue(e.target.value)}
                className="pl-7 bg-secondary/50 border-border"
                placeholder="5,000.00"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveIncome()}
              />
            </div>
            <Button
              size="icon"
              className="gradient-btn border-0 h-9 w-9"
              onClick={handleSaveIncome}
              disabled={savingIncome}
            >
              {savingIncome ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="border-border h-9 w-9"
              onClick={() => setEditingIncome(false)}
              disabled={savingIncome}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : hasIncome ? (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold">${budgetedMonthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              <span className="text-sm text-muted-foreground">per month</span>
            </div>
            {/* Income allocation bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  ${totalBudgeted.toLocaleString('en-US', { minimumFractionDigits: 2 })} budgeted ({budgetedPercent.toFixed(0)}%)
                </span>
                <span className={isOverAllocated ? 'text-red-400' : unallocated > 0 ? 'text-[#7aba5c]' : 'text-muted-foreground'}>
                  {isOverAllocated
                    ? `-$${Math.abs(unallocated).toLocaleString('en-US', { minimumFractionDigits: 2 })} over`
                    : `$${unallocated.toLocaleString('en-US', { minimumFractionDigits: 2 })} free`}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-secondary overflow-hidden relative">
                {/* Budgeted allocation */}
                <div
                  className="h-full rounded-full transition-all absolute inset-y-0 left-0"
                  style={{
                    width: `${budgetedPercent}%`,
                    backgroundColor: isOverAllocated ? '#ef4444' : '#1a7a6d',
                    opacity: 0.3,
                  }}
                />
                {/* Actual spending */}
                <div
                  className="h-full rounded-full transition-all absolute inset-y-0 left-0"
                  style={{
                    width: `${Math.min((monthlyExpenses / budgetedMonthlyIncome) * 100, 100)}%`,
                    backgroundColor: monthlyExpenses > totalBudgeted ? '#ef4444' : '#1a7a6d',
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>${monthlyExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })} spent this month</span>
                <span className={netCashFlow >= 0 ? 'text-[#7aba5c]' : 'text-red-400'}>
                  {netCashFlow >= 0 ? '+' : ''}{netCashFlow.toLocaleString('en-US', { minimumFractionDigits: 2 })} net
                </span>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={handleEditIncome}
            className="w-full py-3 rounded-lg border border-dashed border-[#6db555]/30 text-[#7aba5c] text-sm hover:bg-[#6db555]/5 transition-colors"
          >
            + Set your monthly income to unlock smarter budgeting
          </button>
        )}
      </div>

      {/* Safe to Spend Widget */}
      {hasIncome && (
        <SafeToSpendWidget
          monthlyIncome={budgetedMonthlyIncome}
          totalBudgeted={totalBudgeted}
          monthlyExpenses={monthlyExpenses}
          currentMonth={new Date().toISOString().split('T')[0]}
          onBudgetAdjusted={refresh}
        />
      )}

      {/* Financial Health Score Widget */}
      {scoreData && (
        <ScoreWidget
          score={scoreData.score}
          level={scoreData.level}
          levelTitle={scoreData.levelTitle}
          previousScore={scoreData.previousScore}
          recentAchievements={recentAchievements}
        />
      )}

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold"><AnimatedNumber value={totalBalance} format="currency" /></div>
            <p className="text-xs text-muted-foreground">Across {accounts?.length || 0} account{accounts?.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-[#6db555]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+<AnimatedNumber value={monthlyIncome} format="currency" /></div>
            <p className="text-xs text-muted-foreground">{currentMonth}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">-<AnimatedNumber value={monthlyExpenses} format="currency" /></div>
            <p className="text-xs text-muted-foreground">{currentMonth}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Budget Overview</CardTitle>
            <CardDescription>Your spending vs budget this month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgets && budgets.length > 0 ? budgets.map((budget: { name: string; icon: string; budgeted: number; spent: number; color: string }) => {
              const percentage = (budget.spent / budget.budgeted) * 100;
              const isOver = percentage > 100;
              const BudgetIcon = getCategoryIcon(budget.icon, budget.name);
              return (
                <div key={budget.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <BudgetIcon className="w-4 h-4" style={{ color: budget.color || '#1a7a6d' }} />
                      <span className="font-medium">{budget.name}</span>
                    </div>
                    <span className={isOver ? 'text-red-500' : ''}>
                      ${budget.spent.toFixed(2)} / ${budget.budgeted}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(percentage, 100)}%`,
                        backgroundColor: isOver ? '#ef4444' : budget.color,
                      }}
                    />
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-3">No budgets set yet</p>
                <Button variant="outline" asChild>
                  <a href="/budgets">Set Up Budgets</a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest activity</CardDescription>
          </CardHeader>
          <CardContent>
            {formattedTransactions.length > 0 ? (
              <div className="space-y-4">
                {formattedTransactions.map((transaction: { id: string; payee: string; amount: number; category: string; date: string }) => (
                  <div key={transaction.id} className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-medium">{transaction.payee}</span>
                      <span className="text-xs text-muted-foreground">
                        {transaction.category} • {transaction.date}
                      </span>
                    </div>
                    <span className={transaction.amount > 0 ? 'text-green-600 font-medium' : 'font-medium'}>
                      {transaction.amount > 0 ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No transactions yet this month</p>
            )}
            <Button variant="outline" className="w-full mt-4" asChild>
              <a href="/transactions">View All Transactions</a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <InsightsPanel page="dashboard" />
    </div>
  );
}
