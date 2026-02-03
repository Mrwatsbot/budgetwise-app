/**
 * Calculate spending pace indicator for a budget category
 */
export function calculatePaceIndicator(
  spent: number,
  budgeted: number,
  currentMonth: string
): { text: string; isOverPace: boolean; projectedOverspend: number } | null {
  if (budgeted <= 0) return null;

  const [year, month] = currentMonth.split('-').map(Number);
  const today = new Date();
  const currentDayOfMonth = today.getDate();
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysElapsed = Math.min(currentDayOfMonth, daysInMonth);
  const daysRemaining = daysInMonth - daysElapsed;

  // Don't show pace on first day
  if (daysElapsed < 2) return null;

  // Calculate daily spend rate
  const dailyRate = spent / daysElapsed;
  
  // Project end-of-month total
  const projectedTotal = spent + (dailyRate * daysRemaining);
  
  // Check if we're on pace, over pace, or under pace
  const expectedPace = (daysElapsed / daysInMonth);
  const actualPace = spent / budgeted;
  
  const isOverPace = projectedTotal > budgeted || actualPace > expectedPace + 0.05;
  const projectedOverspend = Math.max(0, projectedTotal - budgeted);

  if (isOverPace && projectedOverspend > 1) {
    return {
      text: `⚠️ $${projectedOverspend.toFixed(0)} over by month end`,
      isOverPace: true,
      projectedOverspend,
    };
  }

  return {
    text: 'On pace',
    isOverPace: false,
    projectedOverspend: 0,
  };
}
