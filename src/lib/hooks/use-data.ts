import useSWR, { mutate } from 'swr';

// Global fetcher — all SWR hooks use this
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 401) {
      // Redirect to login on auth failure
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
};

// SWR config: cache aggressively, revalidate in background
const SWR_CONFIG = {
  revalidateOnFocus: true,       // Refresh when user comes back to tab
  revalidateOnReconnect: true,   // Refresh on network reconnect
  dedupingInterval: 5000,        // Dedup requests within 5s
  errorRetryCount: 3,
};

// ============================================================
// HOOKS
// ============================================================

export function useSettings() {
  const { data, error, isLoading, mutate: refresh } = useSWR('/api/settings', fetcher, SWR_CONFIG);
  return {
    profile: data?.profile || null,
    accounts: data?.accounts || [],
    error,
    isLoading,
    refresh,
  };
}

export function useDashboard() {
  const monthStr = getLocalMonthStr();
  const { data, error, isLoading, mutate: refresh } = useSWR(`/api/dashboard?month=${monthStr}`, fetcher, SWR_CONFIG);
  return { data, error, isLoading, refresh };
}

export function useDebts() {
  const { data, error, isLoading, mutate: refresh } = useSWR('/api/debts', fetcher, SWR_CONFIG);
  return {
    debts: data || [],
    error,
    isLoading,
    refresh,
  };
}

export function useTransactions() {
  const { data, error, isLoading, mutate: refresh } = useSWR('/api/transactions', fetcher, SWR_CONFIG);
  return {
    transactions: data?.transactions || [],
    categories: data?.categories || [],
    accounts: data?.accounts || [],
    user: data?.user,
    error,
    isLoading,
    refresh,
  };
}

export function usePlaidStatus() {
  const { data, error, isLoading, mutate: refresh } = useSWR('/api/plaid/status', fetcher, {
    ...SWR_CONFIG,
    refreshInterval: 60000, // Refresh every minute to catch status changes
  });
  return {
    connections: data?.connections || [],
    hasIssues: data?.hasIssues || false,
    error,
    isLoading,
    refresh,
  };
}

// Helper: get current month string in user's local timezone (YYYY-MM-DD)
function getLocalMonthStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

export function useBudgets() {
  const monthStr = getLocalMonthStr();
  const { data, error, isLoading, mutate: refresh } = useSWR(`/api/budgets?month=${monthStr}`, fetcher, SWR_CONFIG);
  return {
    budgets: data?.budgets || [],
    categories: data?.categories || [],
    spentByCategory: data?.spentByCategory || {},
    monthlyIncome: data?.monthlyIncome || 0,
    totalSavingsTarget: data?.totalSavingsTarget || 0,
    payFrequency: data?.payFrequency || 'monthly',
    nextPayDate: data?.nextPayDate || null,
    user: data?.user,
    error,
    isLoading,
    refresh,
  };
}

export function useScore() {
  const { data, error, isLoading, mutate: refresh } = useSWR('/api/score', fetcher, SWR_CONFIG);
  return {
    score: data?.score || null,
    history: data?.history || [],
    achievements: data?.achievements || [],
    achievementDefinitions: data?.achievementDefinitions || [],
    streaks: data?.streaks || [],
    user: data?.user,
    error,
    isLoading,
    refresh,
  };
}

export function useSavings() {
  const { data, error, isLoading, mutate: refresh } = useSWR('/api/savings', fetcher, SWR_CONFIG);
  return {
    goals: data?.goals || [],
    user: data?.user,
    error,
    isLoading,
    refresh,
  };
}

// ============================================================
// PREFETCH — warm SWR cache for all main pages on initial load
// ============================================================

/**
 * Prefetch all core API routes into the SWR cache.
 * Call once when the app shell mounts so navigating between
 * pages hits warm cache instead of showing skeletons.
 */
export function prefetchAllData() {
  const monthStr = getLocalMonthStr();

  // These fire in parallel. SWR's mutate() with a fetcher
  // populates the cache without needing a mounted hook.
  const endpoints = [
    `/api/dashboard?month=${monthStr}`,
    '/api/transactions',
    `/api/budgets?month=${monthStr}`,
    '/api/debts',
    '/api/score',
    '/api/savings',
    '/api/settings',
  ];

  endpoints.forEach((url) => {
    // Only prefetch if not already in cache
    mutate(url, fetcher(url), { revalidate: false });
  });
}

// ============================================================
// GLOBAL REVALIDATION
// ============================================================

/** Revalidate parameterized caches (includes month param) */
function revalidateBudgets() {
  mutate((key: string) => typeof key === 'string' && key.startsWith('/api/budgets'), undefined, { revalidate: true });
}

