import { NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import type { DebtType as ScoringDebtType, ScoreInput } from '@/lib/scoring/financial-health-score';
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
    accountsRes,
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
    // Profile for income
    sb.from('profiles').select('*').eq('id', user.id).single(),
    // User accounts (checking, savings, etc.)
    sb.from('accounts').select('id, name, type, balance').eq('user_id', user.id),
    // Current debts
    sb.from('debts').select('*').eq('user_id', user.id).eq('is_active', true),
    // Savings goals
    sb.from('savings_goals').select('*').eq('user_id', user.id).eq('is_active', true),
    // Savings contributions last 3 months
    sb.from('savings_contributions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', threeMonthsAgoStr)
      .order('date', { ascending: false }),
    // Debt payments last 3 months
    sb.from('debt_payments')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', threeMonthsAgoStr)
      .order('date', { ascending: false }),
    // Bill payments (all time for consistency calc, but last 12 months is reasonable)
    sb.from('bill_payments')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: false })
      .limit(200),
    // Budgets for current month
    sb.from('budgets')
      .select('id, budgeted, category_id')
      .eq('user_id', user.id)
      .eq('month', monthStr),
    // Transactions for current month (for budget discipline + expenses)
    sb.from('transactions')
      .select('id, amount, category_id, date')
      .eq('user_id', user.id)
      .gte('date', threeMonthsAgoStr)
      .order('date', { ascending: false }),
    // Score history (last 30)
    sb.from('score_history')
      .select('*')
      .eq('user_id', user.id)
      .order('scored_at', { ascending: false })
      .limit(30),
    // Achievements
    sb.from('user_achievements')
      .select('*, achievement:achievement_definitions(*)')
      .eq('user_id', user.id),
    // Streaks
    sb.from('streaks')
      .select('*')
      .eq('user_id', user.id),
  ]);

  // Also fetch achievement definitions (for locked ones)
  const achievementDefsRes = await sb.from('achievement_definitions')
    .select('*')
    .order('sort_order');

  const accounts = accountsRes.data || [];
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
  // Priority: this month's income txns → 3-month avg txns → profile's monthly_income
  const profile = profileRes.data;
  const profileIncome = profile?.monthly_income || 0;

  const thisMonthTransactions = allTransactions.filter(
    (t: { date: string }) => t.date >= monthStr
  );
  const incomeThisMonth = thisMonthTransactions
    .filter((t: { amount: number }) => t.amount > 0)
    .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

  const totalIncome3Mo = allTransactions
    .filter((t: { amount: number }) => t.amount > 0)
    .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
  const avgIncome3Mo = totalIncome3Mo / 3;

  // Use transaction-based income if available, otherwise fall back to profile
  const monthlyIncome = incomeThisMonth > 0
    ? incomeThisMonth
    : avgIncome3Mo > 0
      ? avgIncome3Mo
      : profileIncome;

  // --- Calculate Monthly Expenses ---
  const totalExpenses3Mo = allTransactions
    .filter((t: { amount: number }) => t.amount < 0)
    .reduce((sum: number, t: { amount: number }) => sum + Math.abs(t.amount), 0);
  // If few transactions, estimate from debts + a reasonable baseline
  const txnBasedExpenses = totalExpenses3Mo / 3;
  const totalDebtPmts = debts.reduce((sum: number, d: { monthly_payment: number }) => sum + (d.monthly_payment || 0), 0);
  const monthlyExpenses = txnBasedExpenses > totalDebtPmts
    ? txnBasedExpenses
    : Math.max(totalDebtPmts, monthlyIncome * 0.6); // At least debt payments or 60% of income

  // --- Wealth Building Rate ---
  // Use monthly_contribution from savings goals (what user says they contribute)
  // PLUS actual contributions logged in last 3 months as a cross-check
  const goalContribByType: Record<string, number> = {};
  savingsGoals.forEach((g: { type: string; monthly_contribution: number }) => {
    const type = g.type || 'general';
    goalContribByType[type] = (goalContribByType[type] || 0) + (g.monthly_contribution || 0);
  });

  // Also factor in actual logged contributions (averaged over 3 months)
  const totalLoggedContrib = savingsContributions.reduce(
    (sum: number, c: { amount: number }) => sum + (c.amount || 0), 0
  );
  const monthlyAvgLoggedContrib = totalLoggedContrib / 3;

  // For each category, use the HIGHER of: goal's monthly_contribution or actual logged average
  // This way, if user set up goals but hasn't logged contributions yet, we still count it
  const cashSavings = Math.max(
    (goalContribByType['emergency'] || 0) + (goalContribByType['general'] || 0) + (goalContribByType['custom'] || 0),
    monthlyAvgLoggedContrib
  );
  const retirement401k = goalContribByType['retirement_401k'] || 0;
  const ira = goalContribByType['ira'] || 0;
  const investments = goalContribByType['brokerage'] || 0;
  const hsa = (goalContribByType['hsa'] || 0) + (goalContribByType['education_529'] || 0);

  const totalExtraDebtPayments = debtPayments
    .filter((p: { is_extra: boolean }) => p.is_extra)
    .reduce((sum: number, p: { amount: number }) => sum + (p.amount || 0), 0);
  const monthlyAvgExtraDebt = totalExtraDebtPayments / 3;

  // --- Debt entries for scoring ---
  const currentDebtEntries = debts.map((d: { type: string; current_balance: number; monthly_payment: number; apr: number; in_collections: boolean }) => ({
    type: (DB_TO_SCORING_TYPE[d.type] || 'personal') as ScoringDebtType,
    balance: d.current_balance || 0,
    monthlyPayment: d.monthly_payment || 0,
    apr: d.apr || 0,
    inCollections: d.in_collections || false,
  }));

  // For 3-month-ago debt snapshot, we estimate from payments
  // Use current debts but add back the payments made in last 3 months
  const debtsThreeMonthsAgo = debts.map((d: { id: string; type: string; current_balance: number; monthly_payment: number; apr: number; in_collections: boolean }) => {
    const paymentsForDebt = debtPayments
      .filter((p: { debt_id: string }) => p.debt_id === d.id)
      .reduce((sum: number, p: { amount: number }) => sum + (p.amount || 0), 0);
    return {
      type: (DB_TO_SCORING_TYPE[d.type] || 'personal') as ScoringDebtType,
      balance: (d.current_balance || 0) + paymentsForDebt,
      monthlyPayment: d.monthly_payment || 0,
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

  // --- Emergency Buffer ---
  // Count liquid savings from TWO sources:
  // 1. Savings goals (emergency, general, custom, HSA)
  // 2. Accounts (checking, savings, money_market — not investment/retirement)
  const LIQUID_GOAL_TYPES = new Set(['emergency', 'general', 'custom', 'hsa']);
  const goalLiquid = savingsGoals
    .filter((g: { type: string }) => LIQUID_GOAL_TYPES.has(g.type))
    .reduce((sum: number, g: { current_amount: number }) => sum + (g.current_amount || 0), 0);

  const LIQUID_ACCOUNT_TYPES = new Set(['checking', 'savings', 'money_market', 'cash']);
  const accountLiquid = accounts
    .filter((a: { type: string }) => LIQUID_ACCOUNT_TYPES.has(a.type))
    .reduce((sum: number, a: { balance: number }) => sum + (a.balance || 0), 0);

  const liquidSavings = goalLiquid + accountLiquid;

  // --- Data maturity: how many months of transaction history? ---
  const oldestTransaction = allTransactions.length > 0
    ? allTransactions[allTransactions.length - 1]
    : null;
  let dataMonths = 1;
  if (oldestTransaction) {
    const oldest = new Date(oldestTransaction.date);
    const diffMs = now.getTime() - oldest.getTime();
    dataMonths = Math.max(1, Math.floor(diffMs / (30 * 24 * 60 * 60 * 1000)));
  }

  // --- Build Score Input ---
  const scoreInput: ScoreInput = {
    monthlyIncome,
    wealthContributions: {
      cashSavings,
      retirement401k,
      ira,
      investments,
      hsa,
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
    dataMonths,
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

  // --- Build Response ---
  const score = {
    total: result.total,
    level,
    levelTitle,
    trajectory: {
      score: result.pillarScores.trajectory.score,
      max: 400,
      wealthBuildingRate: {
        score: result.breakdown.wealthBuilding.score,
        max: 200,
        detail: result.breakdown.wealthBuilding.detail,
      },
      debtVelocity: {
        score: result.breakdown.debtVelocity.score,
        max: 200,
        detail: result.breakdown.debtVelocity.detail,
      },
    },
    behavior: {
      score: result.pillarScores.behavior.score,
      max: 350,
      paymentConsistency: {
        score: result.breakdown.paymentConsistency.score,
        max: 200,
        detail: result.breakdown.paymentConsistency.detail,
      },
      budgetDiscipline: {
        score: result.breakdown.budgetDiscipline.score,
        max: 150,
        detail: result.breakdown.budgetDiscipline.detail,
      },
    },
    position: {
      score: result.pillarScores.position.score,
      max: 250,
      emergencyBuffer: {
        score: result.breakdown.emergencyBuffer.score,
        max: 125,
        detail: result.breakdown.emergencyBuffer.detail,
      },
      debtToIncome: {
        score: result.breakdown.debtToIncome.score,
        max: 125,
        detail: result.breakdown.debtToIncome.detail,
      },
    },
    tips: result.tips,
    previousScore: (updatedHistory && updatedHistory.length > 1)
      ? updatedHistory[1].total_score
      : null,
  };

  return NextResponse.json({
    score,
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
