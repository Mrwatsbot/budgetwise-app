'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useDashboard } from '@/lib/hooks/use-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Building2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getCategoryIcon } from '@/lib/category-icons';
import { ScoreWidget } from '@/components/score/score-widget';
import { DashboardLoading } from '@/components/layout/page-loading';
import { InsightsPanel } from '@/components/ai/insights-panel';
import { MonthlyPulse } from '@/components/dashboard/monthly-pulse';
import { YearAtAGlance } from '@/components/dashboard/year-at-a-glance';
import { DraggableDashboard, type Widget } from '@/components/dashboard/draggable-dashboard';
import { useWidgetOrder } from '@/lib/hooks/use-widget-order';
import { toast } from 'sonner';
import { getBudgetHealthColor } from '@/lib/budget-health';

export function DashboardContent() {
  const { data, isLoading, refresh } = useDashboard();
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeValue, setIncomeValue] = useState('');
  const [savingIncome, setSavingIncome] = useState(false);

  if (isLoading || !data) {
    return <DashboardLoading />;
  }

  const { totalBalance, monthlyIncome, monthlyExpenses, recentTransactions, budgets, totalBudgeted, totalSavingsTarget, user, accounts, budgetedMonthlyIncome, scoreData, recentAchievements, plaidLastSynced, monthlySummary, ytdSurplus } = data;
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const hasIncome = budgetedMonthlyIncome > 0;

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

  const { orderedIds, setOrderedIds, saveOrder, discardChanges, resetOrder, hasChanges } = useWidgetOrder();

  // Build widget sections as a map
  const widgetSections: Record<string, ReactNode> = {
    'monthly-pulse': hasIncome ? (
      <MonthlyPulse
        monthlyIncome={budgetedMonthlyIncome}
        totalBudgeted={totalBudgeted}
        monthlyExpenses={monthlyExpenses}
        currentMonth={new Date().toISOString().split('T')[0]}
        editingIncome={editingIncome}
        setEditingIncome={setEditingIncome}
        incomeValue={incomeValue}
        setIncomeValue={setIncomeValue}
        savingIncome={savingIncome}
        handleSaveIncome={handleSaveIncome}
        onBudgetAdjusted={refresh}
        totalBalance={totalBalance}
        accountCount={accounts?.length || 0}
      />
    ) : null,

    'score-widget': scoreData ? (
      <ScoreWidget
        score={scoreData.score}
        level={scoreData.level}
        levelTitle={scoreData.levelTitle}
        previousScore={scoreData.previousScore}
        recentAchievements={recentAchievements}
      />
    ) : null,

    'year-at-a-glance': monthlySummary && monthlySummary.length > 0 ? (
      <YearAtAGlance monthlySummary={monthlySummary} ytdSurplus={ytdSurplus || 0} />
    ) : null,

    'budget-overview': (
      <div className="glass-card rounded-xl p-5">
        <div className="mb-4">
          <h3 className="font-semibold text-base">Budget Overview</h3>
          <p className="text-xs text-muted-foreground">Spending vs budget this month</p>
        </div>
        <div className="space-y-4">
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
                  <span className={isOver ? 'text-red-500' : 'text-muted-foreground'}>
                    ${budget.spent.toFixed(2)} / ${budget.budgeted}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-border/10 overflow-hidden progress-bar-container">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(percentage, 100)}%`,
                      backgroundColor: isOver
                        ? '#ef4444'
                        : getBudgetHealthColor(budget.spent, budget.budgeted),
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
        </div>
      </div>
    ),

    'recent-transactions': (
      <div className="glass-card rounded-xl p-5">
        <div className="mb-4">
          <h3 className="font-semibold text-base">Recent Transactions</h3>
          <p className="text-xs text-muted-foreground">Your latest activity</p>
        </div>
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
                <span className={transaction.amount > 0 ? 'text-[#7aba5c] font-medium' : 'font-medium'}>
                  {transaction.amount > 0 ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">No transactions yet this month</p>
        )}
        <Button variant="outline" className="w-full mt-4 border-border/50" asChild>
          <a href="/transactions">View All Transactions</a>
        </Button>
      </div>
    ),

    'insights': <InsightsPanel page="dashboard" />,
  };

  // Build ordered widget list, filtering out null/hidden widgets
  const widgets: Widget[] = useMemo(() => {
    return orderedIds
      .filter(id => widgetSections[id] != null)
      .map(id => ({ id, content: widgetSections[id]! }));
  }, [orderedIds, hasIncome, scoreData, monthlySummary, budgets, formattedTransactions,
      editingIncome, incomeValue, savingIncome, budgetedMonthlyIncome, totalBudgeted,
      monthlyExpenses, totalBalance, accounts, recentAchievements, ytdSurplus]);

  const handleReorder = (newOrder: string[]) => {
    setOrderedIds(newOrder);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-4">
            <p className="text-muted-foreground">{currentMonth}</p>
            {plaidLastSynced && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span>Synced {formatDistanceToNow(new Date(plaidLastSynced), { addSuffix: true })}</span>
              </div>
            )}
          </div>
        </div>
        <Button className="gradient-btn border-0" asChild>
          <a href="/transactions">
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </a>
        </Button>
      </div>

      <DraggableDashboard
        widgets={widgets}
        onReorder={handleReorder}
        hasChanges={hasChanges}
        onSave={saveOrder}
        onDiscard={discardChanges}
        onReset={resetOrder}
      />
    </div>
  );
}
