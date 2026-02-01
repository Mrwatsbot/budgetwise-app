-- =============================================
-- MIGRATION 001: BudgetWise Pivot
-- New tables for debts, savings, achievements, streaks, score history
-- Run AFTER the base schema (supabase-schema.sql)
-- =============================================

-- =============================================
-- UPDATE PROFILES — Fix tier options
-- =============================================
alter table public.profiles 
  drop constraint if exists profiles_subscription_tier_check;
alter table public.profiles
  add constraint profiles_subscription_tier_check 
  check (subscription_tier in ('free', 'plus', 'pro'));

-- Update any existing 'basic' tier users to 'free'
update public.profiles set subscription_tier = 'free' where subscription_tier = 'basic';

-- =============================================
-- DEBTS TABLE
-- =============================================
create table public.debts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  
  -- Core info
  name text not null,                    -- "Chase Visa", "Student Loan", "Car Payment"
  type text not null check (type in (
    'credit_card',      -- Revolving credit card (carried balance)
    'cc_paid_monthly',  -- Credit card paid in full each month
    'mortgage',         -- Mortgage
    'heloc',            -- Home equity line of credit
    'auto',             -- Auto loan
    'student',          -- Student loans
    'personal',         -- Personal/unsecured loan
    'medical',          -- Medical debt
    'business',         -- Business loan
    'payday',           -- Payday/title loans
    'bnpl',             -- Buy Now Pay Later
    'zero_pct',         -- 0% promotional financing
    'secured',          -- Debt secured by liquid assets
    'other'             -- Catch-all
  )),
  
  -- Financial details
  original_balance decimal(12,2),        -- What it started at
  current_balance decimal(12,2) not null, -- What's owed now
  apr decimal(5,2) default 0,            -- Annual percentage rate
  minimum_payment decimal(12,2) default 0,
  monthly_payment decimal(12,2) default 0, -- What user actually pays
  
  -- Tracking
  due_day int check (due_day >= 1 and due_day <= 31), -- Day of month payment is due
  in_collections boolean default false,
  is_paid_off boolean default false,
  paid_off_date date,
  
  -- Metadata
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.debts enable row level security;

create policy "Users can view own debts"
  on public.debts for select using (auth.uid() = user_id);
create policy "Users can insert own debts"
  on public.debts for insert with check (auth.uid() = user_id);
create policy "Users can update own debts"
  on public.debts for update using (auth.uid() = user_id);
create policy "Users can delete own debts"
  on public.debts for delete using (auth.uid() = user_id);

create index debts_user_id on public.debts(user_id);

-- =============================================
-- DEBT PAYMENTS TABLE (track each payment)
-- =============================================
create table public.debt_payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  debt_id uuid references public.debts on delete cascade not null,
  
  amount decimal(12,2) not null,
  date date not null,
  is_extra boolean default false,        -- Above minimum = extra payment
  balance_after decimal(12,2),           -- Balance after this payment
  
  created_at timestamptz default now()
);

alter table public.debt_payments enable row level security;

create policy "Users can view own debt payments"
  on public.debt_payments for select using (auth.uid() = user_id);
create policy "Users can insert own debt payments"
  on public.debt_payments for insert with check (auth.uid() = user_id);
create policy "Users can update own debt payments"
  on public.debt_payments for update using (auth.uid() = user_id);
create policy "Users can delete own debt payments"
  on public.debt_payments for delete using (auth.uid() = user_id);

create index debt_payments_user_date on public.debt_payments(user_id, date desc);
create index debt_payments_debt_id on public.debt_payments(debt_id, date desc);

-- =============================================
-- SAVINGS GOALS TABLE
-- =============================================
create table public.savings_goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  
  name text not null,                    -- "Emergency Fund", "Vacation", "New Car"
  type text not null check (type in (
    'emergency',        -- Emergency fund
    'general',          -- General savings
    'retirement_401k',  -- 401k/403b
    'ira',              -- Traditional/Roth IRA
    'hsa',              -- Health Savings Account
    'education_529',    -- 529 plan
    'brokerage',        -- Investment/brokerage account
    'custom'            -- User-defined goal
  )),
  
  target_amount decimal(12,2),           -- Goal amount (null = ongoing)
  current_amount decimal(12,2) default 0,
  monthly_contribution decimal(12,2) default 0, -- Planned monthly contribution
  
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.savings_goals enable row level security;

create policy "Users can view own savings goals"
  on public.savings_goals for select using (auth.uid() = user_id);
create policy "Users can insert own savings goals"
  on public.savings_goals for insert with check (auth.uid() = user_id);
create policy "Users can update own savings goals"
  on public.savings_goals for update using (auth.uid() = user_id);
create policy "Users can delete own savings goals"
  on public.savings_goals for delete using (auth.uid() = user_id);

