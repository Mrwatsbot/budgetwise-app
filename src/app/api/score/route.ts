import { NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import type { DebtType as ScoringDebtType, ScoreInput, LatePaymentEntry } from '@/lib/scoring/financial-health-score';
import { calculateFinancialHealthScore } from '@/lib/scoring/financial-health-score';

// Map database debt types to scoring engine types
const DB_TO_SCORING_TYPE: Record<string, ScoringDebtType> = {
  credit_card: 'credit_card',
  cc_paid_monthly: 'cc_paid_monthly',
  mortgage: 'mortgage',
  heloc: 'mortgage',
  auto: 'auto',
  student: 'student',
  personal: 'personal',
  medical: 'medical',
  business: 'personal',
  payday: 'payday',
  bnpl: 'bnpl',
  zero_pct: 'zero_pct',
  secured: 'secured',
  other: 'personal',
};

// Debt type multipliers for the API response (direct weight values)
const DEBT_TYPE_MULTIPLIERS: Record<string, number> = {
  credit_card: 1.5,
  mortgage: 0.3,
  auto: 0.7,
  student: 0.5,
  personal: 1.0,
  payday: 2.5,
  bnpl: 1.2,
  medical: 0.4,
  heloc: 0.35,
  business: 0.6,
  cc_paid_monthly: 0.05,
  zero_pct: 0.1,
  secured: 0.15,
  other: 1.0,
};

function getLevel(score: number): number {
  if (score >= 900) return 5;
  if (score >= 750) return 4;
  if (score >= 600) return 3;
  if (score >= 400) return 2;
  if (score >= 200) return 1;
  return 0;
}

function getLevelTitle(level: number): string {
  switch (level) {
    case 5: return 'Financial Freedom';
    case 4: return 'Wealth Builder';
    case 3: return 'Solid Ground';
    case 2: return 'Foundation';
    case 1: return 'Getting Started';
    default: return 'Starting Point';
  }
}

export async function GET() {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0];

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStr = startOfMonth.toISOString().split('T')[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  // Parallel fetch all data needed for scoring
  const [
    profileRes,
    debtsRes,
    savingsGoalsRes,
    savingsContribRes,
    debtPaymentsRes,
    billPaymentsRes,
    budgetsRes,
    transactionsRes,
    historyRes,
    achievementsRes,
    streaksRes,
  ] = await Promise.all([
    // Profile for income and household_type
    sb.from('profiles').select('id, monthly_income, household_type').eq('id', user.id).single(),
    // Current debts - fields needed for scoring (including minimum_payment & term_months as fallbacks)
    sb.from('debts').select('id, type, current_balance, monthly_payment, minimum_payment, apr, in_collections, term_months').eq('user_id', user.id).eq('is_active', true),
    // Savings goals - only fields needed
    sb.from('savings_goals').select('id, type, current_amount, monthly_contribution').eq('user_id', user.id).eq('is_active', true),
    // Savings contributions last 3 months
    sb.from('savings_contributions')
      .select('amount, date')
      .eq('user_id', user.id)
      .gte('date', threeMonthsAgoStr)
      .order('date', { ascending: false }),
    // Debt payments last 3 months
    sb.from('debt_payments')
      .select('debt_id, amount, is_extra, date')
      .eq('user_id', user.id)
      .gte('date', threeMonthsAgoStr)
      .order('date', { ascending: false }),
    // Bill payments - only status needed
    sb.from('bill_payments')
      .select('status, due_date')
      .eq('user_id', user.id)
      .order('due_date', { ascending: false })
      .limit(200),
    // Budgets for current month
    sb.from('budgets')
      .select('category_id, budgeted')
      .eq('user_id', user.id)
      .eq('month', monthStr),
    // Transactions for current month (for budget discipline + expenses)
    sb.from('transactions')
      .select('amount, category_id, date')
      .eq('user_id', user.id)
      .gte('date', threeMonthsAgoStr)
      .order('date', { ascending: false }),
    // Score history (last 30) - only fields needed for UI
    sb.from('score_history')
      .select('total_score, level, trajectory_score, behavior_score, position_score, scored_at')
      .eq('user_id', user.id)
      .order('scored_at', { ascending: false })
      .limit(30),
    // Achievements - specific fields
    sb.from('user_achievements')
      .select('id, unlocked_at, achievement:achievement_definitions(id, name, icon, description)')
      .eq('user_id', user.id),
    // Streaks - only essential fields
    sb.from('streaks')
      .select('id, streak_type, current_count, longest_count, last_activity_date')
      .eq('user_id', user.id),
  ]);

  // Also fetch achievement definitions (for locked ones)
  const achievementDefsRes = await sb.from('achievement_definitions')
    .select('id, name, icon, description, tier, sort_order')
    .order('sort_order');

  const debts = debtsRes.data || [];
  const savingsGoals = savingsGoalsRes.data || [];
  const savingsContributions = savingsContribRes.data || [];
  const debtPayments = debtPaymentsRes.data || [];
  const billPayments = billPaymentsRes.data || [];
  const budgets = budgetsRes.data || [];
  const allTransactions = transactionsRes.data || [];
  const history = historyRes.data || [];
  const userAchievements = achievementsRes.data || [];
  const streaks = streaksRes.data || [];
  const achievementDefs = achievementDefsRes.data || [];

  // --- Calculate Monthly Income ---
  // Priority: this month's income transactions → 3-month avg → profile monthly_income
  const thisMonthTransactions = allTransactions.filter(
    (t: { date: string }) => t.date >= monthStr
  );
  const incomeThisMonth = thisMonthTransactions
    .filter((t: { amount: number }) => t.amount > 0)
    .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

  const totalIncome3Mo = allTransactions
    .filter((t: { amount: number }) => t.amount > 0)
    .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
  const profileMonthlyIncome = profileRes.data?.monthly_income || 0;
  const monthlyIncome = incomeThisMonth > 0 
    ? incomeThisMonth 
    : totalIncome3Mo > 0 
      ? totalIncome3Mo / 3 
      : profileMonthlyIncome;

  // --- Calculate Monthly Expenses ---
  const totalExpenses3Mo = allTransactions
    .filter((t: { amount: number }) => t.amount < 0)
    .reduce((sum: number, t: { amount: number }) => sum + Math.abs(t.amount), 0);
  const monthlyExpenses = totalExpenses3Mo / 3;

  // --- Wealth Building Rate ---
  const totalSavingsContrib = savingsContributions.reduce(
    (sum: number, c: { amount: number }) => sum + (c.amount || 0), 0
  );
  const totalExtraDebtPayments = debtPayments
    .filter((p: { is_extra: boolean }) => p.is_extra)
    .reduce((sum: number, p: { amount: number }) => sum + (p.amount || 0), 0);
  const monthlyAvgSavingsContrib = totalSavingsContrib / 3;
  const monthlyAvgExtraDebt = totalExtraDebtPayments / 3;

  // --- Debt entries for scoring ---
  // P0 Fix: Prevent cc_paid_monthly loophole. If a credit card type is "cc_paid_monthly" 
  // but carries a revolving balance, it should be scored as regular "credit_card" (1.5× weight).
  // cc_paid_monthly (0.0×) is ONLY for cards where the statement balance is paid in full.
  // A card with a current_balance > 0 and monthly_payment < current_balance is revolving.
  // Default term assumptions by debt type (months) for estimating payments when not provided
  // Based on typical loan terms: mortgage=360, student=120, auto=72, personal=48, etc.
  const DEFAULT_TERM_BY_TYPE: Record<string, number> = {
    mortgage: 360,
    heloc: 240,
    student: 120,
    student_federal: 120,
    student_private: 120,
    auto: 72,
    personal: 48,
    medical: 60,
    credit_card: 36,
    bnpl: 12,
    payday: 3,
    business: 60,
    other: 60,
  };

  const currentDebtEntries = debts.map((d: { type: string; current_balance: number; monthly_payment: number; minimum_payment: number; apr: number; in_collections: boolean; term_months: number | null }) => {
    let scoringType = (DB_TO_SCORING_TYPE[d.type] || 'personal') as ScoringDebtType;
    
    // If classified as cc_paid_monthly but carries a balance, reclassify as revolving credit card
    if (scoringType === 'cc_paid_monthly' && (d.current_balance || 0) > 0) {
      scoringType = 'credit_card';
    }
    
    // Payment fallback chain: monthly_payment → minimum_payment → estimate from balance/term
    let payment = d.monthly_payment || 0;
    if (payment === 0 && d.minimum_payment) {
      payment = d.minimum_payment;
    }
    if (payment === 0 && (d.current_balance || 0) > 0) {
      // Estimate using term_months if available, otherwise use type-specific default
      const termMonths = d.term_months || DEFAULT_TERM_BY_TYPE[d.type] || 60;
      payment = (d.current_balance || 0) / termMonths;
    }
    
    return {
      type: scoringType,
      balance: d.current_balance || 0,
      monthlyPayment: payment,
      apr: d.apr || 0,
      inCollections: d.in_collections || false,
    };
  });

  // For 3-month-ago debt snapshot, we estimate from payments
  // Use current debts but add back the payments made in last 3 months
  const debtsThreeMonthsAgo = debts.map((d: { id: string; type: string; current_balance: number; monthly_payment: number; minimum_payment: number; apr: number; in_collections: boolean; term_months: number | null }) => {
    const paymentsForDebt = debtPayments
      .filter((p: { debt_id: string }) => p.debt_id === d.id)
      .reduce((sum: number, p: { amount: number }) => sum + (p.amount || 0), 0);
    
    // Same payment fallback chain
    let payment = d.monthly_payment || 0;
    if (payment === 0 && d.minimum_payment) {
      payment = d.minimum_payment;
    }
    if (payment === 0 && (d.current_balance || 0) > 0) {
      const termMonths = d.term_months || DEFAULT_TERM_BY_TYPE[d.type] || 60;
      payment = (d.current_balance || 0) / termMonths;
    }
    
    return {
      type: (DB_TO_SCORING_TYPE[d.type] || 'personal') as ScoringDebtType,
      balance: (d.current_balance || 0) + paymentsForDebt,
      monthlyPayment: payment,
      apr: d.apr || 0,
      inCollections: d.in_collections || false,
    };
  });

  // --- Payment Consistency ---
  const onTime = billPayments.filter((p: { status: string }) => p.status === 'on_time').length;
  const late1to30 = billPayments.filter((p: { status: string }) => p.status === 'late_1_30').length;
  const late31to60 = billPayments.filter((p: { status: string }) => p.status === 'late_31_60').length;
  const late61Plus = billPayments.filter((p: { status: string }) =>
    p.status === 'late_61_plus' || p.status === 'missed'
  ).length;

  // H5: Build late payment history with recency for time-decay scoring
  // Each late payment gets a monthsAgo value based on due_date
  const latePaymentHistory = billPayments
    .filter((p: { status: string }) => p.status !== 'on_time' && p.status !== 'pending')
    .map((p: { status: string; due_date: string }) => {
      const dueDate = new Date(p.due_date);
      const monthsAgo = Math.max(0, Math.round(
        (now.getTime() - dueDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000)
      ));
      
      let tier: 'late1to30' | 'late31to60' | 'late61to90' | 'late91to120' | 'late120Plus';
      switch (p.status) {
        case 'late_1_30': tier = 'late1to30'; break;
        case 'late_31_60': tier = 'late31to60'; break;
        case 'late_61_90': tier = 'late61to90'; break;
        case 'late_91_120': tier = 'late91to120'; break;
        case 'late_120_plus': tier = 'late120Plus'; break;
        case 'late_61_plus': tier = 'late61to90'; break; // legacy
        case 'missed': tier = 'late120Plus'; break; // missed = worst tier
        default: tier = 'late1to30'; break;
      }
      
      return { tier, monthsAgo };
    });

  // --- Budget Discipline ---
  const spentByCategory: Record<string, number> = {};
  thisMonthTransactions
    .filter((t: { amount: number }) => t.amount < 0)
    .forEach((t: { amount: number; category_id: string | null }) => {
      if (t.category_id) {
        spentByCategory[t.category_id] = (spentByCategory[t.category_id] || 0) + Math.abs(t.amount);
      }
    });

  let budgetsOnTrack = 0;
  let totalOverspendPct = 0;
  let overspentCount = 0;

  budgets.forEach((b: { category_id: string; budgeted: number }) => {
    const spent = spentByCategory[b.category_id] || 0;
    if (spent <= b.budgeted) {
      budgetsOnTrack++;
    } else {
      overspentCount++;
      totalOverspendPct += ((spent - b.budgeted) / b.budgeted) * 100;
    }
  });

  const avgOverspendPct = overspentCount > 0 ? totalOverspendPct / overspentCount : 0;

  // Anti-gaming: Calculate budget-to-spending ratio
  // Compares total budgeted amounts to trailing 3-month average spending per category
  // If budgets are significantly inflated vs actual spending, cap adherence score
  let budgetToSpendingRatio: number | undefined;
  if (budgets.length > 0) {
    const totalBudgeted = budgets.reduce((sum: number, b: { budgeted: number }) => sum + (b.budgeted || 0), 0);
    // Get 3-month average spending in budgeted categories
    const budgetCategoryIds = new Set(budgets.map((b: { category_id: string }) => b.category_id));
    const spendInBudgetedCategories = allTransactions
      .filter((t: { amount: number; category_id: string | null }) => 
        t.amount < 0 && t.category_id && budgetCategoryIds.has(t.category_id)
      )
      .reduce((sum: number, t: { amount: number }) => sum + Math.abs(t.amount), 0);
    const monthlyAvgSpendInBudgeted = spendInBudgetedCategories / 3;
    
    if (monthlyAvgSpendInBudgeted > 0) {
      budgetToSpendingRatio = totalBudgeted / monthlyAvgSpendInBudgeted;
    }
  }

  // --- Emergency Buffer ---
  // Liquid savings = emergency + general + custom + HSA savings goals
  // PLUS checking/savings account balances (real bank accounts)
  const liquidSavingsGoals = savingsGoals.filter(
    (g: { type: string }) => ['emergency', 'general', 'custom', 'hsa'].includes(g.type)
  );
  const savingsGoalTotal = liquidSavingsGoals.reduce(
    (sum: number, g: { current_amount: number }) => sum + (g.current_amount || 0), 0
  );
  
  // Also fetch account balances (checking + savings accounts are liquid)
  const accountsRes = await sb.from('accounts')
    .select('balance, type')
    .eq('user_id', user.id)
    .in('type', ['checking', 'savings']);
  const accountBalances = (accountsRes.data || []).reduce(
    (sum: number, a: { balance: number }) => sum + (a.balance || 0), 0
  );
  
  const liquidSavings = savingsGoalTotal + accountBalances;

  // --- Determine hasConfirmedNoDebt ---
  // For now: if debts array is empty, treat as unconfirmed (neutral score)
  // If debts array has entries, the DTI calculation works normally
  // In the future, this should come from user's profile when we add explicit confirmation UI
  const hasConfirmedNoDebt = debts.length > 0 ? undefined : false;

  // --- Wealth contributions from savings goals by type ---
  // Categorize ALL savings goals' monthly_contribution by wealth type
  // DB types: emergency, general, retirement_401k, ira, hsa, education_529, brokerage, custom
  const wealthFromGoals = {
    cashSavings: 0,
    retirement401k: 0,
    ira: 0,
    investments: 0,
    hsa: 0,
  };
  
  savingsGoals.forEach((g: { type: string; monthly_contribution: number }) => {
    const contrib = g.monthly_contribution || 0;
    if (contrib <= 0) return;
    switch (g.type) {
      case 'emergency':
      case 'general':
      case 'custom':
        wealthFromGoals.cashSavings += contrib;
        break;
      case 'retirement_401k':
        wealthFromGoals.retirement401k += contrib;
        break;
      case 'ira':
        wealthFromGoals.ira += contrib;
        break;
      case 'brokerage':
      case 'education_529':
        wealthFromGoals.investments += contrib;
        break;
      case 'hsa':
        wealthFromGoals.hsa += contrib;
        break;
    }
  });
  
  // Use the higher of: actual logged savings contributions OR planned goal contributions
  const cashSavingsAmount = Math.max(monthlyAvgSavingsContrib, wealthFromGoals.cashSavings);

  // --- Build Score Input ---
  const scoreInput: ScoreInput = {
    monthlyIncome,
    wealthContributions: {
      cashSavings: cashSavingsAmount,
      retirement401k: wealthFromGoals.retirement401k,
      ira: wealthFromGoals.ira,
      investments: wealthFromGoals.investments,
      hsa: wealthFromGoals.hsa,
      extraDebtPayments: monthlyAvgExtraDebt,
    },
    liquidSavings,
    monthlyExpenses,
    currentDebts: currentDebtEntries,
    debtsThreeMonthsAgo,
    billsPaidOnTime: onTime,
    billsPaidLate1to30: late1to30,
    billsPaidLate31to60: late31to60,
    billsPaidLate61Plus: late61Plus,
    budgetsOnTrack,
    totalBudgets: budgets.length,
    averageOverspendPercent: avgOverspendPct,
    hasConfirmedNoDebt,
    // H5: Time-decay on late payments
    latePaymentHistory: latePaymentHistory.length > 0 ? latePaymentHistory : undefined,
    // Anti-gaming: budget reasonableness
    budgetToSpendingRatio,
    // Household type for dynamic emergency buffer targets
    householdType: profileRes.data?.household_type as 'dual_income' | 'single_income' | 'self_employed' | 'retired' | undefined,
    // Income confirmation: true if any real income source exists
    hasConfirmedIncome: monthlyIncome > 0,
  };

  // --- Calculate Score ---
  const result = calculateFinancialHealthScore(scoreInput);
  const level = getLevel(result.total);
  const levelTitle = getLevelTitle(level);

  // --- Upsert score_history (one per day) ---
  const today = now.toISOString().split('T')[0];
  await sb.from('score_history').upsert(
    {
      user_id: user.id,
      total_score: result.total,
      level,
      trajectory_score: result.pillarScores.trajectory.score,
      behavior_score: result.pillarScores.behavior.score,
      position_score: result.pillarScores.position.score,
      wealth_building_rate: result.breakdown.wealthBuilding.score,
      debt_velocity: result.breakdown.debtVelocity.score,
      payment_consistency: result.breakdown.paymentConsistency.score,
      budget_discipline: result.breakdown.budgetDiscipline.score,
      emergency_buffer: result.breakdown.emergencyBuffer.score,
      debt_to_income: result.breakdown.debtToIncome.score,
      bonus_points: 0,
      scored_at: today,
    },
    { onConflict: 'user_id,scored_at' }
  );

  // Refresh history after upsert
  const { data: updatedHistory } = await sb.from('score_history')
    .select('*')
    .eq('user_id', user.id)
    .order('scored_at', { ascending: false })
    .limit(30);

  // --- Generate factor-specific tips for low-scoring components ---
  const factorTips: Record<string, string> = {
    wealthBuilding: 'Increase your savings rate — even 1% more makes a difference over time',
    debtVelocity: 'Focus extra payments on highest-interest debt first (avalanche method)',
    paymentConsistency: 'Set up autopay for all recurring bills — never miss a payment',
    budgetDiscipline: 'Review overspent categories — can you trim or reallocate from underspent ones?',
    emergencyBuffer: 'Build your emergency fund — start with $1,000, then target 3-6 months of expenses',
    debtToIncome: 'Reduce debt burden — consider consolidating high-interest debts',
  };

  // Add tips to factors scoring below 70%
  const wealthBuildingPct = result.breakdown.wealthBuilding.percentage;
  const debtVelocityPct = result.breakdown.debtVelocity.percentage;
  const paymentConsistencyPct = result.breakdown.paymentConsistency.percentage;
  const budgetDisciplinePct = result.breakdown.budgetDiscipline.percentage;
  const emergencyBufferPct = result.breakdown.emergencyBuffer.percentage;
  const debtToIncomePct = result.breakdown.debtToIncome.percentage;

  // --- Build Response ---
  const score = {
    total: result.total,
    level,
    levelTitle,
    trajectory: {
      score: result.pillarScores.trajectory.score,
      max: 350,  // Updated from 400 to match v2
      wealthBuildingRate: {
        score: result.breakdown.wealthBuilding.score,
        max: 175,  // Updated from 200 to match v2
        detail: result.breakdown.wealthBuilding.detail,
        tip: wealthBuildingPct < 70 ? factorTips.wealthBuilding : undefined,
      },
      debtVelocity: {
        score: result.breakdown.debtVelocity.score,
        max: 175,  // Updated from 200 to match v2
        detail: result.breakdown.debtVelocity.detail,
        tip: debtVelocityPct < 70 ? factorTips.debtVelocity : undefined,
      },
    },
    behavior: {
      score: result.pillarScores.behavior.score,
      max: 350,
      paymentConsistency: {
        score: result.breakdown.paymentConsistency.score,
        max: 200,
        detail: result.breakdown.paymentConsistency.detail,
        tip: paymentConsistencyPct < 70 ? factorTips.paymentConsistency : undefined,
      },
      budgetDiscipline: {
        score: result.breakdown.budgetDiscipline.score,
        max: 150,
        detail: result.breakdown.budgetDiscipline.detail,
        tip: budgetDisciplinePct < 70 ? factorTips.budgetDiscipline : undefined,
      },
    },
    position: {
      score: result.pillarScores.position.score,
      max: 300,  // Updated from 250 to match v2
      emergencyBuffer: {
        score: result.breakdown.emergencyBuffer.score,
        max: 150,  // Updated from 125 to match v2
        detail: result.breakdown.emergencyBuffer.detail,
        tip: emergencyBufferPct < 70 ? factorTips.emergencyBuffer : undefined,
      },
      debtToIncome: {
        score: result.breakdown.debtToIncome.score,
        max: 150,  // Updated from 125 to match v2
        detail: result.breakdown.debtToIncome.detail,
        tip: debtToIncomePct < 70 ? factorTips.debtToIncome : undefined,
      },
    },
    tips: result.tips,
    previousScore: (updatedHistory && updatedHistory.length > 1)
      ? updatedHistory[1].total_score
      : null,
  };

  // --- Build debt cost data for "The Bleed" ---
  const debtCosts = debts
    .filter((d: { apr: number; current_balance: number }) => d.apr > 0 && d.current_balance > 0)
    .map((d: { type: string; current_balance: number; apr: number }) => ({
      type: d.type,
      balance: d.current_balance,
      apr: d.apr,
      monthlyInterest: (d.current_balance * (d.apr / 100)) / 12,
    }));

  // --- Build data completeness for "What's Missing" section ---
  const totalRawPayments = currentDebtEntries.reduce((s: number, d: { monthlyPayment: number }) => s + d.monthlyPayment, 0);
  const effectiveIncomeUsed = monthlyIncome > 0 ? monthlyIncome : (monthlyExpenses > 0 ? monthlyExpenses * 1.1 : 2000);
  
  const dataCompleteness = {
    hasDebts: debts.length > 0,
    hasBudgets: budgets.length > 0,
    hasSavingsGoals: savingsGoals.length > 0,
    hasBillPayments: billPayments.length > 0,
    hasHouseholdType: !!(profileRes.data?.household_type),
    hasIncome: monthlyIncome > 0,
  };

  // Temporary debug info for score inputs (remove after debugging)
  const _debug = {
    monthlyIncome,
    profileMonthlyIncome,
    incomeThisMonth,
    totalIncome3Mo,
    effectiveIncomeUsed,
    monthlyExpenses,
    debtsCount: debts.length,
    totalRawPayments,
    debtEntries: currentDebtEntries.map((d: { type: string; balance: number; monthlyPayment: number }) => ({
      type: d.type, balance: d.balance, payment: d.monthlyPayment
    })),
    rawDTIpct: totalRawPayments > 0 ? ((totalRawPayments / effectiveIncomeUsed) * 100).toFixed(1) : '0',
    wealthContributions: scoreInput.wealthContributions,
  };

  return NextResponse.json({
    score: {
      ...score,
      dataCompleteness,
      debtCosts,
    },
    _debug,
    history: (updatedHistory || []).reverse(),
    achievements: userAchievements,
    achievementDefinitions: achievementDefs,
    streaks,
    user: {
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
    },
  });
}
