'use client';

import { BudgetCard } from './budget-card';

interface CategoryBudget {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  budgetId: string | null;
  budgeted: number;
  spent: number;
}

interface BudgetGridProps {
  categoryBudgets: CategoryBudget[];
  userId: string;
  currentMonth: string;
  onRefresh?: () => void;
}

export function BudgetGrid({ categoryBudgets, userId, currentMonth, onRefresh }: BudgetGridProps) {
  // Separate budgeted and unbudgeted, sort by % spent (attention-needed first)
  const budgetedCategories = categoryBudgets
    .filter(b => b.budgeted > 0)
    .sort((a, b) => {
      const pctA = a.budgeted > 0 ? a.spent / a.budgeted : 0;
      const pctB = b.budgeted > 0 ? b.spent / b.budgeted : 0;
      return pctB - pctA;
    });
  const unbudgetedCategories = categoryBudgets.filter(b => b.budgeted === 0);

  return (
    <div className="space-y-8">
      {/* Budgeted Categories */}
      {budgetedCategories.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Active Budgets</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {budgetedCategories.map((budget) => (
              <BudgetCard
                key={budget.categoryId}
                {...budget}
                userId={userId}
                currentMonth={currentMonth}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        </div>
      )}

      {/* Unbudgeted Categories */}
      {unbudgetedCategories.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
            {budgetedCategories.length > 0 ? 'Add More Budgets' : 'Set Your First Budget'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {unbudgetedCategories.map((budget) => (
              <BudgetCard
                key={budget.categoryId}
                {...budget}
                userId={userId}
                currentMonth={currentMonth}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
