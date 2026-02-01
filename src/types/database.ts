// Database types for Supabase

// ============================================================
// ENUMS
// ============================================================

export type SubscriptionTier = 'free' | 'plus' | 'pro';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due';
export type AccountType = 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment';
export type CategoryType = 'expense' | 'income' | 'transfer';
export type MatchType = 'contains' | 'starts_with' | 'exact';

export type DebtType = 
  | 'credit_card'
  | 'cc_paid_monthly'
  | 'mortgage'
  | 'heloc'
  | 'auto'
  | 'student'
  | 'personal'
  | 'medical'
  | 'business'
  | 'payday'
  | 'bnpl'
  | 'zero_pct'
  | 'secured'
  | 'other';

export type SavingsGoalType = 
  | 'emergency'
  | 'general'
  | 'retirement_401k'
  | 'ira'
  | 'hsa'
  | 'education_529'
  | 'brokerage'
  | 'custom';

export type BillFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
export type BillPaymentStatus = 'on_time' | 'late_1_30' | 'late_31_60' | 'late_61_plus' | 'missed';
export type StreakType = 'payment' | 'budget' | 'savings' | 'logging';
export type AchievementCategory = 'beginner' | 'progress' | 'achievement' | 'elite' | 'secret';
export type ChallengeType = 'weekly' | 'monthly' | 'community';
export type ChallengeStatus = 'active' | 'completed' | 'failed' | 'expired';

// ============================================================
// CORE TABLES
// ============================================================

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
  monthly_income: number;
  openrouter_api_key: string | null;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  is_active: boolean;
  plaid_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  type: CategoryType;
  is_system: boolean;
  sort_order: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  amount: number;
  payee_original: string | null;
  payee_clean: string | null;
  memo: string | null;
  date: string;
  is_cleared: boolean;
  is_reconciled: boolean;
  ai_categorized: boolean;
  ai_confidence: number | null;
  plaid_transaction_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  category?: Category;
  account?: Account;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  month: string;
  budgeted: number;
  created_at: string;
  updated_at: string;
  // Computed/joined
  category?: Category;
  spent?: number;
}

export interface PayeeRule {
  id: string;
  user_id: string;
  match_pattern: string;
  match_type: MatchType;
  rename_to: string | null;
  category_id: string | null;
  created_at: string;
}

export interface AIUsage {
  id: string;
  user_id: string;
  feature: string;
  tokens_input: number;
  tokens_output: number;
  created_at: string;
}

// ============================================================
// FINANCIAL TRACKING (Migration 001)
// ============================================================

export interface Debt {
  id: string;
  user_id: string;
  name: string;
  type: DebtType;
  original_balance: number | null;
  current_balance: number;
  apr: number;
  minimum_payment: number;
  monthly_payment: number;
  due_day: number | null;
  in_collections: boolean;
  is_paid_off: boolean;
  paid_off_date: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  origination_date: string | null;
  term_months: number | null;
  // Computed
  debt_payments?: DebtPayment[];
}

export interface DebtPayment {
  id: string;
  user_id: string;
  debt_id: string;
  amount: number;
  date: string;
  is_extra: boolean;
  balance_after: number | null;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  type: SavingsGoalType;
  target_amount: number | null;
  current_amount: number;
  monthly_contribution: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed
  contributions?: SavingsContribution[];
}

export interface SavingsContribution {
  id: string;
  user_id: string;
  savings_goal_id: string;
  amount: number;
  date: string;
  created_at: string;
}

export interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_day: number | null;
  frequency: BillFrequency;
  category_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  category?: Category;
  payments?: BillPayment[];
}

export interface BillPayment {
  id: string;
  user_id: string;
  bill_id: string;
  amount_paid: number;
  due_date: string;
  paid_date: string;
  status: BillPaymentStatus;
  created_at: string;
}

// ============================================================
// GAMIFICATION (Migration 001)
// ============================================================

export interface ScoreHistory {
  id: string;
  user_id: string;
  total_score: number;
  level: number;
  trajectory_score: number;
  behavior_score: number;
  position_score: number;
  wealth_building_rate: number | null;
  debt_velocity: number | null;
  payment_consistency: number | null;
  budget_discipline: number | null;
  emergency_buffer: number | null;
  debt_to_income: number | null;
  bonus_points: number;
  scored_at: string;
  created_at: string;
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  requirement_type: string;
  requirement_value: Record<string, unknown>;
  sort_order: number;
  is_secret: boolean;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  // Joined
  achievement?: AchievementDefinition;
}