function revalidateDashboard() {
  mutate((key: string) => typeof key === 'string' && key.startsWith('/api/dashboard'), undefined, { revalidate: true });
}

/**
 * Revalidate all data caches that depend on transactions.
 * Call this after any transaction is created/modified/deleted.
 */
export function revalidateAll() {
  revalidateDashboard();
  revalidateBudgets();
  mutate('/api/transactions');
  mutate('/api/score');
  mutate('/api/savings');
}

// ============================================================
// MUTATIONS
// ============================================================

export async function addDebt(debtData: Record<string, unknown>) {
  const res = await fetch('/api/debts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(debtData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to add debt');
  }
  mutate('/api/debts');
  revalidateAll();
  return res.json();
}

export async function deleteDebt(id: string) {
  await fetch('/api/debts', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  mutate('/api/debts');
  revalidateAll();
}

export async function logDebtPayment(paymentData: {
  debt_id: string;
  amount: number;
  date: string;
  is_extra: boolean;
  balance_after: number;
  is_paid_off: boolean;
}) {
  const res = await fetch('/api/debts/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to log payment');
  }
  mutate('/api/debts');
  revalidateAll();
}

// ============================================================
// SAVINGS MUTATIONS
// ============================================================

export async function addSavingsGoal(goalData: Record<string, unknown>) {
  const res = await fetch('/api/savings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(goalData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to add savings goal');
  }
  mutate('/api/savings');
  revalidateAll();
  return res.json();
}

export async function updateSavingsGoal(goalData: Record<string, unknown>) {
  const res = await fetch('/api/savings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(goalData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update savings goal');
  }
  mutate('/api/savings');
  revalidateAll();
  return res.json();
}

export async function deleteSavingsGoal(id: string) {
  await fetch('/api/savings', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  mutate('/api/savings');
  revalidateAll();
}

export async function logSavingsContribution(data: {
  savings_goal_id: string;
  amount: number;
  date: string;
}) {
  const res = await fetch('/api/savings/contribute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to log contribution');
  }
  mutate('/api/savings');
  revalidateAll();
  return res.json();
}

// ============================================================
// AI INSIGHTS
// ============================================================

export function usePageInsights(page: string) {
  const { data, error, isLoading, mutate: refresh } = useSWR(
    page ? `/api/ai/insights?page=${page}` : null,
    fetcher,
    {
      ...SWR_CONFIG,
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 min dedup — insights don't change often
    }
  );
  return {
    insights: data?.insights || null,
    generatedAt: data?.generated_at || null,
    stale: data?.stale || false,
    error,
    isLoading,
    refresh,
  };
}

export async function generateInsights(page: string, data?: Record<string, unknown>) {
  const res = await fetch('/api/ai/insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page, data }),
  });
  if (!res.ok) {
    const err = await res.json();
    if (res.status === 429) {
      throw new Error(`429: ${err.message || 'Rate limit exceeded'}`);
    }
    throw new Error(err.error || 'Failed to generate insights');
  }
  mutate(`/api/ai/insights?page=${page}`);
  mutate('/api/ai/limits');
  return res.json();
}

export async function requestCoaching(type: string) {
  const res = await fetch('/api/ai/coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
  });
  if (!res.ok) {
    const err = await res.json();
    if (res.status === 429) {
      throw new Error(`429: ${err.message || 'Rate limit exceeded'}`);
    }
    throw new Error(err.error || 'Failed to get coaching');
  }
  mutate('/api/ai/limits');
  return res.json();
}

export async function requestPayoffPlan() {
  const res = await fetch('/api/ai/payoff-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json();
    if (res.status === 429) {
      throw new Error(`429: ${err.message || 'Rate limit exceeded'}`);
    }
    throw new Error(err.error || 'Failed to generate payoff plan');
  }
  mutate('/api/ai/limits');
  return res.json();
}

// ============================================================
// AUTO BUDGET
// ============================================================

export async function requestAutoBudget(profile: {
  monthly_income: number;
  fixed_expenses: Record<string, number>;
  has_debts: boolean;
  savings_priority: string;
  lifestyle_notes?: string;
  savings_goals?: any[];
  emergency_fund_status?: string;
  current_savings_contribution?: number;
  other_savings_goal?: string;
}) {
  const res = await fetch('/api/ai/auto-budget', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    const err = await res.json();
    if (res.status === 429) {
      throw new Error(`429: ${err.message || 'Rate limit exceeded'}`);
    }
    throw new Error(err.error || 'Failed to generate auto budget');
  }
  mutate('/api/ai/limits');
  return res.json();
}

