/**
 * Time-aware gradient for budget progress bars.
 * Returns an inline style object (NOT Tailwind classes) so it
 * actually works after Tailwind's build-time purge.
 */

function getMonthProgress() {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return (dayOfMonth / daysInMonth) * 100;
}

/**
 * Returns a CSS background style based on how spending compares
 * to expected spending for this point in the month.
 */
export function getTimeAwareStyle(spent: number, budgeted: number): React.CSSProperties {
  if (budgeted === 0) return { background: '#3f3a36' };

  const spentPct = (spent / budgeted) * 100;
  const expectedPct = getMonthProgress();
  const variance = spentPct - expectedPct;

  // Way under budget (>15% under expected)
  if (variance <= -15) {
    return { background: '#7daa68' }; // Solid green
  }
  // Under budget (5-15% under expected)
  if (variance <= -5) {
    return { background: 'linear-gradient(90deg, #7daa68, #8bb67c)' };
  }
  // On track (±5%)
  if (variance <= 5) {
    return { background: 'linear-gradient(90deg, #8bb67c, #d4a03a)' };
  }
  // Slightly over (5-15% over expected)
  if (variance <= 15) {
    return { background: 'linear-gradient(90deg, #d4a03a, #c25544)' };
  }
  // Way over budget (>15% over expected)
  return { background: 'linear-gradient(90deg, #c25544, #b04838)' };
}

/**
 * Returns a text color for the variance indicator.
 */
export function getVarianceColor(spent: number, budgeted: number): string {
  if (budgeted === 0) return '#78716c';

  const spentPct = (spent / budgeted) * 100;
  const expectedPct = getMonthProgress();
  const variance = spentPct - expectedPct;

  if (variance <= -5) return '#7daa68';  // Green
  if (variance <= 5) return '#d4a03a';   // Yellow
  if (variance <= 15) return '#d87f44';  // Orange
  return '#c25544';                       // Red
}

/**
 * Safe-to-spend allocation bar style.
 * Pure green when little is allocated, transitions to amber
 * only at higher allocation levels.
 */
export function getAllocationBarStyle(allocatedPct: number): React.CSSProperties {
  if (allocatedPct <= 50) {
    return { background: '#6db555' }; // Pure green — lots of flexibility
  }
  if (allocatedPct <= 80) {
    return { background: 'linear-gradient(90deg, #6db555, #d4a03a)' }; // Green → amber
  }
  if (allocatedPct <= 100) {
    return { background: 'linear-gradient(90deg, #d4a03a, #e8922e)' }; // Amber → deep amber
  }
  return { background: '#ef4444' }; // Over-allocated — red
}