export interface Streak {
  id: string;
  user_id: string;
  type: StreakType;
  current_count: number;
  longest_count: number;
  last_checked_at: string | null;
  freeze_available: boolean;
  freeze_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChallengeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: ChallengeType;
  reward_type: string;
  reward_value: number;
  requirement: Record<string, unknown>;
  created_at: string;
}

export interface UserChallenge {
  id: string;
  user_id: string;
  challenge_id: string;
  status: ChallengeStatus;
  started_at: string;
  completed_at: string | null;
  expires_at: string;
  progress: Record<string, unknown>;
  created_at: string;
  // Joined
  challenge?: ChallengeDefinition;
}

// ============================================================
// DISPLAY HELPERS
// ============================================================

/** Human-readable labels for debt types */
export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  credit_card: 'Credit Card',
  cc_paid_monthly: 'Credit Card (Paid Monthly)',
  mortgage: 'Mortgage',
  heloc: 'HELOC',
  auto: 'Auto Loan',
  student: 'Student Loan',
  personal: 'Personal Loan',
  medical: 'Medical Debt',
  business: 'Business Loan',
  payday: 'Payday Loan',
  bnpl: 'Buy Now Pay Later',
  zero_pct: '0% Financing',
  secured: 'Secured Debt',
  other: 'Other',
};

/** Human-readable labels for savings goal types */
export const SAVINGS_TYPE_LABELS: Record<SavingsGoalType, string> = {
  emergency: 'Emergency Fund',
  general: 'General Savings',
  retirement_401k: '401(k)/403(b)',
  ira: 'IRA',
  hsa: 'Health Savings (HSA)',
  education_529: '529 Plan',
  brokerage: 'Brokerage/Investments',
  custom: 'Custom Goal',
};

/** Score level definitions */
export const SCORE_LEVELS = [
  { min: 0, max: 199, level: 0, title: 'Starting Point' },
  { min: 200, max: 399, level: 1, title: 'Getting Started' },
  { min: 400, max: 599, level: 2, title: 'Foundation' },
  { min: 600, max: 749, level: 3, title: 'Solid Ground' },
  { min: 750, max: 899, level: 4, title: 'Wealth Builder' },
  { min: 900, max: 1000, level: 5, title: 'Financial Freedom' },
] as const;

export function getScoreLevel(score: number) {
  return SCORE_LEVELS.find(l => score >= l.min && score <= l.max) ?? SCORE_LEVELS[0];
}

// ============================================================
// SUPABASE TYPE HELPER
// ============================================================

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      accounts: { Row: Account; Insert: Partial<Account>; Update: Partial<Account> };
      categories: { Row: Category; Insert: Partial<Category>; Update: Partial<Category> };
      transactions: { Row: Transaction; Insert: Partial<Transaction>; Update: Partial<Transaction> };
      budgets: { Row: Budget; Insert: Partial<Budget>; Update: Partial<Budget> };
      payee_rules: { Row: PayeeRule; Insert: Partial<PayeeRule>; Update: Partial<PayeeRule> };
      ai_usage: { Row: AIUsage; Insert: Partial<AIUsage>; Update: never };
      debts: { Row: Debt; Insert: Partial<Debt>; Update: Partial<Debt> };
      debt_payments: { Row: DebtPayment; Insert: Partial<DebtPayment>; Update: Partial<DebtPayment> };
      savings_goals: { Row: SavingsGoal; Insert: Partial<SavingsGoal>; Update: Partial<SavingsGoal> };
      savings_contributions: { Row: SavingsContribution; Insert: Partial<SavingsContribution>; Update: Partial<SavingsContribution> };
      bills: { Row: Bill; Insert: Partial<Bill>; Update: Partial<Bill> };
      bill_payments: { Row: BillPayment; Insert: Partial<BillPayment>; Update: Partial<BillPayment> };
      score_history: { Row: ScoreHistory; Insert: Partial<ScoreHistory>; Update: Partial<ScoreHistory> };
      achievement_definitions: { Row: AchievementDefinition; Insert: Partial<AchievementDefinition>; Update: Partial<AchievementDefinition> };
      user_achievements: { Row: UserAchievement; Insert: Partial<UserAchievement>; Update: never };
      streaks: { Row: Streak; Insert: Partial<Streak>; Update: Partial<Streak> };
      challenge_definitions: { Row: ChallengeDefinition; Insert: Partial<ChallengeDefinition>; Update: Partial<ChallengeDefinition> };
      user_challenges: { Row: UserChallenge; Insert: Partial<UserChallenge>; Update: Partial<UserChallenge> };
    };
  };
}