create index savings_goals_user_id on public.savings_goals(user_id);

-- =============================================
-- SAVINGS CONTRIBUTIONS TABLE
-- =============================================
create table public.savings_contributions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  savings_goal_id uuid references public.savings_goals on delete cascade not null,
  
  amount decimal(12,2) not null,
  date date not null,
  
  created_at timestamptz default now()
);

alter table public.savings_contributions enable row level security;

create policy "Users can view own savings contributions"
  on public.savings_contributions for select using (auth.uid() = user_id);
create policy "Users can insert own savings contributions"
  on public.savings_contributions for insert with check (auth.uid() = user_id);
create policy "Users can update own savings contributions"
  on public.savings_contributions for update using (auth.uid() = user_id);
create policy "Users can delete own savings contributions"
  on public.savings_contributions for delete using (auth.uid() = user_id);

create index savings_contributions_user_date on public.savings_contributions(user_id, date desc);

-- =============================================
-- BILLS TABLE (recurring bills for payment tracking)
-- =============================================
create table public.bills (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  
  name text not null,                    -- "Rent", "Electric", "Netflix"
  amount decimal(12,2) not null,         -- Expected amount
  due_day int check (due_day >= 1 and due_day <= 31),
  frequency text default 'monthly' check (frequency in ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  category_id uuid references public.categories on delete set null,
  
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.bills enable row level security;

create policy "Users can view own bills"
  on public.bills for select using (auth.uid() = user_id);
create policy "Users can insert own bills"
  on public.bills for insert with check (auth.uid() = user_id);
create policy "Users can update own bills"
  on public.bills for update using (auth.uid() = user_id);
create policy "Users can delete own bills"
  on public.bills for delete using (auth.uid() = user_id);

-- =============================================
-- BILL PAYMENTS TABLE (track on-time/late)
-- =============================================
create table public.bill_payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  bill_id uuid references public.bills on delete cascade not null,
  
  amount_paid decimal(12,2) not null,
  due_date date not null,
  paid_date date not null,
  status text not null check (status in ('on_time', 'late_1_30', 'late_31_60', 'late_61_plus', 'missed')),
  
  created_at timestamptz default now()
);

alter table public.bill_payments enable row level security;

create policy "Users can view own bill payments"
  on public.bill_payments for select using (auth.uid() = user_id);
create policy "Users can insert own bill payments"
  on public.bill_payments for insert with check (auth.uid() = user_id);
create policy "Users can update own bill payments"
  on public.bill_payments for update using (auth.uid() = user_id);
create policy "Users can delete own bill payments"
  on public.bill_payments for delete using (auth.uid() = user_id);

create index bill_payments_user_date on public.bill_payments(user_id, due_date desc);

-- =============================================
-- SCORE HISTORY TABLE
-- =============================================
create table public.score_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  
  -- Total
  total_score int not null check (total_score >= 0 and total_score <= 1000),
  level int not null check (level >= 0 and level <= 5),
  
  -- Pillar scores
  trajectory_score int not null,         -- 0-400
  behavior_score int not null,           -- 0-350
  position_score int not null,           -- 0-250
  
  -- Sub-scores (for detailed breakdown)
  wealth_building_rate int,              -- 0-200
  debt_velocity int,                     -- 0-200
  payment_consistency int,               -- 0-200
  budget_discipline int,                 -- 0-150
  emergency_buffer int,                  -- 0-125
  debt_to_income int,                    -- 0-125
  
  -- Bonus from challenges
  bonus_points int default 0,
  
  -- Snapshot date
  scored_at date not null,
  
  created_at timestamptz default now()
);

alter table public.score_history enable row level security;

create policy "Users can view own score history"
  on public.score_history for select using (auth.uid() = user_id);
create policy "Users can insert own score history"
  on public.score_history for insert with check (auth.uid() = user_id);

create index score_history_user_date on public.score_history(user_id, scored_at desc);
-- Only one score per day per user
create unique index score_history_unique_day on public.score_history(user_id, scored_at);

-- =============================================
-- ACHIEVEMENTS TABLE (definitions)
-- =============================================
create table public.achievement_definitions (
  id text primary key,                   -- 'first_steps', 'debt_slayer', etc.
  name text not null,
  description text not null,
  icon text not null,                    -- Emoji
  category text not null check (category in ('beginner', 'progress', 'achievement', 'elite', 'secret')),
  requirement_type text not null,        -- 'transaction_count', 'debt_payoff', 'streak', 'score', etc.
  requirement_value jsonb not null,      -- {"count": 100} or {"score": 700} etc.
  sort_order int default 0,
  is_secret boolean default false,       -- Hidden until earned
  created_at timestamptz default now()
);

