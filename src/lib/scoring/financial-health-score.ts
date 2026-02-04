/**
 * Financial Health Score™ v2
 * 
 * A universal metric measuring YOUR financial health, not bank profitability.
 * Scale: 0-1000
 * 
 * Three pillars:
 *   Trajectory (35%) — Where you're headed
 *   Behavior (35%)   — How you handle money
 *   Position (30%)   — Where you are now
 * 
 * Key differences from FICO:
 * - Rewards paying OFF debt, not having more credit
 * - Rewards savings & wealth building
 * - Weights debt types by real financial risk, not lender profit
 * - Trajectory > Position (direction matters more than snapshot)
 * - Platform-agnostic: no app-specific metrics in the score
 * 
 * Version 2 Changes:
 * - Fixed division-by-zero edge cases
 * - Logarithmic wealth building (fairer for low-income users)
 * - Continuous scoring functions (no cliffs)
 * - Extended delinquency tiers
 * - Cold-start progressive scoring
 * - Updated debt multipliers
 * - Rebalanced pillars (350/350/300)
 */

// ============================================================
// TYPES
// ============================================================

export type DebtType = 
  | 'payday'           // Payday/title loans
  | 'credit_card'      // Credit card (carried balance)
  | 'bnpl'             // Buy Now Pay Later
  | 'personal'         // Personal loans (unsecured)
  | 'auto'             // Auto loans
  | 'student'          // Student loans (alias for student_federal)
  | 'student_federal'  // Federal student loans
  | 'student_private'  // Private student loans
  | 'medical'          // Medical debt
  | 'mortgage'         // Mortgage / HELOC
  | 'zero_pct'         // 0% promotional financing
  | 'cc_paid_monthly'  // Credit card paid in full each month
  | 'secured';         // Debt secured by liquid assets

export interface DebtEntry {
  type: DebtType;
  balance: number;
  monthlyPayment: number;
  apr: number;
  inCollections?: boolean;
}

// H5: Late payment with recency data for time-decay scoring
export interface LatePaymentEntry {
  tier: 'late1to30' | 'late31to60' | 'late61to90' | 'late91to120' | 'late120Plus';
  monthsAgo: number; // 0 = current month, 1 = last month, etc.
}

// Dynamic emergency buffer targets by household type
export type HouseholdType = 'dual_income' | 'single_income' | 'self_employed' | 'retired';

export interface WealthContribution {
  cashSavings: number;          // Net bank deposits this month
  retirement401k: number;       // 401k/403b contributions
  ira: number;                  // IRA contributions
  investments: number;          // Brokerage/investment deposits
  hsa: number;                  // HSA contributions
  extraDebtPayments: number;    // Payments above minimums (builds net worth)
}

export interface ScoreInput {
  // Income
  monthlyIncome: number;
  
  // Wealth Building
  wealthContributions: WealthContribution;
  
  // Emergency Fund
  liquidSavings: number;         // Accessible cash/savings (not 401k)
  monthlyExpenses: number;
  
  // Debt
  currentDebts: DebtEntry[];
  debtsThreeMonthsAgo: DebtEntry[];
  
  // Payments - Basic tiers (backward compatible)
  billsPaidOnTime: number;
  billsPaidLate1to30: number;    // 1-30 days late
  billsPaidLate31to60: number;   // 31-60 days late
  billsPaidLate61Plus: number;   // 61+ days late (legacy field)
  
  // Payments - Extended tiers (new, optional)
  billsPaidLate61to90?: number;   // 61-90 days late
  billsPaidLate91to120?: number;  // 91-120 days late
  billsPaidLate120Plus?: number;  // 120+ days late
  
  // Budgets
  budgetsOnTrack: number;
  totalBudgets: number;
  averageOverspendPercent: number; // avg % over budget on overspent categories
  
  // Account age for cold-start handling (optional)
  accountAgeDays?: number;
  
  // Debt confirmation (optional)
  // If true: user explicitly confirmed they have no debt
  // If false/undefined: user hasn't confirmed (treat empty debts as unconfirmed)
  hasConfirmedNoDebt?: boolean;
  
  // H5: Detailed late payment history with recency (optional)
  // When provided, enables time-decay scoring: older late payments weigh less.
  // Falls back to flat count-based scoring if not provided.
  latePaymentHistory?: LatePaymentEntry[];
  
  // Dynamic emergency buffer: household type determines target months
  // dual_income=3mo, single_income=4mo, self_employed=6mo, retired=3mo
  householdType?: HouseholdType;
  
  // Anti-gaming: ratio of average budget amount to trailing 3-month average spend
  // e.g., if budgets avg $1,000 but user only spends avg $600, ratio = 1.67
  // When > 1.3, adherence score is capped to prevent budget padding
  budgetToSpendingRatio?: number;
  
  // Whether the income value is user-provided (true) or shadow/estimated (false/undefined)
  // When false, income-dependent factors (F1, F6) return neutral scores instead of
  // producing unreliable results from a $2,000 shadow floor
  hasConfirmedIncome?: boolean;
}

// ============================================================
// DEBT TYPE MULTIPLIERS
// Research-backed: derived from interest rate risk (30%),
// asset backing (40%), and delinquency risk (30%)
// Sources: NY Fed, CFPB, Fannie Mae (see debt-weighting-research.md)
// 
// v2 Updates:
// - Split student loans (federal vs private)
// - Raised auto from 0.7 to 0.85 (reflects 2024 market)
// - Lowered cc_paid_monthly from 0.05 to 0.0 (not debt)
// - Raised collections penalty from 1.5 to 2.0
// ============================================================

