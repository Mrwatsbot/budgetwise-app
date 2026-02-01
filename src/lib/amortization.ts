/**
 * Amortization calculation utilities for debt tracking
 * Compares actual debt balance vs expected amortization schedule position
 */

export interface AmortizationPoint {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface AmortizationHealth {
  monthsElapsed: number;
  expectedBalance: number;
  actualBalance: number;
  difference: number; // positive = ahead, negative = behind
  monthsAhead: number; // positive = ahead of schedule, negative = behind
  status: 'ahead' | 'on_track' | 'behind';
  percentAhead: number; // percentage ahead/behind
  expectedPayoffDate: Date;
  projectedPayoffDate: Date | null;
}

/**
 * Generate a full amortization schedule for a loan
 */
export function generateSchedule(
  principal: number,
  annualRate: number,
  termMonths: number
): AmortizationPoint[] {
  if (principal <= 0 || termMonths <= 0) return [];
  
  const monthlyRate = annualRate / 12 / 100;
  const schedule: AmortizationPoint[] = [];
  
  // Calculate monthly payment: P * [r(1+r)^n] / [(1+r)^n - 1]
  let monthlyPayment: number;
  if (monthlyRate === 0) {
    monthlyPayment = principal / termMonths;
  } else {
    const rPlusOne = 1 + monthlyRate;
    const rPlusOneToN = Math.pow(rPlusOne, termMonths);
    monthlyPayment = principal * (monthlyRate * rPlusOneToN) / (rPlusOneToN - 1);
  }
  
  let balance = principal;
  
  for (let month = 1; month <= termMonths; month++) {
    const interest = balance * monthlyRate;
    const principal = Math.min(monthlyPayment - interest, balance);
    balance = Math.max(0, balance - principal);
    
    schedule.push({
      month,
      payment: monthlyPayment,
      principal,
      interest,
      balance,
    });
    
    if (balance === 0) break;
  }
  
  return schedule;
}

/**
 * Get expected balance at a specific month in the amortization schedule
 */
export function getExpectedBalance(
  principal: number,
  annualRate: number,
  termMonths: number,
  monthNumber: number
): number {
  if (principal <= 0 || termMonths <= 0 || monthNumber < 0) return principal;
  if (monthNumber >= termMonths) return 0;
  if (monthNumber === 0) return principal;
  
  const monthlyRate = annualRate / 12 / 100;
  
  // Expected balance at month m: P * [(1+r)^n - (1+r)^m] / [(1+r)^n - 1]
  if (monthlyRate === 0) {
    return Math.max(0, principal - (principal / termMonths) * monthNumber);
  }
  
  const rPlusOne = 1 + monthlyRate;
  const rPlusOneToN = Math.pow(rPlusOne, termMonths);
  const rPlusOneToM = Math.pow(rPlusOne, monthNumber);
  
  const expectedBalance = principal * (rPlusOneToN - rPlusOneToM) / (rPlusOneToN - 1);
  
  return Math.max(0, expectedBalance);
}

/**
 * Calculate how many months ahead or behind schedule a debt is
 */
export function getAmortizationHealth(debt: {
  original_balance: number;
  current_balance: number;
  apr: number;
  term_months: number;
  origination_date: string;
}): AmortizationHealth | null {
  const { original_balance, current_balance, apr, term_months, origination_date } = debt;
  
  // Validate required data
  if (!original_balance || !term_months || !origination_date || original_balance <= 0 || term_months <= 0) {
    return null;
  }
  
  // Calculate months elapsed since origination
  const originDate = new Date(origination_date + 'T00:00:00');
  const now = new Date();
  const monthsElapsed = Math.max(0, 
    (now.getFullYear() - originDate.getFullYear()) * 12 + 
    (now.getMonth() - originDate.getMonth())
  );
  
  // Can't be ahead of schedule if we haven't started yet
  if (monthsElapsed < 0) return null;
  
  // Get expected balance at current month
  const expectedBalance = getExpectedBalance(original_balance, apr, term_months, monthsElapsed);
  const actualBalance = current_balance;
  const difference = expectedBalance - actualBalance; // positive = ahead
  
  // Calculate how many months ahead/behind
  // Find the month in the schedule that matches the current balance
  let monthsAhead = 0;
  if (difference !== 0) {
    // Binary search to find the month that matches current balance
    let low = 0;
    let high = term_months;
    
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const balanceAtMid = getExpectedBalance(original_balance, apr, term_months, mid);
      
      if (Math.abs(balanceAtMid - actualBalance) < 0.01) {
        monthsAhead = mid - monthsElapsed;
        break;
      } else if (balanceAtMid > actualBalance) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    
    if (monthsAhead === 0) {
      monthsAhead = low - monthsElapsed;
    }
  }
  
  // Determine status (within 2% = on track)
  const percentDiff = expectedBalance > 0 ? (difference / expectedBalance) * 100 : 0;
  let status: 'ahead' | 'on_track' | 'behind';
  if (Math.abs(percentDiff) <= 2) {
    status = 'on_track';
  } else if (difference > 0) {
    status = 'ahead';
  } else {
    status = 'behind';
  }
  
  // Calculate expected payoff date (original schedule)
  const expectedPayoffDate = new Date(originDate);
  expectedPayoffDate.setMonth(expectedPayoffDate.getMonth() + term_months);
  
  // Calculate projected actual payoff date based on current position
  let projectedPayoffDate: Date | null = null;
  if (monthsAhead !== 0) {
    projectedPayoffDate = new Date(expectedPayoffDate);
    projectedPayoffDate.setMonth(projectedPayoffDate.getMonth() - monthsAhead);
  } else {
    projectedPayoffDate = new Date(expectedPayoffDate);
  }
  
  return {
    monthsElapsed,
    expectedBalance,
    actualBalance,
    difference,
    monthsAhead,
    status,
    percentAhead: percentDiff,
    expectedPayoffDate,
    projectedPayoffDate,
  };
}
