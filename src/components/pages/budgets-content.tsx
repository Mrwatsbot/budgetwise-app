'use client';

import { useBudgets } from '@/lib/hooks/use-data';
import { BudgetGrid } from '@/components/budgets/budget-grid';
import { BudgetListCompact } from '@/components/budgets/budget-list-compact';
import { ListLoading } from '@/components/layout/page-loading';
import { InsightsPanel } from '@/components/ai/insights-panel';
import { AutoBudgetDialog } from '@/components/budgets/auto-budget-dialog';
import { BudgetTuneDialog } from '@/components/budgets/budget-tune-dialog';
import { AffordCheckDialog } from '@/components/budgets/afford-check-dialog';
import { SavingsBudgetSection } from '@/components/budgets/savings-budget-section';
import { getBudgetHealthColor } from '@/lib/budget-health';
import { getAllocationBarStyle } from '@/lib/bar-colors';

export function BudgetsContent() {
  const { budgets, categories, spentByCategory, monthlyIncome, totalSavingsTarget, user, isLoading, refresh } = useBudgets();

  // Current month info — use local timezone (not UTC) to avoid server/client mismatch
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Filter to expense categories only
  const expenseCategories = categories.filter((c: { type: string }) => c.type === 'expense');

  // Build budget map from API data
  const budgetMap: Record<string, { id: string; budgeted: number }> = {};
  budgets.forEach((b: { id: string; budgeted: number; category_id: string; category?: { id: string } | null }) => {
    const catId = b.category?.id || b.category_id;
    if (catId) {
      budgetMap[catId] = { id: b.id, budgeted: b.budgeted };
    }
  });

  // Combine into category budget data (same shape the BudgetGrid expects)
  const categoryBudgets = expenseCategories.map((cat: { id: string; name: string; icon: string | null; color: string | null }) => ({
    categoryId: cat.id,
    categoryName: cat.name,
    categoryIcon: cat.icon,
    categoryColor: cat.color,
    budgetId: budgetMap[cat.id]?.id || null,
    budgeted: budgetMap[cat.id]?.budgeted || 0,
    spent: spentByCategory[cat.id] || 0,
  }));

  // Calculate totals
  const totalBudgeted = categoryBudgets.reduce((sum: number, b: { budgeted: number }) => sum + b.budgeted, 0);
  const totalSpent = categoryBudgets.reduce((sum: number, b: { spent: number }) => sum + b.spent, 0);

  // Check if user has any budgets set
  const hasBudgets = categoryBudgets.some((b: { budgeted: number }) => b.budgeted > 0);

  return (
    <div className="space-y-6">
      {isLoading ? (
        <ListLoading />
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Budgets</h1>
              <p className="text-muted-foreground">{monthName}</p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* AI buttons */}
              <AutoBudgetDialog
                currentMonth={currentMonthStr}
                onApplied={refresh}
                
             />
              {hasBudgets && (
                <BudgetTuneDialog
                  currentMonth={currentMonthStr}
                  onApplied={refresh}
                />
              )}
              <AffordCheckDialog
                currentMonth={currentMonthStr}
                onBudgetAdjusted={refresh}
                
             />
            </div>
          </div>

          {/* Prominent Auto Budget CTA when no budgets exist */}
          {!hasBudgets && (
            <AutoBudgetDialog
              currentMonth={currentMonthStr}
              onApplied={refresh}
              prominent
              
           />
          )}

          {/* Summary Card */}
          <div className="glass-card rounded-xl px-4 sm:px-6 py-4 space-y-3">
            <div className="grid grid-cols-3 gap-2 sm:gap-6">
              <div className="text-center min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Budgeted</p>
                <p className="text-base sm:text-xl font-bold truncate">${totalBudgeted.toFixed(2)}</p>
              </div>
              <div className="text-center min-w-0 border-x border-border">
                <p className="text-xs sm:text-sm text-muted-foreground">Spent</p>
                <p className={`text-base sm:text-xl font-bold truncate ${totalSpent > totalBudgeted ? 'text-red-400' : 'text-[#7aba5c]'}`}>
                  ${totalSpent.toFixed(2)}
                </p>
              </div>
              <div className="text-center min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Remaining</p>
                <p className={`text-base sm:text-xl font-bold truncate ${totalBudgeted - totalSpent < 0 ? 'text-red-400' : 'text-[#7aba5c]'}`}>
                  ${(totalBudgeted - totalSpent).toFixed(2)}
                </p>
              </div>
            </div>
            {monthlyIncome > 0 && (
              <div className="pt-2 border-t border-border space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>${(totalBudgeted + (totalSavingsTarget || 0)).toFixed(2)} of ${monthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })} income allocated</span>
                  <span className={monthlyIncome - totalBudgeted - (totalSavingsTarget || 0) < 0 ? 'text-red-400' : 'text-[#7aba5c]'}>
                    ${(monthlyIncome - totalBudgeted - (totalSavingsTarget || 0)).toFixed(2)} unallocated
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-border/10 overflow-hidden progress-bar-container">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(((totalBudgeted + (totalSavingsTarget || 0)) / monthlyIncome) * 100, 100)}%`,
                      ...getAllocationBarStyle(Math.min(((totalBudgeted + (totalSavingsTarget || 0)) / monthlyIncome) * 100, 120)),
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Budget Display — Compact list on mobile, grid on desktop */}
          <div className="lg:hidden">
            <BudgetListCompact
              categoryBudgets={categoryBudgets}
              userId={user?.id || ''}
              currentMonth={currentMonthStr}
              onRefresh={refresh}
            />
          </div>
          <div className="hidden lg:block">
            <BudgetGrid
              categoryBudgets={categoryBudgets}
              userId={user?.id || ''}
              currentMonth={currentMonthStr}
              onRefresh={refresh}
            />
          </div>

          {/* Savings & Investments Section */}
          <SavingsBudgetSection />

          {/* AI Insights */}
          <InsightsPanel page="budgets" />
        </>
      )}
    </div>
  );
}
