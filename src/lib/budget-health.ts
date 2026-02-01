/**
 * Time-aware budget health color calculation.
 * 
 * Compares actual spend rate vs expected spend rate for this point in the month.
 * Returns a color from the green → blue → amber → red → danger spectrum.
 * 
 * Green   = well under pace
 * Blue    = comfortable pace
 * Amber   = approaching limit
 * Red     = over pace, will likely overspend
 * Danger  = seriously over pace
 */

// Color stops
const COLORS = {
  green:  { r: 109, g: 181, b: 85  }, // #6db555
  blue:   { r: 91,  g: 143, b: 217 }, // #5b8fd9
  amber:  { r: 232, g: 146, b: 46  }, // #e8922e
  red:    { r: 239, g: 68,  b: 68  }, // #ef4444
  danger: { r: 185, g: 28,  b: 28  }, // #b91c1c
};

function lerp(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, t: number): string {
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function burnRatioToColor(ratio: number): string {
  if (ratio <= 0.6) {
    // Solid green — well under pace
    return lerp(COLORS.green, COLORS.green, 0);
  } else if (ratio <= 0.85) {
    // Green → Blue transition
    const t = (ratio - 0.6) / 0.25;
    return lerp(COLORS.green, COLORS.blue, t);
  } else if (ratio <= 1.0) {
    // Blue → Amber transition
    const t = (ratio - 0.85) / 0.15;
    return lerp(COLORS.blue, COLORS.amber, t);
  } else if (ratio <= 1.25) {
    // Amber → Red transition (over pace)
    const t = (ratio - 1.0) / 0.25;
    return lerp(COLORS.amber, COLORS.red, t);
  } else {
    // Red → Danger transition (seriously over)
    const t = Math.min(1, (ratio - 1.25) / 0.25);
    return lerp(COLORS.red, COLORS.danger, t);
  }
}

/**
 * Get a time-aware color for a budget bar.
 * 
 * @param spent - Amount spent so far
 * @param budgeted - Total budget for the month
 * @param now - Current date (defaults to new Date())
 * @returns Color string (rgb)
 */
export function getBudgetHealthColor(spent: number, budgeted: number, now?: Date): string {
  if (budgeted <= 0) return lerp(COLORS.green, COLORS.green, 0);
  
  const date = now || new Date();
  const dayOfMonth = date.getDate();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  
  // Expected spend rate for this point in the month (0 to 1)
  const expectedRate = dayOfMonth / daysInMonth;
  
  // Actual spend rate (0 to 1+)
  const actualRate = spent / budgeted;
  
  // Burn ratio: how fast are you spending relative to expected?
  // < 1 = under pace (good), 1 = on track, > 1 = over pace (bad)
  const burnRatio = expectedRate > 0 ? actualRate / expectedRate : actualRate > 0 ? 2 : 0;
  
  return burnRatioToColor(burnRatio);
}

/**
 * Get color for income allocation bar (how well income is budgeted).
 * Different from spend health — this is about allocation planning, not burn rate.
 * 
 * @param allocated - Amount allocated/budgeted
 * @param income - Total monthly income
 * @returns Color string (hex)
 */
export function getAllocationColor(allocated: number, income: number): string {
  if (income <= 0) return '#6db555'; // Green if no income set
  
  const allocationPercent = (allocated / income) * 100;
  
  if (allocationPercent > 100) {
    // Over-allocated: red zone
    // Smooth transition from red to danger as you go further over
    const overPercent = allocationPercent - 100;
    if (overPercent <= 25) {
      const t = overPercent / 25;
      return lerp(COLORS.red, COLORS.danger, t);
    }
    return lerp(COLORS.danger, COLORS.danger, 0);
  } else if (allocationPercent >= 80) {
    // 80-100%: Green zone (good budgeting)
    // Transition from green to slightly brighter green
    const t = (allocationPercent - 80) / 20;
    return lerp(COLORS.green, COLORS.green, t);
  } else if (allocationPercent >= 50) {
    // 50-80%: Blue zone (decent allocation)
    const t = (allocationPercent - 50) / 30;
    return lerp(COLORS.blue, COLORS.green, t);
  } else {
    // Under 50%: Amber zone (lots of unplanned income)
    // Transition from amber to blue as you approach 50%
    const t = allocationPercent / 50;
    return lerp(COLORS.amber, COLORS.blue, t);
  }
}

/**
 * Get the full gradient CSS string for a bar that spans full width.
 * Uses the same green → blue → amber gradient.
 */
export const BUDGET_GRADIENT = 'linear-gradient(90deg, #6db555 0%, #5b8fd9 50%, #e8922e 100%)';
