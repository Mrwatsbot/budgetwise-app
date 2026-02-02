/**
 * Financial Health Score™
 * 
 * A universal metric measuring YOUR financial health, not bank profitability.
 * Scale: 0-1000
 * 
 * Three pillars:
 *   Trajectory (40%) — Where you're headed
 *   Behavior (35%)   — How you handle money
 *   Position (25%)   — Where you are now
 * 
 * Key differences from FICO:
 * - Rewards paying OFF debt, not having more credit
 * - Rewards savings & wealth building
 * - Weights debt types by real financial risk, not lender profit
 * - Trajectory > Position (direction matters more than snapshot)
 * - Platform-agnostic: no app-specific metrics in the score
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
  | 'student'          // Student loans
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
  
  // Payments
  billsPaidOnTime: number;
  billsPaidLate1to30: number;    // 1-30 days late
  billsPaidLate31to60: number;   // 31-60 days late
  billsPaidLate61Plus: number;   // 61+ days late
  
  // Budgets
  budgetsOnTrack: number;
  totalBudgets: number;
  averageOverspendPercent: number; // avg % over budget on overspent categories

  // Data maturity (months of transaction history)
  dataMonths?: number; // 0 = brand new, 1 = first month, 3+ = full confidence
}

// ============================================================
// DEBT TYPE MULTIPLIERS
// Research-backed: derived from interest rate risk (30%),
// asset backing (40%), and delinquency risk (30%)
// Sources: NY Fed, CFPB, Fannie Mae (see debt-weighting-research.md)
// ============================================================

const DEBT_MULTIPLIERS: Record<DebtType, number> = {
  payday:          2.5,   // 400%+ APR, 80% reborrow rate, financial trap
  credit_card:     1.5,   // ~24% APR, no asset, 8-11% delinquency
  bnpl:            1.3,   // Impulse consumption, fragmented across providers
  personal:        1.2,   // Lower rate than cards, still unsecured
  auto:            0.7,   // Depreciating asset but essential for most Americans
  student:         0.5,   // Human capital investment, federal protections, lower rates
  medical:         0.4,   // Involuntary — CFPB: "little predictive value"
  mortgage:        0.3,   // Asset-building, lowest default rate, tax-advantaged
  zero_pct:        0.2,   // Economically rational, near-zero cost
  cc_paid_monthly: 0.05,  // Actually a positive signal — responsible credit use
  secured:         0.1,   // Collateral covers it (per Fannie Mae guidelines)
};

const COLLECTIONS_PENALTY = 1.5; // Multiplied on top of base multiplier

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

export interface FinancialHealthScore {
  total: number;
  maxTotal: 1000;
  level: number;
  title: string;
  pillarScores: {
    trajectory: { score: number; max: 400 };
    behavior: { score: number; max: 350 };
    position: { score: number; max: 250 };
  };
  breakdown: ScoreBreakdown;
  tips: string[];
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
// FACTOR 1: WEALTH BUILDING RATE (200 pts — Trajectory)
// ============================================================

function calculateWealthBuilding(
  contributions: WealthContribution,
  monthlyIncome: number
): FactorScore {
  const maxScore = 200;
  const sublabel = 'Trajectory';
  
  if (monthlyIncome <= 0) {
    return { score: 0, maxScore, percentage: 0, detail: 'No income recorded', sublabel };
  }
  
  const totalContributions = 
    contributions.cashSavings +
    contributions.retirement401k +
    contributions.ira +
    contributions.investments +
    contributions.hsa +
    contributions.extraDebtPayments;
  
  const rate = totalContributions / monthlyIncome;
  
  // Linear scale: 20% savings rate = max score
  // Formula: min(200, (rate / 0.20) × 200)
  const score = Math.round(Math.min(maxScore, (rate / 0.20) * maxScore));
  
  const ratePct = (rate * 100).toFixed(1);
  let detail: string;
  
  if (rate >= 0.20) {
    detail = `${ratePct}% wealth building rate — Crushing it!`;
  } else if (rate >= 0.15) {
    detail = `${ratePct}% rate — Strong progress, ${(20 - rate * 100).toFixed(0)}% from max`;
  } else if (rate >= 0.10) {
    detail = `${ratePct}% rate — Solid foundation building`;
  } else if (rate >= 0.05) {
    detail = `${ratePct}% rate — Every dollar counts, keep going`;
  } else if (rate > 0) {
    detail = `${ratePct}% rate — Getting started`;
  } else {
    detail = 'No wealth building this month';
  }
  
  return { score, maxScore, percentage: (score / maxScore) * 100, detail, sublabel };
}

// ============================================================
// FACTOR 2: DEBT VELOCITY (200 pts — Trajectory)
// ============================================================

function calculateDebtVelocity(
  currentDebts: DebtEntry[],
  debtsThreeMonthsAgo: DebtEntry[]
): FactorScore {
  const maxScore = 200;
  const sublabel = 'Trajectory';
  
  const currentWeighted = calculateWeightedDebt(currentDebts);
  const previousWeighted = calculateWeightedDebt(debtsThreeMonthsAgo);
  
  // No debt now and before = perfect
  if (currentWeighted === 0 && previousWeighted === 0) {
    return {
      score: 200, maxScore, percentage: 100,
      detail: 'Debt-free!', sublabel,
    };
  }
  
  // Just became debt free
  if (currentWeighted === 0 && previousWeighted > 0) {
    return {
      score: 200, maxScore, percentage: 100,
      detail: 'You paid off all your debt!', sublabel,
    };
  }
  
  // Calculate velocity as % change over 3 months
  const changeRate = previousWeighted > 0
    ? ((currentWeighted - previousWeighted) / previousWeighted) * 100
    : 100; // New debt from zero
  
  let score: number;
  let detail: string;
  
  if (changeRate <= -15) {
    // Rapid decrease (>5%/month)
    score = 200;
    detail = `Weighted debt down ${Math.abs(changeRate).toFixed(0)}% — Excellent momentum!`;
  } else if (changeRate <= -10) {
    score = 185;
    detail = `Weighted debt down ${Math.abs(changeRate).toFixed(0)}% — Strong progress`;
  } else if (changeRate <= -5) {
    score = 165;
    detail = `Weighted debt down ${Math.abs(changeRate).toFixed(0)}% — Good trajectory`;
  } else if (changeRate < -1) {
    // Slow decrease
    score = Math.round(100 + Math.abs(changeRate) * 13);
    detail = `Weighted debt down ${Math.abs(changeRate).toFixed(1)}% — Moving in right direction`;
  } else if (changeRate <= 1) {
    // Stable
    score = 100;
    detail = 'Debt stable — Can you accelerate payoff?';
  } else if (changeRate <= 5) {
    score = Math.round(Math.max(0, 100 - changeRate * 8));
    detail = `Weighted debt up ${changeRate.toFixed(1)}% — Time to course correct`;
  } else if (changeRate <= 10) {
    score = 30;
    detail = `Weighted debt up ${changeRate.toFixed(0)}% — Concerning trend`;
  } else {
    score = 0;
    detail = `Weighted debt up ${changeRate.toFixed(0)}% — Urgent: review spending`;
  }
  
  return { score: Math.max(0, Math.min(maxScore, score)), maxScore, percentage: (score / maxScore) * 100, detail, sublabel };
}

// ============================================================
// FACTOR 3: PAYMENT CONSISTENCY (200 pts — Behavior)
// ============================================================

function calculatePaymentConsistency(
  onTime: number,
  late1to30: number,
  late31to60: number,
  late61Plus: number
): FactorScore {
  const maxScore = 200;
  const sublabel = 'Behavior';
  
  const totalBills = onTime + late1to30 + late31to60 + late61Plus;
  
  if (totalBills === 0) {
    // No data = neutral score, not perfect. You have to earn it.
    return { score: 100, maxScore, percentage: 50, detail: 'No bills tracked yet — add bills to build your score', sublabel };
  }
  
  // Weighted penalty system (industry-inspired by FICO severity tiers)
  // On-time = 0 penalty
  // 1-30 days late = 0.5 penalty per occurrence
  // 31-60 days late = 1.0 penalty per occurrence
  // 61+ days late = 1.5 penalty per occurrence
  
  const penalties = (late1to30 * 0.5) + (late31to60 * 1.0) + (late61Plus * 1.5);
  const effectiveOnTime = totalBills - penalties;
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
  averageOverspendPercent: number
): FactorScore {
  const maxScore = 150;
  const sublabel = 'Behavior';
  
  if (totalBudgets === 0) {
    return {
      score: 75, maxScore, percentage: 50,
      detail: 'No budgets set — create budgets to track this', sublabel,
    };
  }
  
  // Sub-factor A: Adherence (90 pts)
  // What % of budgets stayed within limit?
  const adherenceScore = Math.round((budgetsOnTrack / totalBudgets) * 90);
  
  // Sub-factor B: Overspend severity (60 pts)
  // How much over budget on average for overspent categories?
  let severityScore: number;
  if (budgetsOnTrack === totalBudgets) {
    severityScore = 60; // All on track = perfect severity score
  } else if (averageOverspendPercent <= 10) {
    severityScore = 48; // Slight overspend
  } else if (averageOverspendPercent <= 25) {
    severityScore = 35;
  } else if (averageOverspendPercent <= 50) {
    severityScore = 20;
  } else if (averageOverspendPercent <= 100) {
    severityScore = 8;
  } else {
    severityScore = 0; // Massively over budget
  }
  
  const score = adherenceScore + severityScore;
  
  let detail: string;
  if (budgetsOnTrack === totalBudgets) {
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
// FACTOR 5: EMERGENCY BUFFER (125 pts — Position)
// ============================================================

function calculateEmergencyBuffer(
  liquidSavings: number,
  monthlyExpenses: number
): FactorScore {
  const maxScore = 125;
  const sublabel = 'Position';
  
  if (monthlyExpenses <= 0) {
    return {
      score: liquidSavings > 0 ? 125 : 0, maxScore,
      percentage: liquidSavings > 0 ? 100 : 0,
      detail: liquidSavings > 0 ? 'Great savings!' : 'No expenses tracked',
      sublabel,
    };
  }
  
  const monthsCovered = liquidSavings / monthlyExpenses;
  
  // Linear scale: 4 months = max score
  // Formula: min(125, (monthsCovered / 4) × 125)
  // Why 4 not 3: Having 3 months is "adequate." 4+ shows real margin.
  const score = Math.round(Math.min(maxScore, (monthsCovered / 4) * maxScore));
  
  let detail: string;
  if (monthsCovered >= 6) {
    detail = `${monthsCovered.toFixed(1)} months covered — Fortress mode!`;
  } else if (monthsCovered >= 4) {
    detail = `${monthsCovered.toFixed(1)} months covered — Strong safety net`;
  } else if (monthsCovered >= 3) {
    detail = `${monthsCovered.toFixed(1)} months — Solid, keep building to 4+`;
  } else if (monthsCovered >= 1) {
    detail = `${monthsCovered.toFixed(1)} months — Good start, target 3-4 months`;
  } else if (monthsCovered > 0) {
    detail = `${Math.round(monthsCovered * 30)} days covered — Building your safety net`;
  } else {
    detail = 'No emergency buffer — start with a $500 goal';
  }
  
  return { score, maxScore, percentage: (score / maxScore) * 100, detail, sublabel };
}

// ============================================================
// FACTOR 6: DEBT-TO-INCOME (125 pts — Position)
// ============================================================

function calculateDebtToIncome(
  currentDebts: DebtEntry[],
  monthlyIncome: number
): FactorScore {
  const maxScore = 125;
  const sublabel = 'Position';
  
  if (monthlyIncome <= 0) {
    return { score: 0, maxScore, percentage: 0, detail: 'No income recorded', sublabel };
  }
  
  const totalRawDebt = currentDebts.reduce((sum, d) => sum + d.balance, 0);
  
  if (totalRawDebt === 0) {
    return { score: 125, maxScore, percentage: 100, detail: 'No debt! Perfect score', sublabel };
  }
  
  // Use weighted monthly payments for DTI calculation
  const weightedMonthlyPayments = calculateWeightedMonthlyPayments(currentDebts);
  const weightedDTI = (weightedMonthlyPayments / monthlyIncome) * 100;
  
  // Smooth curve: max(0, 125 - (weightedDTI × 2.08))
  // At 0% DTI = 125, at 60% DTI = 0
  const score = Math.round(Math.max(0, maxScore - (weightedDTI * 2.08)));
  
  const rawDTI = (currentDebts.reduce((sum, d) => sum + d.monthlyPayment, 0) / monthlyIncome * 100).toFixed(0);
  
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
  const breakdown: ScoreBreakdown = {
    // Trajectory (400 pts)
    wealthBuilding: calculateWealthBuilding(input.wealthContributions, input.monthlyIncome),
    debtVelocity: calculateDebtVelocity(input.currentDebts, input.debtsThreeMonthsAgo),
    
    // Behavior (350 pts)
    paymentConsistency: calculatePaymentConsistency(
      input.billsPaidOnTime,
      input.billsPaidLate1to30,
      input.billsPaidLate31to60,
      input.billsPaidLate61Plus
    ),
    budgetDiscipline: calculateBudgetDiscipline(
      input.budgetsOnTrack,
      input.totalBudgets,
      input.averageOverspendPercent
    ),
    
    // Position (250 pts)
    emergencyBuffer: calculateEmergencyBuffer(input.liquidSavings, input.monthlyExpenses),
    debtToIncome: calculateDebtToIncome(input.currentDebts, input.monthlyIncome),
  };

  // --- Cold-start confidence multiplier ---
  // Behavior scores need time to be meaningful. One perfect month ≠ proven discipline.
  // Ramp: month 1 = 60% credit, month 2 = 75%, month 3 = 90%, month 4+ = 100%
  const dataMonths = input.dataMonths ?? 3; // default to full if not provided
  const behaviorConfidence = dataMonths <= 0 ? 0.5 : Math.min(1.0, 0.5 + (dataMonths * 0.15));

  // Apply confidence to behavior factors (scale toward neutral midpoint, not zero)
  if (dataMonths < 4) {
    const paymentMid = breakdown.paymentConsistency.maxScore * 0.5;
    const budgetMid = breakdown.budgetDiscipline.maxScore * 0.5;
    
    breakdown.paymentConsistency.score = Math.round(
      paymentMid + (breakdown.paymentConsistency.score - paymentMid) * behaviorConfidence
    );
    breakdown.paymentConsistency.percentage = (breakdown.paymentConsistency.score / breakdown.paymentConsistency.maxScore) * 100;
    breakdown.paymentConsistency.detail += ` (${Math.round(behaviorConfidence * 100)}% confidence — builds over time)`;

    breakdown.budgetDiscipline.score = Math.round(
      budgetMid + (breakdown.budgetDiscipline.score - budgetMid) * behaviorConfidence
    );
    breakdown.budgetDiscipline.percentage = (breakdown.budgetDiscipline.score / breakdown.budgetDiscipline.maxScore) * 100;
    breakdown.budgetDiscipline.detail += ` (${Math.round(behaviorConfidence * 100)}% confidence)`;
  }
  
  const trajectoryScore = breakdown.wealthBuilding.score + breakdown.debtVelocity.score;
  const behaviorScore = breakdown.paymentConsistency.score + breakdown.budgetDiscipline.score;
  const positionScore = breakdown.emergencyBuffer.score + breakdown.debtToIncome.score;
  
  const total = trajectoryScore + behaviorScore + positionScore;
  const { level, title } = getScoreLevel(total);
  const tips = generateTips(breakdown);
  
  return {
    total,
    maxTotal: 1000,
    level,
    title,
    pillarScores: {
      trajectory: { score: trajectoryScore, max: 400 },
      behavior: { score: behaviorScore, max: 350 },
      position: { score: positionScore, max: 250 },
    },
    breakdown,
    tips,
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

export { DEBT_MULTIPLIERS, COLLECTIONS_PENALTY };
