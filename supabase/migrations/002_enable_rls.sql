-- ============================================================
-- BudgetWise — Row Level Security (RLS) Policies
-- Run this in Supabase SQL Editor
-- ============================================================
-- This ensures every database query is automatically scoped to
-- the authenticated user. Even if someone obtains the anon key,
-- they can ONLY access their own data.
-- ============================================================

-- ============================================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payee_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;

-- Achievement and challenge DEFINITIONS are public (read-only)
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_definitions ENABLE ROW LEVEL SECURITY;

-- AI insights cache (if exists)
DO $$ BEGIN
  ALTER TABLE ai_page_insights ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- AI rate limits (if exists)
DO $$ BEGIN
  ALTER TABLE ai_rate_limits ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================
-- 2. DROP EXISTING POLICIES (safe to re-run)
-- ============================================================

DO $$ 
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'profiles', 'accounts', 'categories', 'transactions', 'budgets',
    'payee_rules', 'ai_usage', 'debts', 'debt_payments',
    'savings_goals', 'savings_contributions', 'bills', 'bill_payments',
    'score_history', 'user_achievements', 'streaks', 'user_challenges',
    'achievement_definitions', 'challenge_definitions'
  ])
  LOOP
    FOR pol IN 
      SELECT policyname FROM pg_policies WHERE tablename = tbl AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- 3. PROFILES — Users can only read/update their own profile
-- ============================================================

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Profile creation handled by auth trigger (service role)
CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 4. ACCOUNTS — Scoped to user_id
-- ============================================================

CREATE POLICY "Users can view own accounts"
  ON accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own accounts"
  ON accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts"
  ON accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts"
  ON accounts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 5. CATEGORIES — System categories readable by all, user categories scoped
-- ============================================================

CREATE POLICY "Users can view system and own categories"
  ON categories FOR SELECT
  USING (is_system = true OR auth.uid() = user_id);

CREATE POLICY "Users can create own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id AND is_system = false)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id AND is_system = false);

-- ============================================================
-- 6. TRANSACTIONS — Scoped to user_id
-- ============================================================

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 7. BUDGETS — Scoped to user_id
-- ============================================================

CREATE POLICY "Users can view own budgets"
  ON budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own budgets"
  ON budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
  ON budgets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
  ON budgets FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 8. PAYEE RULES — Scoped to user_id
-- ============================================================

CREATE POLICY "Users can view own payee rules"
  ON payee_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own payee rules"
  ON payee_rules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 9. AI USAGE — Users can view own, insert own
-- ============================================================

CREATE POLICY "Users can view own AI usage"
  ON ai_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can log own AI usage"
  ON ai_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 10. DEBTS + PAYMENTS — Scoped to user_id
-- ============================================================

CREATE POLICY "Users can view own debts"
  ON debts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own debts"
  ON debts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own debt payments"
  ON debt_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own debt payments"
  ON debt_payments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 11. SAVINGS GOALS + CONTRIBUTIONS — Scoped to user_id
-- ============================================================

CREATE POLICY "Users can view own savings goals"
  ON savings_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own savings goals"
  ON savings_goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own savings contributions"
  ON savings_contributions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own savings contributions"
  ON savings_contributions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 12. BILLS + PAYMENTS — Scoped to user_id
-- ============================================================

CREATE POLICY "Users can view own bills"
  ON bills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own bills"
  ON bills FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own bill payments"
  ON bill_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own bill payments"
  ON bill_payments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 13. GAMIFICATION — Score, Achievements, Streaks, Challenges
-- ============================================================

CREATE POLICY "Users can view own score history"
  ON score_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own score history"
  ON score_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Achievement definitions are PUBLIC (read-only reference data)
CREATE POLICY "Anyone can view achievement definitions"
  ON achievement_definitions FOR SELECT
  USING (true);

-- User achievements scoped to user
CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can earn achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Streaks scoped to user
CREATE POLICY "Users can view own streaks"
  ON streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own streaks"
  ON streaks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Challenge definitions are PUBLIC (read-only reference data)
CREATE POLICY "Anyone can view challenge definitions"
  ON challenge_definitions FOR SELECT
  USING (true);

-- User challenges scoped to user
CREATE POLICY "Users can view own challenges"
  ON user_challenges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own challenges"
  ON user_challenges FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 14. AI PAGE INSIGHTS CACHE (if table exists)
-- ============================================================

DO $$ BEGIN
  EXECUTE 'CREATE POLICY "Users can view own insights" ON ai_page_insights FOR SELECT USING (auth.uid() = user_id)';
  EXECUTE 'CREATE POLICY "Users can manage own insights" ON ai_page_insights FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================
-- 15. AI RATE LIMITS (if table exists)
-- ============================================================

DO $$ BEGIN
  EXECUTE 'CREATE POLICY "Users can view own rate limits" ON ai_rate_limits FOR SELECT USING (auth.uid() = user_id)';
  EXECUTE 'CREATE POLICY "Users can manage own rate limits" ON ai_rate_limits FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================
-- DONE. All tables now enforce row-level security.
-- The service_role key bypasses RLS (used server-side only).
-- The anon key respects RLS (used in browser).
-- ============================================================
