'use client';

import { 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { getCategoryIcon } from '@/lib/category-icons';
import { getBudgetBarStyle } from '@/lib/bar-colors';

interface CategoryBudget {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  budgeted: number;
  spent: number;
}

interface BudgetHealthChartProps {
  categoryBudgets: CategoryBudget[];
}

export function BudgetHealthChart({ categoryBudgets }: BudgetHealthChartProps) {
  // Only show categories with budgets set
  const budgetedCategories = categoryBudgets.filter(b => b.budgeted > 0);
  
  if (budgetedCategories.length === 0) {
    return null;
  }

  // Calculate overall health
  const totalBudgeted = budgetedCategories.reduce((sum, b) => sum + b.budgeted, 0);
  const totalSpent = budgetedCategories.reduce((sum, b) => sum + b.spent, 0);
  const overallPercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
  
  // Count categories by status
  const onTrack = budgetedCategories.filter(b => (b.spent / b.budgeted) <= 1).length;
  const overBudget = budgetedCategories.filter(b => (b.spent / b.budgeted) > 1).length;
  const nearLimit = budgetedCategories.filter(b => {
    const pct = (b.spent / b.budgeted);
    return pct > 0.85 && pct <= 1;
  }).length;

  // Get health status
  const getHealthStatus = () => {
    if (overallPercentage > 100) return { label: 'Over Budget', color: 'text-red-400', bg: 'bg-red-500/20' };
    if (overallPercentage > 85) return { label: 'Near Limit', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    return { label: 'On Track', color: 'text-[#7aba5c]', bg: 'bg-[#6db555]/20' };
  };

  const healthStatus = getHealthStatus();

  // Get bar color based on percentage
  const getBarColor = (percentage: number) => {
    if (percentage > 100) return '#ef4444'; // red
    if (percentage > 85) return '#eab308'; // yellow
    return '#22c55e'; // green
  };

  // Sort by percentage (highest first to show problem areas)
  const sortedCategories = [...budgetedCategories].sort((a, b) => {
    const pctA = a.spent / a.budgeted;
    const pctB = b.spent / b.budgeted;
    return pctB - pctA;
  });

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long' });

  return (
    <div className="glass-card rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{currentMonth} Budget Health</h2>
          <p className="text-sm text-muted-foreground">At-a-glance spending overview</p>
        </div>
        <div className={`px-4 py-2 rounded-lg ${healthStatus.bg} flex items-center gap-2`}>
          {overallPercentage <= 100 ? (
            <CheckCircle2 className={`w-5 h-5 ${healthStatus.color}`} />
          ) : (
            <AlertTriangle className={`w-5 h-5 ${healthStatus.color}`} />
          )}
          <span className={`font-semibold ${healthStatus.color}`}>
            {Math.round(overallPercentage)}%
          </span>
        </div>
      </div>

      {/* Category Bars */}
      <div className="space-y-3">
        {sortedCategories.map((budget) => {
          const percentage = (budget.spent / budget.budgeted) * 100;
          const remaining = budget.budgeted - budget.spent;
          const isOver = remaining < 0;
          const IconComponent = getCategoryIcon(budget.categoryIcon, budget.categoryName);

          return (
            <div key={budget.categoryId} className="space-y-1.5">
              {/* Label Row */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <IconComponent 
                    className="w-4 h-4" 
                    style={{ color: budget.categoryColor || '#1a7a6d' }} 
                  />
                  <span className="font-medium">{budget.categoryName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">
                    {Math.round(percentage)}%
                  </span>
                  <span className={`font-medium min-w-[70px] text-right ${isOver ? 'text-red-400' : 'text-[#7aba5c]'}`}>
                    {isOver ? '+' : '-'}${Math.abs(remaining).toFixed(0)}
                  </span>
                  {isOver && <AlertTriangle className="w-4 h-4 text-red-400" />}
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="h-2.5 rounded-full bg-border/10 overflow-hidden progress-bar-container">
                {percentage > 0 && (
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(percentage, 100)}%`,
                      ...getBudgetBarStyle(budget.spent, budget.budgeted),
                    }}
                  />
                )}
                {/* Overage indicator */}
                {percentage > 100 && (
                  <div 
                    className="h-full rounded-full bg-red-400/30 -mt-2.5"
                    style={{ 
                      width: '100%',
                      backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(239,68,68,0.3) 5px, rgba(239,68,68,0.3) 10px)'
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#6db555]" />
            <span className="text-muted-foreground">On track ({onTrack})</span>
          </div>
          {nearLimit > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-muted-foreground">Near limit ({nearLimit})</span>
            </div>
          )}
          {overBudget > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Over budget ({overBudget})</span>
            </div>
          )}
        </div>
        <div className="text-muted-foreground">
          ${totalSpent.toFixed(0)} / ${totalBudgeted.toFixed(0)}
        </div>
      </div>
    </div>
  );
}
