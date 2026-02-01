/**
 * Unified bar color system for Thallo.
 * 
 * Single source of truth for every progress bar in the app.
 * 
 * Palette:
 *   🟠 Amber (#e8a830) = needs attention / lower tier
 *   🟢 Teal  (#1a7a6d) = on track / middle
 *   💚 Green (#6db555) = great / ahead
 *   🔴 Red   (#ef4444) = over budget / in trouble (separate flag)
 */

const AMBER  = { r: 232, g: 168, b: 48  }; // #e8a830
const TEAL   = { r: 26,  g: 122, b: 109 }; // #1a7a6d
const GREEN  = { r: 109, g: 181, b: 85  }; // #6db555
const RED    = '#ef4444';

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function colorAt(t: number): string {
  // t: 0 = amber, 0.5 = teal, 1.0 = green
  const clamped = Math.max(0, Math.min(1, t));
  
  if (clamped <= 0.5) {
    const p = clamped / 0.5; // 0→1 within amber→teal
    return `rgb(${lerp(AMBER.r, TEAL.r, p)}, ${lerp(AMBER.g, TEAL.g, p)}, ${lerp(AMBER.b, TEAL.b, p)})`;
  } else {
    const p = (clamped - 0.5) / 0.5; // 0→1 within teal→green
    return `rgb(${lerp(TEAL.r, GREEN.r, p)}, ${lerp(TEAL.g, GREEN.g, p)}, ${lerp(TEAL.b, GREEN.b, p)})`;
  }
}

// ============================================================
// CORE: health 0→1 maps to amber→teal→green
// ============================================================

/**
 * Core color function. Maps a health score (0–1) to the unified palette.
 * @param health 0 = amber (bad), 0.5 = teal (ok), 1.0 = green (great)
 * @param overBudget If true, returns red regardless of health score
 */
export function getBarColor(health: number, overBudget = false): string {
  if (overBudget) return RED;
  return colorAt(health);
}

/**
 * Returns a CSS style object for a progress bar.
 */
export function getBarStyle(health: number, overBudget = false): React.CSSProperties {
  const color = getBarColor(health, overBudget);
  return {
    background: color,
    boxShadow: `0 0 8px ${color}40`,
  };
}

// ============================================================
// BUDGET BARS: time-aware spending vs budget
// ============================================================

function getMonthProgress(): number {
  const now = new Date();
  const day = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return day / daysInMonth; // 0→1 through the month
}

/**
 * Budget bar color: compares spending pace to expected pace for this point in the month.
 * Under-pacing = green, on-pace = teal, over-pacing = amber, over 100% = red.
 */
export function getBudgetBarStyle(spent: number, budgeted: number): React.CSSProperties {
  if (budgeted <= 0) return { background: '#3f3a36' };

  const spentPct = spent / budgeted;
  const expectedPct = getMonthProgress();

  // Over budget entirely → red
  if (spentPct >= 1) return getBarStyle(0, true);

  // Compare actual vs expected pace
  // variance: negative = under pace (good), positive = over pace (bad)
  const variance = spentPct - expectedPct;

  // Map variance to health: -0.3 or less → 1.0 (green), 0 → 0.5 (teal), +0.2 or more → 0.0 (amber)
  const health = Math.max(0, Math.min(1, 0.5 - (variance / 0.4)));

  return getBarStyle(health);
}

/**
 * Budget bar text color for variance indicators.
 */
export function getBudgetVarianceColor(spent: number, budgeted: number): string {
  if (budgeted <= 0) return '#78716c';

  const spentPct = spent / budgeted;
  const expectedPct = getMonthProgress();
  const variance = spentPct - expectedPct;

  if (spentPct >= 1) return RED;
  const health = Math.max(0, Math.min(1, 0.5 - (variance / 0.4)));
  return getBarColor(health);
}

// ============================================================
// DEBT BARS: amortization health
// ============================================================

/**
 * Debt bar color based on amortization health.
 * @param monthsAhead Positive = ahead of schedule, negative = behind
 * @param hasHealth Whether amortization data exists
 * @param payoffPercent 0-100, how much of the debt is paid off
 */
export function getDebtBarColor(monthsAhead: number | null, payoffPercent: number): string {
  if (monthsAhead !== null) {
    // Map months ahead [-3, 3] → health [0, 1]
    const clamped = Math.max(-3, Math.min(3, monthsAhead));
    const health = (clamped + 3) / 6; // -3→0, 0→0.5, 3→1
    return getBarColor(health);
  }

  // No amortization data — use payoff percentage
  // More paid off = better health
  const health = Math.min(1, payoffPercent / 100);
  // Shift so early payoff is teal (not amber) — debts aren't "bad" just because you started
  const adjusted = 0.3 + health * 0.7; // range: 0.3→1.0
  return getBarColor(adjusted);
}

// ============================================================
// SCORE BARS: pillar/factor scores
// ============================================================

/**
 * Score/pillar bar color based on percentage of max score.
 * @param scorePct 0–1 (score / maxScore)
 */
export function getScoreBarStyle(scorePct: number): React.CSSProperties {
  // Map score percentage to health
  // 0% = amber, 50% = teal, 100% = green
  return getBarStyle(Math.max(0, Math.min(1, scorePct)));
}

// ============================================================
// ALLOCATION BARS: income allocation
// ============================================================

/**
 * Allocation bar: how much of income is allocated.
 * Fully allocated = green (good), under = teal, over = red.
 */
export function getAllocationBarStyle(allocatedPct: number): React.CSSProperties {
  if (allocatedPct > 100) return getBarStyle(0, true); // over-allocated = red

  // 0% allocated = amber (bad), 80% = teal, 95-100% = green (good)
  const health = Math.min(1, allocatedPct / 100);
  return getBarStyle(health);
}