const DEBT_MULTIPLIERS: Record<DebtType, number> = {
  payday:          2.5,   // 400%+ APR, 80% reborrow rate, financial trap
  credit_card:     1.5,   // ~24% APR, no asset, 8-11% delinquency
  bnpl:            1.3,   // Impulse consumption, fragmented across providers
  personal:        1.2,   // Lower rate than cards, still unsecured
  auto:            0.85,  // Raised from 0.7 - reflects 2024 market (7%+ rates, longer terms)
  student:         0.5,   // Alias for student_federal
  student_federal: 0.5,   // Human capital investment, federal protections, lower rates
  student_private: 0.9,   // No protections, variable rates up to 14%+, near personal loan territory
  medical:         0.4,   // Involuntary — CFPB: "little predictive value"
  mortgage:        0.3,   // Asset-building, lowest default rate, tax-advantaged
  zero_pct:        0.2,   // Economically rational, near-zero cost
  cc_paid_monthly: 0.0,   // Lowered from 0.05 - not debt, responsible credit use
  secured:         0.1,   // Collateral covers it (per Fannie Mae guidelines)
};

const COLLECTIONS_PENALTY = 2.0; // Raised from 1.5 - better reflects severity

// ============================================================
// SCORE BREAKDOWN TYPES
// ============================================================

export interface FactorScore {
  score: number;
  maxScore: number;
  percentage: number;  // score/maxScore as 0-100
  detail: string;
  sublabel: string;    // e.g. "Trajectory" pillar label
}

export interface ScoreBreakdown {
  wealthBuilding: FactorScore;
  debtVelocity: FactorScore;
  paymentConsistency: FactorScore;
  budgetDiscipline: FactorScore;
  emergencyBuffer: FactorScore;
  debtToIncome: FactorScore;
}

export type ScoreConfidence = 'preliminary' | 'early' | 'building' | 'full';

export interface FinancialHealthScore {
  total: number;
  maxTotal: 1000;
  level: number;
  title: string;
  confidence: ScoreConfidence;  // New: indicates data maturity
  pillarScores: {
    trajectory: { score: number; max: 350 };  // Updated from 400
    behavior: { score: number; max: 350 };
    position: { score: number; max: 300 };    // Updated from 250
  };
  breakdown: ScoreBreakdown;
  tips: string[];
  warnings: string[];  // Input validation warnings (empty = clean data)
}

// ============================================================
// H5: LATE PAYMENT PENALTY WEIGHTS (for time-decay scoring)
// ============================================================

const LATE_PENALTY_WEIGHTS: Record<string, number> = {
  late1to30: 0.5,
  late31to60: 1.0,
  late61to90: 2.0,
  late91to120: 3.0,
  late120Plus: 4.0,
};

// Time-decay half-life: ~4.6 months (decay constant 0.15)
// At 0 months: 100% penalty, 3 months: 64%, 6 months: 41%, 12 months: 17%
const LATE_PAYMENT_DECAY_RATE = 0.15;

// ============================================================
// INPUT VALIDATION & SANITIZATION
// Catches bad/impossible data before it corrupts scores
// ============================================================

export interface ValidationResult {
  warnings: string[];
  sanitizedInput: ScoreInput;
}

function validateAndSanitizeInput(input: ScoreInput): ValidationResult {
  const warnings: string[] = [];
  const sanitized = { ...input };
  
  // Negative income → treat as 0 (shadow income handles it)
  if (sanitized.monthlyIncome < 0) {
    warnings.push('Negative income detected, treating as 0');
    sanitized.monthlyIncome = 0;
  }
  
  // Negative expenses → treat as 0
  if (sanitized.monthlyExpenses < 0) {
    warnings.push('Negative expenses detected, treating as 0');
    sanitized.monthlyExpenses = 0;
  }
  
  // Expenses > 10× income → likely data error (but don't reject)
  if (sanitized.monthlyIncome > 0 && sanitized.monthlyExpenses > sanitized.monthlyIncome * 10) {
    warnings.push('Expenses exceed 10× income — possible data error');
  }
  
  // Negative liquid savings → treat as 0
  if (sanitized.liquidSavings < 0) {
    warnings.push('Negative liquid savings detected, treating as 0');
    sanitized.liquidSavings = 0;
  }
  
  // Debt entries: no negative balances or payments
  sanitized.currentDebts = sanitized.currentDebts.map(d => ({
    ...d,
    balance: Math.max(0, d.balance),
    monthlyPayment: Math.max(0, d.monthlyPayment),
  }));
  sanitized.debtsThreeMonthsAgo = sanitized.debtsThreeMonthsAgo.map(d => ({
    ...d,
    balance: Math.max(0, d.balance),
    monthlyPayment: Math.max(0, d.monthlyPayment),
  }));
  
  // Bill counts: non-negative integers
  sanitized.billsPaidOnTime = Math.max(0, Math.round(sanitized.billsPaidOnTime));
  sanitized.billsPaidLate1to30 = Math.max(0, Math.round(sanitized.billsPaidLate1to30));
  sanitized.billsPaidLate31to60 = Math.max(0, Math.round(sanitized.billsPaidLate31to60));
  sanitized.billsPaidLate61Plus = Math.max(0, Math.round(sanitized.billsPaidLate61Plus));
  if (sanitized.billsPaidLate61to90 !== undefined) {
    sanitized.billsPaidLate61to90 = Math.max(0, Math.round(sanitized.billsPaidLate61to90));
  }
  if (sanitized.billsPaidLate91to120 !== undefined) {
    sanitized.billsPaidLate91to120 = Math.max(0, Math.round(sanitized.billsPaidLate91to120));
  }
  if (sanitized.billsPaidLate120Plus !== undefined) {
    sanitized.billsPaidLate120Plus = Math.max(0, Math.round(sanitized.billsPaidLate120Plus));
  }
  
  // Budget counts: non-negative, onTrack ≤ total
  sanitized.budgetsOnTrack = Math.max(0, Math.round(sanitized.budgetsOnTrack));
  sanitized.totalBudgets = Math.max(0, Math.round(sanitized.totalBudgets));
  if (sanitized.budgetsOnTrack > sanitized.totalBudgets) {
    warnings.push('budgetsOnTrack exceeds totalBudgets, capping');
    sanitized.budgetsOnTrack = sanitized.totalBudgets;
  }
  sanitized.averageOverspendPercent = Math.max(0, sanitized.averageOverspendPercent);
  
  // Wealth contributions: retirement/HSA/extraDebt can't be negative
  // cashSavings and investments CAN be negative (withdrawals)
  const wc = sanitized.wealthContributions;
  sanitized.wealthContributions = {
    cashSavings: wc.cashSavings,
    retirement401k: Math.max(0, wc.retirement401k),
    ira: Math.max(0, wc.ira),
    investments: wc.investments,
    hsa: Math.max(0, wc.hsa),
    extraDebtPayments: Math.max(0, wc.extraDebtPayments),
  };
  
  // Late payment history: validate entries
  if (sanitized.latePaymentHistory) {
    sanitized.latePaymentHistory = sanitized.latePaymentHistory.filter(lp => 
      LATE_PENALTY_WEIGHTS[lp.tier] !== undefined && lp.monthsAgo >= 0
    );
  }
  
  // Budget-to-spending ratio: must be positive
  if (sanitized.budgetToSpendingRatio !== undefined && sanitized.budgetToSpendingRatio < 0) {
    sanitized.budgetToSpendingRatio = undefined;
  }
  
  return { warnings, sanitizedInput: sanitized };
}

