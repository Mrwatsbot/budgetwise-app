# Business Logic Abuse Audit — Tier & Feature Bypass

**Audit Date:** 2025-02-05  
**Auditor:** Security Subagent  
**Scope:** Tier system, feature gating, subscription billing, AI rate limits

---

## 🔴 CRITICAL (can be exploited right now)

### 1. **Users Can Self-Upgrade to Any Tier Without Payment**

**File:** `supabase-schema.sql` (lines 26-29)  
**Severity:** CRITICAL — Complete bypass of payment system  
**Impact:** Any user can get Pro/Plus features for free

**Vulnerability:**
```sql
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);
```

This RLS policy allows users to update **ANY field** in their own profile, including `subscription_tier` and `subscription_status`. There are no restrictions on which columns can be modified.

**How to Exploit:**
1. Sign up for free account
2. Open browser DevTools
3. Make a PATCH request to Supabase:
```javascript
const { data, error } = await supabase
  .from('profiles')
  .update({ 
    subscription_tier: 'pro',
    subscription_status: 'active'
  })
  .eq('id', user.id);
```
4. Refresh page → instant Pro access, unlimited AI features

**Proof:** The `/api/settings/route.ts` PUT handler (lines 22-85) validates user input for `full_name`, `monthly_income`, `openrouter_api_key`, but **does NOT prevent direct Supabase client calls** from the browser that bypass this API entirely.

**Fix:**
```sql
-- Replace the overly permissive policy with column-specific policies
DROP POLICY "Users can update own profile" ON public.profiles;

-- Allow updating only safe user-editable fields
CREATE POLICY "Users can update own profile safe fields"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    -- Only these columns can be updated by users
    (subscription_tier IS NULL OR subscription_tier = OLD.subscription_tier) AND
    (subscription_status IS NULL OR subscription_status = OLD.subscription_status) AND
    (stripe_customer_id IS NULL OR stripe_customer_id = OLD.stripe_customer_id)
  );

-- Or use a more explicit approach with an RPC function:
CREATE OR REPLACE FUNCTION update_profile_safe(
  p_full_name TEXT,
  p_monthly_income NUMERIC,
  p_openrouter_api_key TEXT,
  p_pay_frequency TEXT,
  p_next_pay_date DATE
) RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET 
    full_name = COALESCE(p_full_name, full_name),
    monthly_income = COALESCE(p_monthly_income, monthly_income),
    openrouter_api_key = p_openrouter_api_key,
    pay_frequency = COALESCE(p_pay_frequency, pay_frequency),
    next_pay_date = p_next_pay_date,
    updated_at = NOW()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Then only allow updates through this function
DROP POLICY "Users can update own profile" ON public.profiles;
CREATE POLICY "Users cannot directly update profiles"
  ON public.profiles FOR UPDATE
  USING (false);
```

**Additional Recommendation:** Add server-side validation in `/api/settings/route.ts` to reject requests that include restricted fields, even though the RLS policy should block them.

---

### 2. **AI Usage Counters Can Be Reset by Users**

**File:** `supabase-migration-003-rate-limits.sql` (lines 13-14)  
**Severity:** CRITICAL — Complete bypass of rate limits  
**Impact:** Unlimited AI usage on free/plus tiers

**Vulnerability:**
```sql
create policy "Users can update own usage" 
  on public.ai_usage_counts for update 
  using (auth.uid() = user_id);
```

Users have UPDATE permission on their own AI usage counters. This allows them to reset their usage counts to zero, bypassing all rate limits.

**How to Exploit:**
1. Use AI features until you hit the limit
2. Execute in browser console:
```javascript
const { error } = await supabase
  .from('ai_usage_counts')
  .update({ count: 0 })
  .eq('user_id', user.id);
```
3. Continue using AI features indefinitely

**Files Affected:**
- All routes in `/src/app/api/ai/*/route.ts` rely on this table for rate limiting
- `src/lib/ai/rate-limiter.ts` (line 69) reads from this table

**Fix:**
```sql
-- Remove user update permission
DROP POLICY "Users can update own usage" ON public.ai_usage_counts;

-- Users should only read their usage, not modify it
-- Only server-side code (through service role) should update counts
```

The `incrementUsage()` function in `rate-limiter.ts` should use the server-side Supabase client (service role) that bypasses RLS, not the user's client.

---

### 3. **BYOK Users Can Set Fake API Key to Get Unlimited Access**

