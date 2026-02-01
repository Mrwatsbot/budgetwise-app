# Investment Tracking Implementation

## Overview
Pull investment portfolio data to feed into the **Wealth Building pillar** of the Financial Health Score.

## Why It Matters
- **Complete financial picture:** Most people have investments separate from checking/savings
- **Differentiates from competitors:** YNAB/Monarch don't track investments well
- **Boosts Wealth Building score:** Investments = long-term wealth building
- **Engagement hook:** Users want to see ALL their money in one place

---

## Data Sources (Ranked by Feasibility)

### 1. Plaid Investment Accounts ⭐ **RECOMMENDED**
**Pros:**
- Official, secure, already integrated
- Supports major brokerages (Fidelity, Vanguard, Schwab, E*TRADE, TD Ameritrade)
- Same auth flow as bank accounts
- Returns portfolio holdings, value, contributions

**Cons:**
- Not all brokerages supported (Robinhood is NOT on Plaid)
- May have data delays (daily updates, not real-time)

**Time to implement:** 2-3 hours

---

### 2. Robinhood Unofficial API ⚠️ **RISKY**
**Status:** Robinhood shut down their public API in 2018

**Options:**
- Use community libraries (e.g., `robin_stocks` Python, `robinhood-node`)
- These reverse-engineer the mobile app API
- **RISK:** Could break anytime, violates ToS, security concerns

**Pros:**
- Real-time data
- Robinhood is popular with millennials/Gen Z (our target market)

**Cons:**
- Against Robinhood ToS
- Could break without warning
- Might get our users' accounts flagged
- Security nightmare (handling auth tokens)

**Recommendation:** **Don't do this.** Too risky for a production app.

---

### 3. Manual Entry 📝 **FALLBACK**
**How it works:**
- User manually enters portfolio value monthly
- Option to link to external portfolio tracker (Personal Capital, Mint)

**Pros:**
- Works for ANY brokerage
- No API dependencies
- User controls data

**Cons:**
- Requires user effort (low engagement)
- Less accurate
- Can't auto-update

**Time to implement:** 1 hour

---

### 4. Wait for Official Robinhood API 🕐 **FUTURE**
**Status:** Robinhood has talked about re-launching an official API for years
**Reality:** Don't hold your breath

If it happens, we can add it then. Until then, use Plaid.

---

## Recommended Approach: Plaid + Manual Entry

### Phase 1: Plaid Investment Accounts
Support major brokerages through Plaid:
- Fidelity, Vanguard, Schwab, TD Ameritrade, E*TRADE
- Betterment, Wealthfront (robo-advisors)
- Most 401(k) providers

### Phase 2: Manual Entry for Robinhood Users
"Don't see your brokerage? Add it manually."
- User enters portfolio value
- Optional: Monthly reminder to update
- Can still participate in scoring, just not auto-updated

### Phase 3: Monitor for Robinhood API
If Robinhood launches official API, we integrate immediately.

---

## Database Schema

### New Table: `investment_accounts`
```sql
CREATE TABLE investment_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Plaid fields
  plaid_account_id TEXT UNIQUE,
  plaid_access_token TEXT,
  
  -- Account details
  institution_name TEXT NOT NULL,
  account_name TEXT,
  account_type TEXT CHECK (account_type IN ('brokerage', '401k', 'ira', 'roth_ira', 'manual')),
  
  -- Balance
  current_value DECIMAL(12, 2) NOT NULL DEFAULT 0,
  previous_value DECIMAL(12, 2),
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_investment_accounts_user ON investment_accounts(user_id);
CREATE INDEX idx_investment_accounts_plaid ON investment_accounts(plaid_account_id);
```

### New Table: `investment_history`
Track portfolio value over time:
```sql
CREATE TABLE investment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
  value DECIMAL(12, 2) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_investment_history_account ON investment_history(account_id);
CREATE INDEX idx_investment_history_date ON investment_history(recorded_at);
```

