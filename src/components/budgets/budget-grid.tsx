'use client';

import { BudgetCard } from './budget-card';
import { StaggerContainer, StaggerItem } from '@/components/ui/stagger-children';

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
  onMutate?: () => void;
}

export function BudgetGrid({ categoryBudgets, userId, currentMonth, onMutate }: BudgetGridProps) {
  // Separate budgeted and unbudgeted categories
  const budgetedCategories = categoryBudgets.filter(b => b.budgeted > 0);
  const unbudgetedCategories = categoryBudgets.filter(b => b.budgeted === 0);

  return (
    <div className="space-y-8">
      {/* Budgeted Categories */}
      {budgetedCategories.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Active Budgets</h2>
          <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {budgetedCategories.map((budget) => (
              <StaggerItem key={budget.categoryId}>
                <BudgetCard
                  {...budget}
                  userId={userId}
                  currentMonth={currentMonth}
                  onMutate={onMutate}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      )}

      {/* Unbudgeted Categories */}
      {unbudgetedCategories.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
            {budgetedCategories.length > 0 ? 'Add More Budgets' : 'Set Your First Budget'}
          </h2>
          <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {unbudgetedCategories.map((budget) => (
              <StaggerItem key={budget.categoryId}>
                <BudgetCard
                  {...budget}
                  userId={userId}
                  currentMonth={currentMonth}
                  onMutate={onMutate}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      )}
    </div>
  );
}