**File:** `src/lib/ai/rate-limiter.ts` (lines 18-20)  
**Severity:** CRITICAL — Bypass all rate limits without a real API key  
**Impact:** Pro users can claim "BYOK" without actually bringing their own key

**Vulnerability:**
```typescript
export async function getUserTier(supabase: SupabaseClient, userId: string): Promise<{ tier: SubscriptionTier; hasByok: boolean }> {
  // ...
  return {
    tier: (data?.subscription_tier as SubscriptionTier) || 'free',
    hasByok: !!(data as any)?.openrouter_api_key,  // ← Just checks if non-empty!
  };
}
```

The code only checks if `openrouter_api_key` is non-empty, not if it's **valid**. In `rate-limiter.ts` line 42:
```typescript
if (hasByok && tier === 'pro') {
  return { allowed: true, remaining: -1, limit: -1, period: 'unlimited' };
}
```

**How to Exploit:**
1. Upgrade to Pro tier (or use vulnerability #1 to fake it)
2. Set `openrouter_api_key` to any garbage string: "fake_key_123"
3. Get unlimited AI access without paying for API calls

**Validation Gap:** When the AI routes fetch the API key override (e.g., `coach/route.ts` lines 39-45), they pass it to OpenRouter, which would fail... BUT many routes have try/catch that might fail gracefully, AND the rate limit check already passed, so the counter doesn't increment properly on failure.

**Fix:**
```typescript
// In rate-limiter.ts
export async function getUserTier(supabase: SupabaseClient, userId: string): Promise<{ tier: SubscriptionTier; hasByok: boolean }> {
  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier, openrouter_api_key')
    .eq('id', userId)
    .single();

  const apiKey = (data as any)?.openrouter_api_key;
  
  // Validate the key format (OpenRouter keys start with "sk-or-v1-")
  const validKey = apiKey && typeof apiKey === 'string' && apiKey.startsWith('sk-or-v1-') && apiKey.length > 20;

  return {
    tier: (data?.subscription_tier as SubscriptionTier) || 'free',
    hasByok: validKey || false,
  };
}
```

Better: Actually test the key with a small API call when user saves it (in `/api/settings/route.ts`).

---

### 4. **Missing Billing Events Table Breaks Webhook Idempotency**

**File:** `src/app/api/stripe/webhook/route.ts` (lines 63-72)  
**Severity:** HIGH — Webhook replay attacks possible  
**Impact:** Duplicate subscription grants, failed downgrades

**Vulnerability:**
The webhook handler tries to insert into `billing_events` table for idempotency (line 92-106):
```typescript
const { data: existingEvent } = await (supabaseAdmin as any)
  .from('billing_events')
  .select('id')
  .eq('stripe_event_id', event.id)
  .maybeSingle();
```

**Problem:** The `billing_events` table **does not exist** in any migration file. This query silently fails, meaning:
- Same webhook can be processed multiple times
- No audit trail of billing events
- `logBillingEvent()` calls throughout the file fail silently

**How to Exploit:**
1. Capture a `checkout.session.completed` webhook
2. Replay it with the same signature
3. User gets multiple tier upgrades recorded (though Stripe subscription ID might prevent actual duplicates)

**Fix:**
```sql
-- Create the missing table
CREATE TABLE public.billing_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  stripe_event_id TEXT NOT NULL UNIQUE,  -- For idempotency
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

CREATE INDEX idx_billing_events_user ON billing_events(user_id);
CREATE INDEX idx_billing_events_stripe_event ON billing_events(stripe_event_id);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own billing events"
  ON public.billing_events FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 🟠 HIGH (likely exploitable)

### 5. **Rate Limit Check Happens BEFORE AI Call (Fail-Open Risk)**

**Files:** All `/src/app/api/ai/*/route.ts` files  
**Severity:** HIGH — Users can burn through limits without successful calls  
**Pattern:**

```typescript
// Line ~25 in most AI routes
const rateCheck = await checkRateLimit(...);
if (!rateCheck.allowed) {
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
}

// ... AI call happens here ...

// Line ~80+
await incrementUsage(supabase, user.id, 'feature_name');
```

**Problem:** If the AI call **fails** (network error, OpenRouter outage, invalid response), the counter is NOT incremented (because `incrementUsage` is after the AI call). User can retry infinitely on failed requests.

**Scenario:**
1. User on Plus tier (5 daily insights)
2. OpenRouter API is having issues
3. User spams the insights button 100 times
4. All requests fail, counter never increments
5. When API recovers, user still has 5 uses left

**Fix:**
```typescript
// Increment BEFORE the AI call (pessimistic locking)
await incrementUsage(supabase, user.id, 'feature_name');

try {
  const result = await callAI(...);
  // ... rest of code ...
} catch (error) {
  // Consider: Decrement counter on legitimate failures
  // (but be careful not to enable exploit by intentionally failing)
  throw error;
}
```

Alternative: Use a transaction or atomic counter increment that can be rolled back on specific error types.

---

### 6. **No Enforcement of Subscription Status**

**File:** `src/lib/ai/rate-limiter.ts`  
**Severity:** HIGH — Past-due users retain access  
**Impact:** Users can use features after payment fails

**Vulnerability:**
The `getUserTier()` function only checks `subscription_tier`, not `subscription_status`:
```typescript
return {
  tier: (data?.subscription_tier as SubscriptionTier) || 'free',
  hasByok: !!(data as any)?.openrouter_api_key,
};
```

When a subscription payment fails, Stripe webhook sets `subscription_status: 'past_due'` (webhook line 222), but tier remains 'pro' or 'plus'. The app never checks `subscription_status` before allowing access.

**How to Exploit:**
1. Subscribe to Pro
2. Cancel credit card
3. Payment fails → status becomes 'past_due'
4. Continue using Pro features indefinitely (until Stripe cancels after multiple failures)

**Fix:**
```typescript
export async function getUserTier(supabase: SupabaseClient, userId: string): Promise<{ tier: SubscriptionTier; hasByok: boolean }> {
  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_status, openrouter_api_key')
    .eq('id', userId)
    .single();

  let tier = (data?.subscription_tier as SubscriptionTier) || 'free';
  const status = (data as any)?.subscription_status;

  // Downgrade to free if subscription is not active
  if (status !== 'active' && tier !== 'free') {
    tier = 'free';
  }

  return {
    tier,
    hasByok: !!(data as any)?.openrouter_api_key,
  };
}
```

---

### 7. **Chat Endpoint Has Separate Token Budget, No Tier Gate**

**File:** `src/app/api/chat/route.ts`  
**Severity:** MEDIUM-HIGH — Free users can access AI chat  
**Impact:** Unintended free tier access to conversational AI

**Current Behavior:**
- Chat uses separate token budget system (lines 71-97)
- Token limits are tier-based: free gets 5,000/day, plus gets 25,000/day (see `token-budget.ts`)
- But there's NO explicit tier gate check before allowing chat

**Free Tier Access:**
Line 71-76 shows free tier gets 5,000 daily tokens (about 15-20 messages). This might be intentional, but combined with the profile update vulnerability, it's a risk.

**Issue:** If this is meant to be Plus-only, it's missing the check. If it's meant to be free with limits, the limits are too generous and can be reset (vulnerability #2).

**Recommendation:**
If chat should be Plus-only:
```typescript
// Add after line 67
if (chatTier === 'free') {
  return NextResponse.json(
    { error: 'Upgrade to Plus to access AI Chat' },
    { status: 403 }
  );
}
```

If chat is free with limits, ensure token budget checks can't be bypassed by fixing vulnerability #2.

---

### 8. **Stripe Webhook Not Verifying Signature in Dev Mode**

**File:** `src/app/api/stripe/webhook/route.ts` (lines 75-82)  
**Severity:** HIGH — Fake webhooks in development/staging  
**Risk:** Medium (requires STRIPE_WEBHOOK_SECRET to be missing)

```typescript
try {
  event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
} catch (error: unknown) {
  console.error('Webhook signature verification failed:', error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Invalid signature' },
    { status: 400 }
  );
}
```

**Problem:** If `WEBHOOK_SECRET` is undefined (e.g., forgotten in `.env`), the Stripe SDK might fail in unexpected ways. There's no explicit check that `WEBHOOK_SECRET` exists before use.

**Fix:**
```typescript
if (!WEBHOOK_SECRET) {
  console.error('STRIPE_WEBHOOK_SECRET not configured!');
  return NextResponse.json(
    { error: 'Webhook not configured' },
    { status: 500 }
  );
}
```

---

## 🟡 MEDIUM (edge cases)

### 9. **AI Routes Don't Validate Tier Before Rate Limit Check**

**Files:** Multiple AI routes  
**Severity:** MEDIUM — Unnecessary rate limit lookups for locked features  
**Pattern:**

Some routes (e.g., `receipt-scan/route.ts`, `product-scan/route.ts`) check tier AFTER getting rate limit info:
```typescript
// Line 14-24
const { tier, hasByok } = await getUserTier(supabase, user.id);
const isFree = tier === 'free' || tier === 'basic';
if (isFree) {
  return NextResponse.json({ error: 'Upgrade to Plus...' }, { status: 401 });
}

const rateCheck = await checkRateLimit(supabase, user.id, tier, 'receipt_scan', hasByok);
```

**Issue:** Rate limit check queries the database before tier gate rejects. A free user spamming the API causes unnecessary DB load.

**Better Order:**
```typescript
// 1. Auth check (apiGuard)
// 2. Tier gate (fast, no DB query if tier is cached)
// 3. Rate limit check (only for eligible users)
```

**Impact:** Low performance impact, but cleaner security model. Fix priority: LOW.

---

### 10. **No Check for Subscription Cancellation Period**

**File:** `src/app/api/stripe/webhook/route.ts` (lines 177-201)  
**Severity:** MEDIUM — Users might retain access past cancellation  
**Stripe Behavior:** When a user cancels, `subscription.status` remains 'active' until period ends

**Webhook Handler:**
```typescript
case 'customer.subscription.deleted': {
  // Only triggers when subscription fully ends
  await supabaseAdmin.from('profiles')
    .update({ subscription_tier: 'free', subscription_status: 'canceled' })
    .eq('id', userId);
}
```

**Issue:** If user cancels on day 5 of a monthly subscription, they retain Pro access until day 30. This is typically desired behavior, but there's no way to:
1. Show "cancels on X date" in the UI
2. Prevent reactivation exploits
3. Track cancellation but still-active state

**Recommendation:**
Add a `subscription_cancel_at` or `subscription_period_end` column to profiles:
```sql
ALTER TABLE profiles ADD COLUMN subscription_cancel_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN subscription_period_end TIMESTAMPTZ;
```

Update on `subscription.updated` and `subscription.deleted` events.

---

### 11. **Settings API Doesn't Validate OpenRouter Key Format**

**File:** `src/app/api/settings/route.ts` (lines 49-55)  
**Severity:** MEDIUM — Related to vulnerability #3  
**Issue:**

```typescript
if (openrouter_api_key !== undefined) {
  if (openrouter_api_key && openrouter_api_key.length > 200) {
    return NextResponse.json({ error: 'API key too long...' }, { status: 400 });
  }
  updates.openrouter_api_key = openrouter_api_key || null;
}
```

No format validation. Users can save "fake_key" and exploit unlimited rate limits if they're Pro (see vulnerability #3).

**Fix:**
```typescript
if (openrouter_api_key !== undefined) {
  if (openrouter_api_key) {
    // Validate format
    if (!openrouter_api_key.startsWith('sk-or-v1-') || openrouter_api_key.length < 20) {
      return NextResponse.json({ 
        error: 'Invalid OpenRouter API key format' 
      }, { status: 400 });
    }
    
    // Optional: Test the key with a minimal API call
    try {
      await testOpenRouterKey(openrouter_api_key);
    } catch {
      return NextResponse.json({
        error: 'OpenRouter API key is invalid or inactive'
      }, { status: 400 });
    }
  }
  updates.openrouter_api_key = openrouter_api_key || null;
}
```

---

### 12. **No Data Limits Enforcement for Free Users**

**Scope:** Accounts, Transactions, Budgets, Debts, Savings Goals  
**Severity:** MEDIUM — Resource abuse possible  
**Current State:** No limits found

**Checked:**
- `/api/accounts/route.ts` — No count check before insert
- `/api/transactions/route.ts` — No limit on transaction count
- `/api/budgets/route.ts` — No limit on budget categories
- `/api/debts/route.ts` — No limit on debt count
- `/api/savings/route.ts` — No limit on savings goals

**Risk:**
1. Free user creates 10,000 accounts → DB bloat
2. Free user imports 1M transactions → performance issues
3. Malicious user creates tons of data to DoS the service

**Recommendation:**
Define limits:
- Free: 5 accounts, 1000 transactions/month, 10 budget categories, 5 debts, 3 savings goals
- Plus: 10 accounts, 5000 transactions/month, unlimited categories, 10 debts, 10 goals
- Pro: Unlimited

Enforce in each POST route:
```typescript
if (tier === 'free') {
  const { count } = await supabase
    .from('accounts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);
  
  if (count >= 5) {
    return NextResponse.json({
      error: 'Free tier limited to 5 accounts. Upgrade to Plus for more.'
    }, { status: 403 });
  }
}
```

---

## ✅ PASSED (security controls working correctly)

### 1. **All AI Routes Check Rate Limits**
✅ All 12 routes in `/api/ai/*` call `checkRateLimit()` before processing  
Files: `afford/`, `analyze/`, `auto-budget/`, `budget-tune/`, `coach/`, `import-statement/`, `insights/`, `limits/`, `payoff-plan/`, `product-scan/`, `receipt-scan/`, `scan/`

### 2. **AI Routes Use Server-Side Data Fetching**
✅ All AI routes fetch user data server-side (not from client)  
✅ PII is stripped in most places (generic labels replace real names)

### 3. **Stripe Checkout Uses Proper Customer Linking**
✅ `client_reference_id` and `metadata.supabase_user_id` both set (line 76, 81 in `checkout/route.ts`)  
✅ No way to forge checkout for another user's account

### 4. **Stripe Webhook Uses Signature Verification**
✅ `stripe.webhooks.constructEvent()` validates signature (line 76)  
✅ Idempotency check attempted (though table is missing — see #4)

### 5. **API Guard Enforces Authentication**
✅ All API routes use `apiGuard()` which checks `auth.getUser()` (line 15-16 in `api-guard.ts`)  
✅ Rate limiting applied per-user via Upstash Redis (line 25 in `api-guard.ts`)

### 6. **Row-Level Security Enabled on All Tables**
✅ All user data tables have RLS enabled  
✅ Policies restrict access to `auth.uid() = user_id`

### 7. **AI Chat Uses Token Budget System**
✅ Separate from feature-based rate limits  
✅ Limits enforced (though can be bypassed via vulnerability #2)  
✅ Canned responses and KB matches don't consume tokens

### 8. **Client-Side Tier Checks Exist (Defense in Depth)**
While client-side checks can be bypassed, they're good UX:
- Pricing page clearly shows tier differences
- Settings page shows current tier
- UI likely hides premium features for free users

### 9. **Middleware Protects Routes**
✅ Public routes defined (/, /demo, /login, /signup, /setup)  
✅ All other routes require Supabase session

### 10. **No Sensitive Data Leakage in Errors**
✅ Error messages don't expose DB schema or internal details  
✅ API keys are masked in settings GET (line 33-34 in `settings/route.ts`)

---

## 📋 SUMMARY

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 CRITICAL | 4 | Can be exploited now for free Pro access |
| 🟠 HIGH | 4 | Likely exploitable, significant impact |
| 🟡 MEDIUM | 4 | Edge cases, lower impact |
| ✅ PASSED | 10 | Security controls working |

### Critical Actions Required:
1. **IMMEDIATE:** Fix profile RLS policy to prevent tier self-upgrade
2. **IMMEDIATE:** Remove user UPDATE permission on `ai_usage_counts`
3. **IMMEDIATE:** Validate OpenRouter API keys before granting unlimited access
4. **HIGH:** Create missing `billing_events` table
5. **HIGH:** Enforce `subscription_status` in tier checks
6. **MEDIUM:** Add data limits for free tier

### Estimated Fix Time:
- Profile RLS fix: 15 minutes
- Usage counter fix: 10 minutes  
- BYOK validation: 30 minutes
- Billing events table: 20 minutes
- Status enforcement: 15 minutes
- **Total: ~1.5 hours** for critical fixes

---

## 🎯 EXPLOITATION PROOF OF CONCEPT

**Target:** Get Pro-tier features without payment

**Steps:**
1. Sign up for free account at `/signup`
2. Log in, open DevTools Console
3. Run:
```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Self-upgrade to Pro
await supabase.from('profiles').update({
  subscription_tier: 'pro',
  subscription_status: 'active',
  openrouter_api_key: 'fake_key_to_trigger_byok'
}).eq('id', user.id);

console.log('Upgraded to Pro!');
```
4. Navigate to `/coaching` or any AI feature
5. Enjoy unlimited AI access

**Outcome:** Full Pro-tier access, bypassing Stripe entirely. Rate limits show as "unlimited" because `hasByok=true`.

---

## 📚 REFERENCES

- Stripe webhook best practices: https://stripe.com/docs/webhooks/best-practices
- Supabase RLS patterns: https://supabase.com/docs/guides/auth/row-level-security
- OWASP Business Logic: https://owasp.org/www-community/vulnerabilities/Business_logic_vulnerability

---

**End of Audit**
