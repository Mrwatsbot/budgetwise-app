// Database types for Supabase

export type SubscriptionTier = 'free' | 'basic' | 'plus' | 'pro';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due';
export type AccountType = 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment';
export type CategoryType = 'expense' | 'income' | 'transfer';
export type MatchType = 'contains' | 'starts_with' | 'exact';

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
  month: string; // YYYY-MM-DD (first of month)
  budgeted: number;
  created_at: string;
  updated_at: string;
  // Computed/joined
  category?: Category;
  spent?: number;
}

export type SavingsGoalType = 'emergency' | 'general' | 'retirement_401k' | 'ira' | 'hsa' | 'education_529' | 'brokerage' | 'custom';

export const SAVINGS_GOAL_TYPE_META: Record<SavingsGoalType, { icon: string; label: string }> = {
  emergency: { icon: '🛡️', label: 'Emergency Fund' },
  general: { icon: '💰', label: 'General Savings' },
  retirement_401k: { icon: '📊', label: '401(k)/403(b)' },
  ira: { icon: '📈', label: 'IRA' },
  hsa: { icon: '🏥', label: 'Health Savings' },
  education_529: { icon: '🎓', label: '529 Plan' },
  brokerage: { icon: '📉', label: 'Investments' },
  custom: { icon: '⭐', label: 'Custom Goal' },
};

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
}

export interface SavingsContribution {
  id: string;
  user_id: string;
  savings_goal_id: string;
  amount: number;
  date: string;
  created_at: string;
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

// Supabase database type helper
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      accounts: {
        Row: Account;
        Insert: Omit<Account, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Account, 'id' | 'user_id' | 'created_at'>>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id' | 'created_at'>;
        Update: Partial<Omit<Category, 'id' | 'created_at'>>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Transaction, 'id' | 'user_id' | 'created_at'>>;
      };
      budgets: {
        Row: Budget;
        Insert: Omit<Budget, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Budget, 'id' | 'user_id' | 'created_at'>>;
      };
      payee_rules: {
        Row: PayeeRule;
        Insert: Omit<PayeeRule, 'id' | 'created_at'>;
        Update: Partial<Omit<PayeeRule, 'id' | 'user_id' | 'created_at'>>;
      };
      ai_usage: {
        Row: AIUsage;
        Insert: Omit<AIUsage, 'id' | 'created_at'>;
        Update: never;
      };
      savings_goals: {
        Row: SavingsGoal;
        Insert: Omit<SavingsGoal, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<SavingsGoal, 'id' | 'user_id' | 'created_at'>>;
      };
      savings_contributions: {
        Row: SavingsContribution;
        Insert: Omit<SavingsContribution, 'id' | 'created_at'>;
        Update: Partial<Omit<SavingsContribution, 'id' | 'user_id' | 'created_at'>>;
      };
    };
  };
}