-- No RLS needed — these are global definitions readable by all
alter table public.achievement_definitions enable row level security;
create policy "Anyone can view achievement definitions"
  on public.achievement_definitions for select using (true);

-- =============================================
-- USER ACHIEVEMENTS TABLE (unlocked)
-- =============================================
create table public.user_achievements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  achievement_id text references public.achievement_definitions on delete cascade not null,
  
  unlocked_at timestamptz default now(),
  
  unique(user_id, achievement_id)
);

alter table public.user_achievements enable row level security;

create policy "Users can view own achievements"
  on public.user_achievements for select using (auth.uid() = user_id);
create policy "Users can insert own achievements"
  on public.user_achievements for insert with check (auth.uid() = user_id);

create index user_achievements_user on public.user_achievements(user_id);

-- =============================================
-- STREAKS TABLE
-- =============================================
create table public.streaks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  
  type text not null check (type in ('payment', 'budget', 'savings', 'logging')),
  current_count int default 0,           -- Current streak length
  longest_count int default 0,           -- All-time best
  last_checked_at date,                  -- Last date this streak was evaluated
  freeze_available boolean default true, -- One freeze per month
  freeze_used_at date,                   -- When freeze was last used
  
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  unique(user_id, type)
);

alter table public.streaks enable row level security;

create policy "Users can view own streaks"
  on public.streaks for select using (auth.uid() = user_id);
create policy "Users can insert own streaks"
  on public.streaks for insert with check (auth.uid() = user_id);
create policy "Users can update own streaks"
  on public.streaks for update using (auth.uid() = user_id);

create index streaks_user on public.streaks(user_id);

-- =============================================
-- CHALLENGES TABLE (active/completed)
-- =============================================
create table public.challenge_definitions (
  id text primary key,                   -- 'no_spend_weekend', 'debt_blitz', etc.
  name text not null,
  description text not null,
  icon text not null,
  type text not null check (type in ('weekly', 'monthly', 'community')),
  reward_type text default 'score_bonus',
  reward_value int default 5,            -- Bonus points
  requirement jsonb not null,            -- How to complete it
  created_at timestamptz default now()
);

alter table public.challenge_definitions enable row level security;
create policy "Anyone can view challenge definitions"
  on public.challenge_definitions for select using (true);

create table public.user_challenges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  challenge_id text references public.challenge_definitions on delete cascade not null,
  
  status text default 'active' check (status in ('active', 'completed', 'failed', 'expired')),
  started_at timestamptz default now(),
  completed_at timestamptz,
  expires_at timestamptz not null,
  progress jsonb default '{}',           -- Track progress toward completion
  
  created_at timestamptz default now()
);

alter table public.user_challenges enable row level security;

create policy "Users can view own challenges"
  on public.user_challenges for select using (auth.uid() = user_id);
create policy "Users can insert own challenges"
  on public.user_challenges for insert with check (auth.uid() = user_id);
create policy "Users can update own challenges"
  on public.user_challenges for update using (auth.uid() = user_id);

create index user_challenges_user on public.user_challenges(user_id, status);