// ============================================================
// HELPER: Shadow Income (fixes division by zero)
// ============================================================

/**
 * Calculate effective income for cases where reported income is zero.
 * Uses expenses as a proxy, or falls back to a minimum floor.
 * This prevents division-by-zero errors for students, unemployed, etc.
 */
function getEffectiveIncome(monthlyIncome: number, monthlyExpenses: number): number {
  if (monthlyIncome > 0) return monthlyIncome;
  if (monthlyExpenses > 0) return monthlyExpenses * 1.1; // Spending implies income/drawdown
  return 2000; // Absolute minimum floor (roughly poverty-level individual)
}

// ============================================================
// HELPER: Calculate weighted debt total
// ============================================================

function calculateWeightedDebt(debts: DebtEntry[]): number {
  return debts.reduce((total, debt) => {
    let multiplier = DEBT_MULTIPLIERS[debt.type] || 1.0;
    if (debt.inCollections) {
      multiplier *= COLLECTIONS_PENALTY;
    }
    return total + (debt.balance * multiplier);
  }, 0);
}

function calculateWeightedMonthlyPayments(debts: DebtEntry[]): number {
  return debts.reduce((total, debt) => {
    let multiplier = DEBT_MULTIPLIERS[debt.type] || 1.0;
    if (debt.inCollections) {
      multiplier *= COLLECTIONS_PENALTY;
    }
    return total + (debt.monthlyPayment * multiplier);
  }, 0);
}

// ============================================================
// FACTOR 1: WEALTH BUILDING RATE (175 pts — Trajectory)
// Updated from 200 pts in v2 rebalance
// ============================================================

function calculateWealthBuilding(
  contributions: WealthContribution,
  monthlyIncome: number,
  monthlyExpenses: number,
  hasConfirmedIncome?: boolean
): FactorScore {
  const maxScore = 175;  // Updated from 200
  const sublabel = 'Trajectory';
  
  // If no income data at all (shadow income), check if there are any contributions
  // If yes, give partial credit; if no, return neutral
  if (hasConfirmedIncome !== true && monthlyIncome === 0 && monthlyExpenses === 0) {
    const totalContributions = 
      contributions.cashSavings +
      contributions.retirement401k +
      contributions.ira +
      contributions.investments +
      contributions.hsa +
      contributions.extraDebtPayments;
    
    if (totalContributions > 0) {
      // Has contributions but no income to calculate rate — give 50% credit
      return {
        score: 88, maxScore, percentage: 50,
        detail: 'Set your income in Settings for an accurate savings rate',
        sublabel,
      };
    }
    return {
      score: 0, maxScore, percentage: 0,
      detail: 'No wealth building this month',
      sublabel,
    };
  }
  
  // C1: Fix division by zero using shadow income
  const effectiveIncome = getEffectiveIncome(monthlyIncome, monthlyExpenses);
  
  const totalContributions = 
    contributions.cashSavings +
    contributions.retirement401k +
    contributions.ira +
    contributions.investments +
    contributions.hsa +
    contributions.extraDebtPayments;
  
  const rawRate = totalContributions / effectiveIncome;
  
  // P0 Fix: Negative savings rates (spending > income) would produce NaN in log.
  // Use linear penalty for negatives (floored at 0), log reward for positives.
  // This is C⁰ continuous at rate=0 and handles ~20% of users any given month.
  const k = 15;
  const targetRate = 0.20;
  
  let score: number;
  if (rawRate <= 0) {
    // Linear penalty for negative savings: rate=-20% → 0 pts, rate=0 → 0 pts
    score = Math.max(0, Math.round(maxScore * (rawRate / targetRate)));
  } else {
    // H1: Logarithmic scale (fairer for low-income users)
    // At 20% savings rate = max score
    const normalizedScore = Math.log(1 + rawRate * k) / Math.log(1 + targetRate * k);
    score = Math.round(Math.min(maxScore, normalizedScore * maxScore));
  }
  
  const ratePct = (rawRate * 100).toFixed(1);
  let detail: string;
  
  if (rawRate < -0.05) {
    detail = `${ratePct}% — Spending exceeds income. Focus on reducing expenses.`;
  } else if (rawRate < 0) {
    detail = `${ratePct}% — Slightly over income. Small adjustments can fix this.`;
  } else if (monthlyIncome === 0) {
    detail = `${ratePct}% wealth building rate (based on expenses)`;
  } else if (rawRate >= 0.20) {
    detail = `${ratePct}% wealth building rate — Crushing it!`;
  } else if (rawRate >= 0.15) {
    detail = `${ratePct}% rate — Strong progress, ${(20 - rawRate * 100).toFixed(0)}% from max`;
  } else if (rawRate >= 0.10) {
    detail = `${ratePct}% rate — Solid foundation building`;
  } else if (rawRate >= 0.05) {
    detail = `${ratePct}% rate — Every dollar counts, keep going`;
  } else if (rawRate > 0) {
    detail = `${ratePct}% rate — Getting started`;
  } else {
    detail = 'No wealth building this month';
  }
  
  return { score, maxScore, percentage: (score / maxScore) * 100, detail, sublabel };
}

