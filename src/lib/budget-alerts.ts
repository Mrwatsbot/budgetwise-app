/**
 * Budget Alerts Logic
 * 
 * Pure client-side math to generate budget alerts based on:
 * - Spending pace (overspending relative to time in month)
 * - Warning thresholds (75% and 90%)
 * - Overspent budgets
 */

export type AlertType = 'pace' | 'warning' | 'danger' | 'overspent';

export interface BudgetAlert {
  categoryId: string;
  categoryName: string;
  type: AlertType;
  message: string;
  percentUsed: number;
}

export interface CategoryBudgetData {
  categoryId: string;
  categoryName: string;
  budgeted: number;
  spent: number;
  rollover_amount?: number;
}

/**
 * Generate alerts for a set of category budgets
 */
export function generateBudgetAlerts(
  categoryBudgets: CategoryBudgetData[],
  dismissedAlerts: Set<string> = new Set()
): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];
  
  // Calculate day-of-month fraction (what % of the month has elapsed)
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayFraction = dayOfMonth / daysInMonth;

  for (const budget of categoryBudgets) {
    // Skip categories with no budget set or already dismissed
    if (budget.budgeted <= 0) continue;
    
    const alertKey = `${budget.categoryId}-${year}-${month}`;
    if (dismissedAlerts.has(alertKey)) continue;

    const totalBudget = budget.budgeted + (budget.rollover_amount || 0);
    const percentUsed = totalBudget > 0 ? (budget.spent / totalBudget) * 100 : 0;
    
    // 1. Overspent alert (highest priority)
    if (budget.spent > totalBudget) {
      const overage = budget.spent - totalBudget;
      alerts.push({
        categoryId: budget.categoryId,
        categoryName: budget.categoryName,
        type: 'overspent',
        message: `Over budget by $${overage.toFixed(2)}`,
        percentUsed,
      });
      continue; // Don't show multiple alerts for same category
    }

    // 2. Danger threshold (90%+)
    if (percentUsed >= 90) {
      const remaining = totalBudget - budget.spent;
      alerts.push({
        categoryId: budget.categoryId,
        categoryName: budget.categoryName,
        type: 'danger',
        message: `Only $${remaining.toFixed(2)} remaining (${percentUsed.toFixed(0)}% used)`,
        percentUsed,
      });
      continue;
    }

    // 3. Warning threshold (75%+)
    if (percentUsed >= 75) {
      alerts.push({
        categoryId: budget.categoryId,
        categoryName: budget.categoryName,
        type: 'warning',
        message: `${percentUsed.toFixed(0)}% of budget used`,
        percentUsed,
      });
      continue;
    }

    // 4. Pace alert (spending faster than time elapsed)
    // Only check pace if we're past day 5 (avoid early-month noise)
    if (dayOfMonth > 5 && percentUsed > dayFraction * 100 + 15) {
      // +15% tolerance to avoid false alarms
      const expectedSpent = dayFraction * totalBudget;
      const overpace = budget.spent - expectedSpent;
      alerts.push({
        categoryId: budget.categoryId,
        categoryName: budget.categoryName,
        type: 'pace',
        message: `Spending ahead of pace (day ${dayOfMonth}/${daysInMonth}, ${percentUsed.toFixed(0)}% spent)`,
        percentUsed,
      });
    }
  }

  // Sort by severity: overspent > danger > warning > pace
  const severityOrder: Record<AlertType, number> = {
    overspent: 0,
    danger: 1,
    warning: 2,
    pace: 3,
  };
  
  alerts.sort((a, b) => {
    const severityDiff = severityOrder[a.type] - severityOrder[b.type];
    if (severityDiff !== 0) return severityDiff;
    // Within same severity, sort by percent used (highest first)
    return b.percentUsed - a.percentUsed;
  });

  return alerts;
}

/**
 * Get dismissed alerts from localStorage for current month
 */
export function getDismissedAlerts(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  
  try {
    const stored = localStorage.getItem('budget-alerts-dismissed');
    if (!stored) return new Set();
    
    const data = JSON.parse(stored);
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${now.getMonth()}`;
    
    // Only return dismissals for current month
    return new Set(data[currentKey] || []);
  } catch {
    return new Set();
  }
}

/**
 * Dismiss an alert for the current month
 */
export function dismissAlert(categoryId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthKey = `${year}-${month}`;
    const alertKey = `${categoryId}-${year}-${month}`;
    
    const stored = localStorage.getItem('budget-alerts-dismissed');
    const data = stored ? JSON.parse(stored) : {};
    
    if (!data[monthKey]) {
      data[monthKey] = [];
    }
    
    if (!data[monthKey].includes(alertKey)) {
      data[monthKey].push(alertKey);
    }
    
    // Clean up old months (keep only current and previous month)
    const prevMonthKey = month === 0 
      ? `${year - 1}-11` 
      : `${year}-${month - 1}`;
    
    const validKeys = [monthKey, prevMonthKey];
    Object.keys(data).forEach(key => {
      if (!validKeys.includes(key)) {
        delete data[key];
      }
    });
    
    localStorage.setItem('budget-alerts-dismissed', JSON.stringify(data));
  } catch (error) {
    console.error('Failed to dismiss alert:', error);
  }
}