-- =============================================
-- SEED: DEFAULT ACHIEVEMENTS
-- =============================================
insert into public.achievement_definitions (id, name, description, icon, category, requirement_type, requirement_value, sort_order, is_secret) values
  -- Beginner
  ('first_steps', 'First Steps', 'Log your first transaction', '🎯', 'beginner', 'transaction_count', '{"count": 1}', 1, false),
  ('budget_maker', 'Budget Maker', 'Create your first monthly budget', '📊', 'beginner', 'budget_count', '{"count": 1}', 2, false),
  ('account_setup', 'Account Setup', 'Add your first account', '🏦', 'beginner', 'account_count', '{"count": 1}', 3, false),
  ('self_aware', 'Self Aware', 'View your Financial Health Score for the first time', '🔍', 'beginner', 'score_viewed', '{"count": 1}', 4, false),
  ('debt_tracker', 'Debt Tracker', 'Add your first debt to track', '📋', 'beginner', 'debt_count', '{"count": 1}', 5, false),
  
  -- Progress
  ('century_logger', 'Century Logger', 'Log 100 transactions', '📝', 'progress', 'transaction_count', '{"count": 100}', 10, false),
  ('consistent_30', 'Consistent', '30-day logging streak', '📈', 'progress', 'streak', '{"type": "logging", "count": 30}', 11, false),
  ('first_grand', 'First Grand', 'Save $1,000 total', '💰', 'progress', 'savings_total', '{"amount": 1000}', 12, false),
  ('budget_boss', 'Budget Boss', 'Stay within all budgets for 30 days', '🎯', 'progress', 'streak', '{"type": "budget", "count": 30}', 13, false),
  ('ai_apprentice', 'AI Apprentice', 'Follow 10 AI coach suggestions', '🤖', 'progress', 'ai_actions', '{"count": 10}', 14, false),
  ('rising_tide', 'Rising Tide', 'Increase score by 50 points in one month', '⬆️', 'progress', 'score_increase', '{"amount": 50, "days": 30}', 15, false),
  
  -- Achievement
  ('debt_slayer', 'Debt Slayer', 'Pay off any debt completely', '💳', 'achievement', 'debt_payoff', '{"count": 1}', 20, false),
  ('rainy_day', 'Rainy Day Ready', 'Save 1 month of expenses in emergency fund', '☔', 'achievement', 'emergency_months', '{"months": 1}', 21, false),
  ('safety_net', 'Safety Net', 'Save 3 months of expenses in emergency fund', '🛡️', 'achievement', 'emergency_months', '{"months": 3}', 22, false),
  ('fortress', 'Fortress', 'Save 6 months of expenses in emergency fund', '🏰', 'achievement', 'emergency_months', '{"months": 6}', 23, false),
  ('perfect_quarter', 'Perfect Quarter', '3 months: all bills on-time + all budgets hit', '🎯', 'achievement', 'perfect_months', '{"count": 3}', 24, false),
  ('centurion', 'Centurion', '100-day budget streak', '🔥', 'achievement', 'streak', '{"type": "budget", "count": 100}', 25, false),
  
  -- Elite
  ('club_700', '700 Club', 'Reach a Financial Health Score of 700', '👑', 'elite', 'score_reached', '{"score": 700}', 30, false),
  ('club_800', '800 Club', 'Reach a Financial Health Score of 800', '🏆', 'elite', 'score_reached', '{"score": 800}', 31, false),
  ('club_900', '900 Club', 'Reach a Financial Health Score of 900', '💎', 'elite', 'score_reached', '{"score": 900}', 32, false),
  ('year_discipline', 'Year of Discipline', '365-day budget streak', '🌟', 'elite', 'streak', '{"type": "budget", "count": 365}', 33, false),
  ('debt_free', 'Debt Free', 'Pay off ALL debts (except mortgage)', '🦁', 'elite', 'all_debts_paid', '{"exclude": ["mortgage"]}', 34, false),
  ('wealth_builder', 'Wealth Builder', '20%+ wealth building rate for 6 consecutive months', '🚀', 'elite', 'wealth_rate_streak', '{"rate": 20, "months": 6}', 35, false),
  
  -- Secret
  ('night_owl', 'Late Night Budgeter', 'Log a transaction between 2-4 AM', '🎉', 'secret', 'time_of_day', '{"start": 2, "end": 4}', 40, true),
  ('lucky_seven', 'Lucky Seven', 'Score lands exactly on 777', '🍀', 'secret', 'exact_score', '{"score": 777}', 41, true),
  ('phoenix', 'Phoenix', 'Score drops below 300, then rises above 600', '📉', 'secret', 'score_recovery', '{"low": 300, "high": 600}', 42, true),
  ('holiday_saver', 'Holiday Saver', 'Stay within budget during December', '🎄', 'secret', 'budget_month', '{"month": 12}', 43, true);

-- =============================================
-- SEED: DEFAULT CHALLENGES
-- =============================================
insert into public.challenge_definitions (id, name, description, icon, type, reward_value, requirement) values
  -- Weekly
  ('no_spend_weekend', 'No-Spend Weekend', '$0 discretionary spending Saturday-Sunday', '🚫', 'weekly', 5, '{"type": "no_spend", "days": ["saturday", "sunday"]}'),
  ('debt_blitz', 'Debt Blitz', 'Make an extra payment on your highest-rate debt', '⚡', 'weekly', 3, '{"type": "extra_debt_payment"}'),
  ('meal_prep', 'Meal Prep Master', 'Stay under food budget this week', '🍳', 'weekly', 2, '{"type": "budget_category", "category": "food"}'),
  ('review_week', 'Review Week', 'Categorize all transactions for the week', '📋', 'weekly', 2, '{"type": "all_categorized"}'),
  
  -- Monthly
  ('fifty_redirect', '$50 Redirect', 'Find $50 in your budget to move to savings', '💸', 'monthly', 8, '{"type": "savings_redirect", "amount": 50}'),
  ('sub_audit', 'Subscription Audit', 'Review and cancel at least 1 unused subscription', '🔍', 'monthly', 5, '{"type": "cancel_subscription"}'),
  ('emergency_builder', 'Emergency Builder', 'Add $100+ to emergency fund this month', '🛡️', 'monthly', 10, '{"type": "emergency_contribution", "amount": 100}'),
  ('bill_negotiator', 'Bill Negotiator', 'Call and negotiate at least 1 bill down', '📞', 'monthly', 15, '{"type": "bill_negotiation"}');

-- =============================================
-- DONE!
-- =============================================