// ============================================================
// FACTOR 2: DEBT VELOCITY (175 pts — Trajectory)
// Updated from 200 pts in v2 rebalance
// ============================================================

function calculateDebtVelocity(
  currentDebts: DebtEntry[],
  debtsThreeMonthsAgo: DebtEntry[],
  hasConfirmedNoDebt?: boolean
): FactorScore {
  const maxScore = 175;  // Updated from 200
  const sublabel = 'Trajectory';
  
  const currentWeighted = calculateWeightedDebt(currentDebts);
  const previousWeighted = calculateWeightedDebt(debtsThreeMonthsAgo);
  
  // No debt now and before
  if (currentWeighted === 0 && previousWeighted === 0) {
    // If user explicitly confirmed no debt, give perfect score
    if (hasConfirmedNoDebt === true) {
      return {
        score: maxScore, maxScore, percentage: 100,
        detail: 'Debt-free!', sublabel,
      };
    }
    // If user hasn't confirmed, return neutral score
    return { 
      score: 88, 
      maxScore, 
      percentage: 50, 
      detail: 'Add your debts for an accurate score', 
      sublabel 
    };
  }
  
  // Just became debt free
  if (currentWeighted === 0 && previousWeighted > 0) {
    return {
      score: maxScore, maxScore, percentage: 100,
      detail: 'You paid off all your debt!', sublabel,
    };
  }
  
  // Calculate velocity as fractional change over 3 months
  let velocity: number;
  if (previousWeighted > 0) {
    velocity = (previousWeighted - currentWeighted) / previousWeighted;
  } else {
    // New debt from zero - velocity is negative
    velocity = -1.0;
  }
  
  // H2: Continuous piecewise-linear function (no cliffs)
  // if debt-free → maxScore
  // if velocity >= 0 → 100 + min(100, velocity/0.15 × 100)
  // if velocity < 0 → max(0, 100 + velocity/0.15 × 100)
  
  let rawScore: number;
  if (velocity >= 0) {
    // Paying down debt: scale from 100 to 200
    const scaledToMax = maxScore / 200; // Adjust for new maxScore
    rawScore = (100 + Math.min(100, (velocity / 0.15) * 100)) * scaledToMax;
  } else {
    // Increasing debt: scale from 100 down to 0
    const scaledToMax = maxScore / 200;
    rawScore = Math.max(0, (100 + (velocity / 0.15) * 100) * scaledToMax);
  }
  
  const score = Math.round(rawScore);
  
  const changeRate = velocity * 100; // Convert to percentage for display
  let detail: string;
  
  if (changeRate >= 15) {
    detail = `Weighted debt down ${Math.abs(changeRate).toFixed(0)}% — Excellent momentum!`;
  } else if (changeRate >= 10) {
    detail = `Weighted debt down ${Math.abs(changeRate).toFixed(0)}% — Strong progress`;
  } else if (changeRate >= 5) {
    detail = `Weighted debt down ${Math.abs(changeRate).toFixed(0)}% — Good trajectory`;
  } else if (changeRate > 1) {
    detail = `Weighted debt down ${Math.abs(changeRate).toFixed(1)}% — Moving in right direction`;
  } else if (changeRate >= -1) {
    detail = 'Debt stable — Can you accelerate payoff?';
  } else if (changeRate >= -5) {
    detail = `Weighted debt up ${Math.abs(changeRate).toFixed(1)}% — Time to course correct`;
  } else if (changeRate >= -10) {
    detail = `Weighted debt up ${Math.abs(changeRate).toFixed(0)}% — Concerning trend`;
  } else {
    detail = `Weighted debt up ${Math.abs(changeRate).toFixed(0)}% — Urgent: review spending`;
  }
  
  return { score, maxScore, percentage: (score / maxScore) * 100, detail, sublabel };
}

// ============================================================
// FACTOR 3: PAYMENT CONSISTENCY (200 pts — Behavior)
// ============================================================