export async function requestBudgetTune() {
  const res = await fetch('/api/ai/budget-tune', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json();
    if (res.status === 429) {
      throw new Error(`429: ${err.message || 'Rate limit exceeded'}`);
    }
    throw new Error(err.error || 'Failed to generate budget tune-up');
  }
  mutate('/api/ai/limits');
  return res.json();
}

export async function applyAutoBudget(
  allocations: { category_id: string | null; category_name?: string; amount: number }[],
  month: string,
  savingsGoalAllocations?: { goal_id: string; monthly_contribution: number }[]
) {
  const res = await fetch('/api/ai/auto-budget', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ allocations, month, savings_goal_allocations: savingsGoalAllocations }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to apply budget');
  }
  const data = await res.json();
  
  // Check if any budgets were actually written
  if (data.budgets_written === 0 && (data.savings_updated || 0) === 0) {
    const debugInfo = data.debug ? ` (received: ${data.debug.received}, categories: ${data.debug.validCategories})` : '';
    const skipInfo = data.skipped ? ` Skipped: ${data.skipped.join(', ')}` : '';
    const errInfo = data.errors ? ` Errors: ${data.errors.join('; ')}` : '';
    throw new Error(`No budgets were saved.${debugInfo}${skipInfo}${errInfo}`);
  }
  
  revalidateBudgets();
  mutate('/api/savings');
  revalidateAll();
  return data;
}

// ============================================================
// AFFORDABILITY CHECK
// ============================================================

export async function checkAffordability(data: {
  item_description: string;
  category: string;
  price: number;
  payment_type: string;
  finance_monthly?: number;
  finance_term_months?: number;
  finance_apr?: number;
}) {
  const res = await fetch('/api/ai/afford', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    if (res.status === 429) {
      throw new Error(`429: ${err.message || 'Rate limit exceeded'}`);
    }
    throw new Error(err.error || 'Failed to check affordability');
  }
  mutate('/api/ai/limits');
  return res.json();
}

// ============================================================
// AI LIMITS
// ============================================================

export function useAILimits() {
  const { data, error, isLoading, mutate: refresh } = useSWR('/api/ai/limits', fetcher, {
    ...SWR_CONFIG,
    dedupingInterval: 30000,
  });
  return {
    tier: data?.tier || 'free',
    hasByok: data?.hasByok || false,
    features: data?.features || {},
    error,
    isLoading,
    refresh,
  };
}

// ============================================================
// SETTINGS MUTATIONS
// ============================================================

export async function updateSettings(data: Record<string, unknown>) {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update settings');
  }
  mutate('/api/settings');
  revalidateDashboard();
  return res.json();
}

// ============================================================
// ACCOUNT MUTATIONS
// ============================================================

export async function addAccount(accountData: Record<string, unknown>) {
  const res = await fetch('/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accountData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to add account');
  }
  mutate('/api/accounts');
  mutate('/api/settings');
  revalidateDashboard();
  return res.json();
}

export async function updateAccount(accountData: Record<string, unknown>) {
  const res = await fetch('/api/accounts', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accountData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update account');
  }
  mutate('/api/accounts');
  mutate('/api/settings');
  revalidateDashboard();
  return res.json();
}

export async function deleteAccount(id: string) {
  const res = await fetch('/api/accounts', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete account');
  }
  mutate('/api/accounts');
  mutate('/api/settings');
  revalidateDashboard();
}

// Revalidate all data
export function refreshAll() {
  revalidateDashboard();
  mutate('/api/debts');
  mutate('/api/transactions');
  revalidateBudgets();
  mutate('/api/savings');
  mutate('/api/ai/limits');
}

// ============================================================
// PLAID CONNECTIONS
// ============================================================

export function usePlaidConnections() {
  const { data, error, isLoading, mutate: refresh } = useSWR('/api/plaid/connections', fetcher, SWR_CONFIG);
  return {
    connections: data?.connections || [],
    error,
    isLoading,
    refresh,
  };
}

// ============================================================
// MONTH IN REVIEW
// ============================================================

// Helper: get previous month string in user's local timezone (YYYY-MM-DD)
function getPreviousMonthStr() {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const y = prevMonth.getFullYear();
  const m = String(prevMonth.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

export function useMonthReview(month?: string) {
  const monthStr = month || getPreviousMonthStr();
  const { data, error, isLoading, mutate: refresh } = useSWR(
    `/api/month-review?month=${monthStr}`,
    fetcher,
    {
      ...SWR_CONFIG,
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 min - month reviews don't change often
    }
  );
  return {
    data,
    error,
    isLoading,
    refresh,
  };
}