---

## UI Components

### 1. Dashboard Widget
```
┌─────────────────────────────────────┐
│ 📈 Investments                      │
│                                     │
│ $47,234                            │
│ +$1,847 (4.1%) this month          │
│                                     │
│ Fidelity 401(k)        $32,450 ✓   │
│ Vanguard IRA          $14,784 ✓   │
│                                     │
│ [+ Add Investment Account]          │
└─────────────────────────────────────┘
```

### 2. Investment Accounts Page
Similar to current Accounts page, but for investments:
- List all connected accounts
- Portfolio value chart (3mo, 6mo, 1yr, All)
- Contributions tracking
- Link to connect more accounts

### 3. Plaid Link Modal
Extend existing Plaid integration:
- "Connect Bank Account" → "Connect Bank or Investment Account"
- Filter for investment account types in Plaid UI

---

## Score Impact

### Wealth Building Pillar (0-300 points)
**Current scoring:**
- Emergency fund (liquid savings)
- Retirement contributions (401k, IRA)
- Debt paydown velocity

**With investments:**
- **Portfolio value** (0-50 points): Based on months of expenses saved
  - < 3 months: 0-15 pts
  - 3-6 months: 16-30 pts
  - 6-12 months: 31-40 pts
  - 12+ months: 41-50 pts

- **Investment consistency** (0-30 points): Regular contributions
  - No contributions: 0 pts
  - Occasional: 10 pts
  - Monthly: 20 pts
  - Bi-weekly/auto: 30 pts

- **Diversification** (0-20 points): Multiple account types
  - 1 account: 0 pts
  - 2 accounts (e.g., 401k + IRA): 10 pts
  - 3+ accounts (brokerage + retirement): 20 pts

**Total investment impact:** Up to 100 points on Wealth Building pillar

---

## Implementation Steps

### 1. Database Setup (30 min)
- Run migration for new tables
- Add RLS policies
- Seed test data

### 2. Extend Plaid Integration (1 hour)
- Update Plaid link to include investment products
- Add token exchange for investment accounts
- Store account details

### 3. Sync Investment Data (1 hour)
- Fetch balances via Plaid API
- Update `investment_accounts` table
- Record to `investment_history`

### 4. UI Components (2 hours)
- Dashboard investment widget
- Investment accounts page
- Manual entry form
- Portfolio value chart

### 5. Update Score Calculator (1 hour)
- Add investment fields to score calculation
- Update Wealth Building pillar logic
- Test with various portfolio sizes

### 6. Testing (1 hour)
- Connect test Plaid investment account
- Verify data sync
- Check score calculation
- Test manual entry fallback

**Total: ~6-7 hours**

---

## Rollout Plan

### Week 1: Plaid Investment Support
- Extend Plaid to include investment accounts
- Dashboard widget showing portfolio value
- Basic investment tracking

### Week 2: Score Integration
- Update Wealth Building score calculation
- Add investment contribution tracking
- Portfolio performance metrics

### Week 3: Polish
- Manual entry for unsupported brokerages
- Investment insights (AI-powered)
- Tax-advantaged account detection (401k, IRA, Roth IRA)

---

## Pricing Tie-In
**Investment tracking = Pro tier feature**
- Free/Plus: Can see portfolio value, but no auto-sync
- Pro: Full Plaid investment sync + real-time updates

This incentivizes Pro upgrades for users with significant investments.

---

## Robinhood Workaround (Short-Term)
Until official API:
1. **Manual entry:** User adds Robinhood portfolio value monthly
2. **Screenshot upload:** AI extracts portfolio value from screenshot (future)
3. **CSV import:** User downloads Robinhood statement, we parse it

This keeps Robinhood users engaged while we wait for official API.

---

## Priority
**High** — Significantly improves product value for users with investments (most millennials/Gen Z have at least a 401k or Robinhood account).

**Build when:** After core features stable, during pre-launch polish phase.