function calculatePaymentConsistency(
  onTime: number,
  late1to30: number,
  late31to60: number,
  late61Plus: number,
  late61to90?: number,
  late91to120?: number,
  late120Plus?: number,
  latePaymentHistory?: LatePaymentEntry[]
): FactorScore {
  const maxScore = 200;
  const sublabel = 'Behavior';
  
  // ================================================================
  // H5: TIME-DECAY PATH
  // If latePaymentHistory is provided, use recency-weighted penalties.
  // Older late payments have exponentially less impact:
  //   decay = e^(-monthsAgo × 0.15)
  //   0 months: 100%, 3 months: 64%, 6 months: 41%, 12 months: 17%
  //
  // This means a bill that was late 6 months ago has ~41% the penalty
  // of one that was late this month. Users who clean up their act
  // see their score recover over time.
  // ================================================================
  if (latePaymentHistory && latePaymentHistory.length > 0) {
    // Count total bills: on-time + all late entries
    const totalLate = latePaymentHistory.length;
    const totalBills = onTime + totalLate;
    
    if (totalBills === 0) {
      return { 
        score: 100, maxScore, percentage: 50, 
        detail: 'No bills tracked yet — set up bill tracking!', sublabel 
      };
    }
    
    // Calculate time-decayed penalties
    let totalPenalties = 0;
    for (const lp of latePaymentHistory) {
      const basePenalty = LATE_PENALTY_WEIGHTS[lp.tier] || 1.0;
      const decayFactor = Math.exp(-lp.monthsAgo * LATE_PAYMENT_DECAY_RATE);
      totalPenalties += basePenalty * decayFactor;
    }
    
    const effectiveOnTime = totalBills - totalPenalties;
    const effectiveRate = Math.max(0, effectiveOnTime / totalBills);
    const score = Math.round(effectiveRate * maxScore);
    
    const onTimeRate = ((onTime / totalBills) * 100).toFixed(0);
    let detail: string;
    
    if (onTime === totalBills) {
      detail = `Perfect! ${totalBills}/${totalBills} bills on time`;
    } else if (effectiveRate >= 0.95) {
      detail = `${onTimeRate}% on-time — Excellent track record`;
    } else if (effectiveRate >= 0.90) {
      detail = `${onTimeRate}% on-time — Good, room to improve`;
    } else if (effectiveRate >= 0.80) {
      detail = `${onTimeRate}% on-time — Set up autopay for consistency`;
    } else {
      detail = `${onTimeRate}% on-time — Priority: automate your payments`;
    }
    
    return { score: Math.max(0, score), maxScore, percentage: (score / maxScore) * 100, detail, sublabel };
  }
  
  // ================================================================
  // FLAT-COUNT PATH (backward compatible, no time-decay)
  // Used when latePaymentHistory is not provided
  // ================================================================
  
  // Calculate total bills
  let totalBills = onTime + late1to30 + late31to60;
  
  // H4: Extended delinquency tiers (backward compatible)
  let count61to90 = 0;
  let count91to120 = 0;
  let count120Plus = 0;
  
  if (late61to90 !== undefined || late91to120 !== undefined || late120Plus !== undefined) {
    count61to90 = late61to90 || 0;
    count91to120 = late91to120 || 0;
    count120Plus = late120Plus || 0;
  } else {
    count61to90 = late61Plus;
  }
  
  totalBills += count61to90 + count91to120 + count120Plus;
  
  // C3: No bills tracked → neutral score
  if (totalBills === 0) {
    return { 
      score: 100, maxScore, percentage: 50, 
      detail: 'No bills tracked yet — set up bill tracking!', sublabel 
    };
  }
  
  // Additive penalties divided by total bill count
  const totalPenalties = 
    (late1to30 * 0.5) + 
    (late31to60 * 1.0) + 
    (count61to90 * 2.0) +
    (count91to120 * 3.0) +
    (count120Plus * 4.0);
  
  const effectiveOnTime = totalBills - totalPenalties;
  const effectiveRate = Math.max(0, effectiveOnTime / totalBills);
  const score = Math.round(effectiveRate * maxScore);
  
  const onTimeRate = ((onTime / totalBills) * 100).toFixed(0);
  let detail: string;
  
  if (onTime === totalBills) {
    detail = `Perfect! ${totalBills}/${totalBills} bills on time`;
  } else if (effectiveRate >= 0.95) {
    detail = `${onTimeRate}% on-time — Excellent track record`;
  } else if (effectiveRate >= 0.90) {
    detail = `${onTimeRate}% on-time — Good, room to improve`;
  } else if (effectiveRate >= 0.80) {
    detail = `${onTimeRate}% on-time — Set up autopay for consistency`;
  } else {
    detail = `${onTimeRate}% on-time — Priority: automate your payments`;
  }
  
  return { score: Math.max(0, score), maxScore, percentage: (score / maxScore) * 100, detail, sublabel };
}

// ============================================================
// FACTOR 4: BUDGET DISCIPLINE (150 pts — Behavior)
// ============================================================

function calculateBudgetDiscipline(
  budgetsOnTrack: number,
  totalBudgets: number,
  averageOverspendPercent: number,
  budgetToSpendingRatio?: number
): FactorScore {
  const maxScore = 150;
  const sublabel = 'Behavior';
  
  // C6: Lower "no budgets" default from 75 to 50
  if (totalBudgets === 0) {
    return {
      score: 50, maxScore, percentage: 33.3,
      detail: 'No budgets set — create budgets to track this', sublabel,
    };
  }
  
  // Sub-factor A: Adherence (90 pts)
  // What % of budgets stayed within limit?
  let adherenceScore = Math.round((budgetsOnTrack / totalBudgets) * 90);
  
  // Anti-gaming: Budget reasonableness check
  // If budgets are set 30%+ above actual trailing spending, adherence is artificially inflated.
  // e.g., spending $600/mo on groceries but budgeting $1,000 → easy 100% adherence.
  // Cap the adherence score proportionally to how padded the budgets are.
  // At ratio 1.3: no cap. At 1.6: 85% cap. At 2.0+: 50% cap.
  if (budgetToSpendingRatio !== undefined && budgetToSpendingRatio > 1.3) {
    const excess = budgetToSpendingRatio - 1.3;
    const capFactor = Math.max(0.5, 1.0 - excess * 0.714); // Reaches 0.5 at ratio ~2.0
    const cappedAdherence = Math.round(adherenceScore * capFactor);
    if (cappedAdherence < adherenceScore) {
      adherenceScore = cappedAdherence;
    }
  }
  
  // Sub-factor B: Overspend severity (60 pts)
  // Verified scale-invariant: averageOverspendPercent comes from the API as
  // ((spent - budgeted) / budgeted) × 100, so it's already a per-category percentage.
  // $100 over on $500 budget (20%) scores identically to $1000 over on $5000 (20%).
  // Formula: max(0, 60 × e^(-(avgOverspendPct / 100) × 3.5))
  // 10% over → 42/60 pts, 20% over → 30/60, 30% over → 21/60, 50% over → 10/60
  let severityScore: number;
  if (budgetsOnTrack === totalBudgets) {
    severityScore = 60; // All on track = perfect severity score
  } else {
    severityScore = Math.round(Math.max(0, 60 * Math.exp(-(averageOverspendPercent / 100) * 3.5)));
  }
  
  const score = adherenceScore + severityScore;
  
  let detail: string;
  if (budgetsOnTrack === totalBudgets && budgetToSpendingRatio !== undefined && budgetToSpendingRatio > 1.3) {
    detail = `All ${totalBudgets} budgets on track — try tightening budgets for a better score`;
  } else if (budgetsOnTrack === totalBudgets) {
    detail = `All ${totalBudgets} budgets on track!`;
  } else if (adherenceScore / 90 >= 0.8) {
    detail = `${budgetsOnTrack}/${totalBudgets} on track — Close to perfect`;
  } else if (adherenceScore / 90 >= 0.6) {
    detail = `${budgetsOnTrack}/${totalBudgets} on track — Watch the overspending`;
  } else {
    detail = `${budgetsOnTrack}/${totalBudgets} on track — Budget needs attention`;
  }
  
  return { score: Math.min(maxScore, score), maxScore, percentage: (score / maxScore) * 100, detail, sublabel };
}

