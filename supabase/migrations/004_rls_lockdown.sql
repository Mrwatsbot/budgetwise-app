-- Migration 004: Lock down RLS policies for business logic security
-- Fixes from ABUSE-AUDIT-TIERS.md
-- Run in Supabase Dashboard > SQL Editor

-- ============================================================
-- 1. PROFILES: Restrict which columns users can update
-- Prevents self-upgrade of subscription_tier/subscription_status
-- ============================================================

-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- New policy: users can update their profile, but ONLY safe fields
-- subscription_tier, subscription_status, and stripe_customer_id are LOCKED
-- (Only the Stripe webhook via service role key can change these)
CREATE POLICY "Users can update own profile safe fields"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    -- These fields must remain unchanged by the user
    subscription_tier = (SELECT subscription_tier FROM public.profiles WHERE id = auth.uid()) AND
    subscription_status = (SELECT subscription_status FROM public.profiles WHERE id = auth.uid()) AND
    stripe_customer_id = (SELECT stripe_customer_id FROM public.profiles WHERE id = auth.uid())
  );

-- ============================================================
-- 2. AI_USAGE_COUNTS: Remove user UPDATE permission
-- Users should only read their usage, never modify it
-- ============================================================

DROP POLICY IF EXISTS "Users can update own usage" ON public.ai_usage_counts;

-- Keep read access so the limits API can show usage to users
-- (INSERT and UPDATE should only happen via service role in rate-limiter.ts)

-- Also ensure users can't INSERT fake usage records (only server can)
DROP POLICY IF EXISTS "Users can insert own usage" ON public.ai_usage_counts;

-- ============================================================
-- 3. BILLING_EVENTS: Create missing table for webhook idempotency
-- ============================================================

CREATE TABLE IF NOT EXISTS public.billing_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  amount INTEGER,
  currency TEXT DEFAULT 'usd',
  tier TEXT,
  status TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_user ON billing_events(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_stripe_event ON billing_events(stripe_event_id);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- Users can only view their own billing events
CREATE POLICY "Users can view own billing events"
  ON public.billing_events FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role (Stripe webhook) can insert/update billing events
-- No user-facing INSERT/UPDATE/DELETE policies needed

-- ============================================================
-- 4. SCORE_HISTORY: Prevent users from inserting fake scores
-- ============================================================

DROP POLICY IF EXISTS "Users can insert own score" ON public.score_history;
DROP POLICY IF EXISTS "Users can insert own score history" ON public.score_history;

-- Only allow server-side score calculation to insert (via service role)
-- Keep SELECT so users can view their score history