// ============================================================
// FACTOR 5: EMERGENCY BUFFER (150 pts — Position)
// Updated from 125 pts in v2 rebalance
// ============================================================

/**
 * Get target emergency buffer months based on household type.
 * CFPB research suggests different targets based on income stability:
 * - Dual-income: 3 months (redundancy reduces risk)
 * - Single-income: 4 months (default, standard advice)
 * - Self-employed/gig: 6 months (volatile income needs more cushion)
 * - Retired: 3 months (fixed income is predictable)
 */
function getTargetEmergencyMonths(householdType?: HouseholdType): number {
  switch (householdType) {
    case 'dual_income': return 3;
    case 'single_income': return 4;
    case 'self_employed': return 6;
    case 'retired': return 3;
    default: return 4; // Default to single-income target
  }
}

function calculateEmergencyBuffer(
  liquidSavings: number,
  monthlyExpenses: number,
  householdType?: HouseholdType
): FactorScore {
  const maxScore = 150;  // Updated from 125
  const sublabel = 'Position';
  
  // C2: Fix division by zero - if no expenses tracked
  if (monthlyExpenses <= 0) {
    return {
      score: liquidSavings > 0 ? 75 : 0, 
      maxScore,
      percentage: liquidSavings > 0 ? 50 : 0,
      detail: liquidSavings > 0 ? 'Great savings!' : 'No expenses tracked',
      sublabel,
    };
  }
  
  const monthsCovered = liquidSavings / monthlyExpenses;
  const targetMonths = getTargetEmergencyMonths(householdType);
  
  // Linear scale: targetMonths = max score
  // Formula: min(maxScore, (monthsCovered / targetMonths) × maxScore)
  const score = Math.round(Math.min(maxScore, (monthsCovered / targetMonths) * maxScore));
  
  let detail: string;
  if (monthsCovered >= targetMonths * 1.5) {
    detail = `${monthsCovered.toFixed(1)} months covered — Fortress mode!`;
  } else if (monthsCovered >= targetMonths) {
    detail = `${monthsCovered.toFixed(1)} months covered — Strong safety net`;
  } else if (monthsCovered >= targetMonths * 0.75) {
    detail = `${monthsCovered.toFixed(1)} months — Solid, keep building to ${targetMonths}+`;
  } else if (monthsCovered >= 1) {
    detail = `${monthsCovered.toFixed(1)} months — Good start, target ${targetMonths} months`;
  } else if (monthsCovered > 0) {
    detail = `${Math.round(monthsCovered * 30)} days covered — Building your safety net`;
  } else {
    detail = 'No emergency buffer — start with a $500 goal';
  }
  
  return { score, maxScore, percentage: (score / maxScore) * 100, detail, sublabel };
}

// ============================================================
// FACTOR 6: DEBT-TO-INCOME (150 pts — Position)
// Updated from 125 pts in v2 rebalance
// ============================================================

function calculateDebtToIncome(
  currentDebts: DebtEntry[],
  monthlyIncome: number,
  monthlyExpenses: number,
  hasConfirmedNoDebt?: boolean,
  hasConfirmedIncome?: boolean
): FactorScore {
  const maxScore = 150;  // Updated from 125
  const sublabel = 'Position';
  
  // C1: Fix division by zero using shadow income
  const effectiveIncome = getEffectiveIncome(monthlyIncome, monthlyExpenses);
  
  const totalRawDebt = currentDebts.reduce((sum, d) => sum + d.balance, 0);
  
  // Handle no debt scenarios
  if (totalRawDebt === 0) {
    // If user explicitly confirmed no debt, give perfect score
    if (hasConfirmedNoDebt === true) {
      return { score: maxScore, maxScore, percentage: 100, detail: 'No debt! Perfect score', sublabel };
    }
    // If user hasn't confirmed, return neutral score
    return { 
      score: 75, 
      maxScore, 
      percentage: 50, 
      detail: 'Add your debts for an accurate score', 
      sublabel 
    };
  }
  
  // If debts exist but income is unknown (using shadow income), return neutral score
  // DTI is meaningless without real income — shadow $2,000 produces unreliable results
  if (hasConfirmedIncome !== true && monthlyIncome === 0 && monthlyExpenses === 0) {
    return {
      score: 75,
      maxScore,
      percentage: 50,
      detail: 'Set your income in Settings for an accurate DTI score',
      sublabel,
    };
  }
  
  // Use weighted monthly payments for DTI calculation
  const weightedMonthlyPayments = calculateWeightedMonthlyPayments(currentDebts);
  
  // Issue 1c Fix: If monthly payments are all 0, use raw balance-based ratio as fallback
  // Assume typical debt payoff over 5 years (60 months) for estimation
  // Use RAW debt (not weighted) for estimation to avoid over-penalization
  let weightedDTI: number;
  if (weightedMonthlyPayments === 0 && totalRawDebt > 0) {
    // Fallback: estimate monthly payment as RAW debt / 60 months
    // This avoids the over-penalization from using weighted debt for estimation
    const estimatedMonthlyPayment = totalRawDebt / 60;
    weightedDTI = (estimatedMonthlyPayment / effectiveIncome) * 100;
  } else {
    weightedDTI = (weightedMonthlyPayments / effectiveIncome) * 100;
  }
  
  // Linear scale: max(0, maxScore × (1 - weightedDTI / 60))
  // At 0% DTI = maxScore, at 60% DTI = 0
  const score = Math.round(Math.max(0, maxScore * (1 - weightedDTI / 60)));
  
  const rawDTI = (currentDebts.reduce((sum, d) => sum + d.monthlyPayment, 0) / effectiveIncome * 100).toFixed(0);
  
  let detail: string;
  if (weightedDTI <= 10) {
    detail = `${rawDTI}% DTI (${weightedDTI.toFixed(0)}% weighted) — Very healthy`;
  } else if (weightedDTI <= 20) {
    detail = `${rawDTI}% DTI (${weightedDTI.toFixed(0)}% weighted) — Good standing`;
  } else if (weightedDTI <= 30) {
    detail = `${rawDTI}% DTI (${weightedDTI.toFixed(0)}% weighted) — Manageable`;
  } else if (weightedDTI <= 40) {
    detail = `${rawDTI}% DTI (${weightedDTI.toFixed(0)}% weighted) — Getting heavy`;
  } else if (weightedDTI <= 50) {
    detail = `${rawDTI}% DTI (${weightedDTI.toFixed(0)}% weighted) — Debt is straining income`;
  } else {
    detail = `${rawDTI}% DTI (${weightedDTI.toFixed(0)}% weighted) — Debt burden is critical`;
  }
  
  return { score, maxScore, percentage: (score / maxScore) * 100, detail, sublabel };
}

// ============================================================
// LEVEL & TITLE
// ============================================================

function getScoreLevel(total: number): { level: number; title: string } {
  if (total >= 900) return { level: 5, title: 'Financial Freedom' };
  if (total >= 750) return { level: 4, title: 'Wealth Builder' };
  if (total >= 600) return { level: 3, title: 'Solid Ground' };
  if (total >= 400) return { level: 2, title: 'Foundation' };
  if (total >= 200) return { level: 1, title: 'Getting Started' };
  return { level: 0, title: 'Beginning Journey' };
}

// ============================================================
// C5: COLD-START HANDLING
// Progressive scoring based on account age
// ============================================================

function getScoreConfidence(accountAgeDays: number): ScoreConfidence {
  if (accountAgeDays < 7) return 'preliminary';
  if (accountAgeDays < 30) return 'early';
  if (accountAgeDays < 90) return 'building';
  return 'full';
}

function shouldScoreFactor(
  factorKey: keyof ScoreBreakdown,
  accountAgeDays: number
): boolean {
  // Under 7 days: only score Position factors (F5, F6)
  if (accountAgeDays < 7) {
    return factorKey === 'emergencyBuffer' || factorKey === 'debtToIncome';
  }
  
  // Under 30 days: score F1, F3, F5, F6 (basic trajectory/behavior + position)
  if (accountAgeDays < 30) {
    return factorKey === 'wealthBuilding' || 
           factorKey === 'paymentConsistency' || 
           factorKey === 'emergencyBuffer' || 
           factorKey === 'debtToIncome';
  }
  
  // Under 90 days: score all factors (but note debt velocity needs more data)
  // 90+ days: score everything with full confidence
  return true;
}

// ============================================================
// PERSONALIZED TIPS
// ============================================================

function generateTips(breakdown: ScoreBreakdown): string[] {
  const tips: string[] = [];
  
  const factors = [
    { key: 'paymentConsistency' as const, pct: breakdown.paymentConsistency.percentage, tip: 'Set up autopay for all recurring bills — never miss a payment' },
    { key: 'wealthBuilding' as const, pct: breakdown.wealthBuilding.percentage, tip: 'Increase your savings rate — even 1% more makes a difference over time' },
    { key: 'debtVelocity' as const, pct: breakdown.debtVelocity.percentage, tip: 'Focus extra payments on highest-interest debt first (avalanche method)' },
    { key: 'emergencyBuffer' as const, pct: breakdown.emergencyBuffer.percentage, tip: 'Build your emergency fund — start with $1,000, then target 3-4 months of expenses' },
    { key: 'budgetDiscipline' as const, pct: breakdown.budgetDiscipline.percentage, tip: 'Review overspent categories — can you trim or reallocate from underspent ones?' },
    { key: 'debtToIncome' as const, pct: breakdown.debtToIncome.percentage, tip: 'Reduce debt burden — consider consolidating high-interest debts' },
  ];
  
  // Sort by weakest
  factors.sort((a, b) => a.pct - b.pct);
  
  // Tips for 2-3 weakest non-perfect areas
  for (const factor of factors.slice(0, 3)) {
    if (factor.pct < 90) {
      tips.push(factor.tip);
    }
  }
  
  if (tips.length === 0) {
    tips.push('You\'re doing amazing! Keep up the great work');
  }
  
  return tips;
}

// ============================================================
// MAIN CALCULATION
// ============================================================

export function calculateFinancialHealthScore(input: ScoreInput): FinancialHealthScore {
  // Step 1: Validate and sanitize input
  const { warnings, sanitizedInput } = validateAndSanitizeInput(input);
  
  // Determine account age (default to full confidence if not provided)
  const accountAgeDays = sanitizedInput.accountAgeDays ?? 1000;
  const confidence = getScoreConfidence(accountAgeDays);
  
  // Calculate all factor scores
  const allFactors: ScoreBreakdown = {
    // Trajectory (350 pts total)
    wealthBuilding: calculateWealthBuilding(
      sanitizedInput.wealthContributions, 
      sanitizedInput.monthlyIncome,
      sanitizedInput.monthlyExpenses,
      sanitizedInput.hasConfirmedIncome
    ),
    debtVelocity: calculateDebtVelocity(
      sanitizedInput.currentDebts, 
      sanitizedInput.debtsThreeMonthsAgo,
      sanitizedInput.hasConfirmedNoDebt
    ),
    
    // Behavior (350 pts total)
    paymentConsistency: calculatePaymentConsistency(
      sanitizedInput.billsPaidOnTime,
      sanitizedInput.billsPaidLate1to30,
      sanitizedInput.billsPaidLate31to60,
      sanitizedInput.billsPaidLate61Plus,
      sanitizedInput.billsPaidLate61to90,
      sanitizedInput.billsPaidLate91to120,
      sanitizedInput.billsPaidLate120Plus,
      sanitizedInput.latePaymentHistory  // H5: time-decay path
    ),
    budgetDiscipline: calculateBudgetDiscipline(
      sanitizedInput.budgetsOnTrack,
      sanitizedInput.totalBudgets,
      sanitizedInput.averageOverspendPercent,
      sanitizedInput.budgetToSpendingRatio  // Anti-gaming
    ),
    
    // Position (300 pts total)
    emergencyBuffer: calculateEmergencyBuffer(
      sanitizedInput.liquidSavings, 
      sanitizedInput.monthlyExpenses,
      sanitizedInput.householdType  // Dynamic target
    ),
    debtToIncome: calculateDebtToIncome(
      sanitizedInput.currentDebts, 
      sanitizedInput.monthlyIncome,
      sanitizedInput.monthlyExpenses,
      sanitizedInput.hasConfirmedNoDebt,
      sanitizedInput.hasConfirmedIncome
    ),
  };
  
  // Apply cold-start filtering
  const breakdown: ScoreBreakdown = {} as ScoreBreakdown;
  let trajectoryScore = 0;
  let behaviorScore = 0;
  let positionScore = 0;
  
  // Wealth Building (F1) - Trajectory
  if (shouldScoreFactor('wealthBuilding', accountAgeDays)) {
    breakdown.wealthBuilding = allFactors.wealthBuilding;
    trajectoryScore += allFactors.wealthBuilding.score;
  } else {
    breakdown.wealthBuilding = { ...allFactors.wealthBuilding, score: 0, percentage: 0, detail: 'Not yet scored — needs more data' };
  }
  
  // Debt Velocity (F2) - Trajectory
  if (shouldScoreFactor('debtVelocity', accountAgeDays)) {
    breakdown.debtVelocity = allFactors.debtVelocity;
    trajectoryScore += allFactors.debtVelocity.score;
    // Add note if building confidence
    if (accountAgeDays < 90 && accountAgeDays >= 30) {
      breakdown.debtVelocity = {
        ...breakdown.debtVelocity,
        detail: breakdown.debtVelocity.detail + ' (building history)'
      };
    }
  } else {
    breakdown.debtVelocity = { ...allFactors.debtVelocity, score: 0, percentage: 0, detail: 'Not yet scored — needs 3 months of data' };
  }
  
  // Payment Consistency (F3) - Behavior
  if (shouldScoreFactor('paymentConsistency', accountAgeDays)) {
    breakdown.paymentConsistency = allFactors.paymentConsistency;
    behaviorScore += allFactors.paymentConsistency.score;
  } else {
    breakdown.paymentConsistency = { ...allFactors.paymentConsistency, score: 0, percentage: 0, detail: 'Not yet scored — needs more data' };
  }
  
  // Budget Discipline (F4) - Behavior
  if (shouldScoreFactor('budgetDiscipline', accountAgeDays)) {
    breakdown.budgetDiscipline = allFactors.budgetDiscipline;
    behaviorScore += allFactors.budgetDiscipline.score;
  } else {
    breakdown.budgetDiscipline = { ...allFactors.budgetDiscipline, score: 0, percentage: 0, detail: 'Not yet scored — needs more data' };
  }
  
  // Emergency Buffer (F5) - Position
  breakdown.emergencyBuffer = allFactors.emergencyBuffer;
  positionScore += allFactors.emergencyBuffer.score;
  
  // Debt to Income (F6) - Position
  breakdown.debtToIncome = allFactors.debtToIncome;
  positionScore += allFactors.debtToIncome.score;
  
  const total = trajectoryScore + behaviorScore + positionScore;
  const { level, title } = getScoreLevel(total);
  const tips = generateTips(breakdown);
  
  return {
    total,
    maxTotal: 1000,
    level,
    title,
    confidence,
    pillarScores: {
      trajectory: { score: trajectoryScore, max: 350 },
      behavior: { score: behaviorScore, max: 350 },
      position: { score: positionScore, max: 300 },
    },
    breakdown,
    tips,
    warnings,  // Input validation warnings (empty = clean data)
  };
}

// ============================================================
// SCORE CHANGE COMPARISON
// ============================================================

export function calculateScoreChange(
  current: FinancialHealthScore,
  previous: FinancialHealthScore
): {
  change: number;
  improved: string[];
  declined: string[];
} {
  const change = current.total - previous.total;
  const improved: string[] = [];
  const declined: string[] = [];
  
  const factors = [
    { key: 'wealthBuilding' as const, name: 'Wealth Building' },
    { key: 'debtVelocity' as const, name: 'Debt Progress' },
    { key: 'paymentConsistency' as const, name: 'Payment History' },
    { key: 'budgetDiscipline' as const, name: 'Budget Discipline' },
    { key: 'emergencyBuffer' as const, name: 'Emergency Fund' },
    { key: 'debtToIncome' as const, name: 'Debt-to-Income' },
  ];
  
  for (const factor of factors) {
    const curr = current.breakdown[factor.key].score;
    const prev = previous.breakdown[factor.key].score;
    
    if (curr > prev) improved.push(factor.name);
    else if (curr < prev) declined.push(factor.name);
  }
  
  return { change, improved, declined };
}

// ============================================================
// EXPORTS: Debt multipliers for external use
// ============================================================

export { DEBT_MULTIPLIERS, COLLECTIONS_PENALTY, LATE_PENALTY_WEIGHTS, LATE_PAYMENT_DECAY_RATE, getTargetEmergencyMonths };
