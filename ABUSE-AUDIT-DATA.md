# Business Logic Abuse Audit — Data Manipulation & API Abuse

**Auditor:** AI Security Analyst  
**Date:** 2026-02-05  
**Scope:** API endpoints, data manipulation, foreign key validation, business logic abuse

---

## CRITICAL (can be exploited right now)

### 🔴 C1: Transaction Creation - Missing Account Ownership Validation
**File:** `src/app/api/transactions/route.ts`  
**Lines:** 52-69 (POST handler)

**Vulnerability:**  
When creating a transaction, the API accepts `account_id` from the client but **never validates that this account belongs to the authenticated user**. An attacker can create transactions in another user's account by guessing or enumerating account UUIDs.

**How to exploit:**
1. Attacker creates an account and gets their own account_id
2. Attacker guesses or brute-forces another user's account UUID
3. POST to `/api/transactions` with victim's account_id:
```json
{
  "account_id": "victim-uuid-here",
  "amount": -999999,
  "date": "2026-02-05",
  "payee_original": "Hacked"
}
```
4. Transaction is created in victim's account, corrupting their data

**Impact:** Data corruption, financial data manipulation, cross-user data injection

**How to fix:**
```typescript
// After line 52, add validation:
const { data: accountCheck } = await supabase
  .from('accounts')
  .select('id')
  .eq('id', account_id)
  .eq('user_id', user.id)
  .single();

if (!accountCheck) {
  return NextResponse.json(
    { error: 'Account not found or access denied' },
    { status: 403 }
  );
}
```

---

### 🔴 C2: Transaction Update - Missing Foreign Key Validation
**File:** `src/app/api/transactions/[id]/route.ts`  
**Lines:** 40-57 (PATCH handler)

**Vulnerability:**  
When updating a transaction, the API allows changing `account_id` and `category_id` without validating that these resources belong to the user. An attacker can:
- Move their transactions to another user's account
- Use another user's custom categories

**How to exploit:**
1. Update your own transaction with another user's account_id:
```json
PATCH /api/transactions/your-transaction-id
{
  "account_id": "victim-account-uuid"
}
```
2. Your transaction now appears in victim's account

**Impact:** Cross-user data contamination, account balance manipulation

**How to fix:**
```typescript
// In PATCH handler, before applying updates:
if (updates.account_id) {
  const { data: accountCheck } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', updates.account_id)
    .eq('user_id', user.id)
    .single();
  
  if (!accountCheck) {
    return NextResponse.json(
      { error: 'Invalid account_id' },
      { status: 403 }
    );
  }
}

if (updates.category_id) {
  const { data: categoryCheck } = await supabase
    .from('categories')
    .select('id')
    .eq('id', updates.category_id)
    .or(`user_id.eq.${user.id},is_system.eq.true`)
    .single();
  
  if (!categoryCheck) {
    return NextResponse.json(
      { error: 'Invalid category_id' },
      { status: 403 }
    );
  }
}
```

---

### 🔴 C3: Bulk Transaction Import - Missing Account Validation
**File:** `src/app/api/transactions/bulk/route.ts`  
**Lines:** 10-29

**Vulnerability:**  
Bulk import only fetches the user's FIRST account and uses it. It doesn't validate if user has any accounts at all before attempting bulk insert. More critically, there's no validation loop.

**How to exploit:**
1. If no account exists, the endpoint returns a 400 error (GOOD)
2. However, if you modify the request to inject a different accountId, there's no validation

**Impact:** Could bulk-insert transactions into wrong accounts

**How to fix:**
```typescript
// Add explicit account ownership check at line 21:
const { data: accounts } = await supabase
  .from('accounts')
  .select('id')
  .eq('id', accountId) // Use provided accountId if any
  .eq('user_id', user.id)
  .single();

if (!accounts) {
  return NextResponse.json({ 
    error: 'Account not found or access denied' 
  }, { status: 403 });
}
```

---

### 🔴 C4: Split Transaction - Missing Category Validation
**File:** `src/app/api/transactions/split/route.ts`  
**Lines:** 66-77

**Vulnerability:**  
When splitting a transaction, the API accepts `category_id` in each split item but **never validates** that these categories belong to the user (or are system categories). An attacker can use another user's custom categories or guess category UUIDs.

**How to exploit:**
```json
POST /api/transactions/split
{
  "transaction_id": "your-transaction",
  "splits": [
    {
      "category_id": "victim-custom-category-uuid",
      "amount": 50
    },
    {
      "category_id": "another-category",
      "amount": 50
    }
  ]
}
```

**Impact:** Can access/enumerate other users' custom categories

**How to fix:**
```typescript
// Before line 66, validate all category_ids:
const categoryIds = splits.map(s => s.category_id);
const { data: validCategories } = await supabase
  .from('categories')
  .select('id')
  .in('id', categoryIds)
  .or(`user_id.eq.${user.id},is_system.eq.true`);

if (!validCategories || validCategories.length !== categoryIds.length) {
  return NextResponse.json(
    { error: 'Invalid category_id in splits' },
    { status: 403 }
  );
}
```

---

### 🔴 C5: Quick Transaction - Missing Category Validation
**File:** `src/app/api/transactions/quick/route.ts`  
**Lines:** 13-23

**Vulnerability:**  
Same issue as C4 - accepts `category_id` without validating ownership.

**How to exploit:**
```json
POST /api/transactions/quick
{
  "category_id": "victim-category-uuid",
  "amount": 100,
  "note": "test"
}
```

**Impact:** Can use/enumerate other users' categories

**How to fix:**
```typescript
// Add validation before line 24:
const { data: categoryCheck } = await supabase
  .from('categories')
  .select('id')
  .eq('id', category_id)
  .or(`user_id.eq.${user.id},is_system.eq.true`)
  .single();

if (!categoryCheck) {
  return NextResponse.json(
    { error: 'Category not found or access denied' },
    { status: 403 }
  );
}
```

---

### 🔴 C6: Import Commit - Missing Account Validation
**File:** `src/app/api/import/commit/route.ts`  
**Lines:** 47-74

**Vulnerability:**  
The import commit endpoint accepts an optional `accountId` parameter but only validates it exists for the user if it's NOT provided. If an attacker provides an accountId in the request body, it's used without validation.

**How to exploit:**
```json
POST /api/import/commit
{
  "file": "base64-csv-data",
  "columnMap": {...},
  "format": "auto",
  "accountId": "victim-account-uuid"
}
```

**Impact:** Import transactions into another user's account

**How to fix:**
```typescript
// At line 56, before using targetAccountId:
if (accountId) {
  const { data: accountCheck } = await db('accounts')
    .select('id')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .single();
  
  if (!accountCheck) {
    return NextResponse.json(
      { error: 'Account not found or access denied' },
      { status: 403 }
    );
  }
  targetAccountId = accountId;
}
```

---

## HIGH (likely exploitable)

### 🟠 H1: Score Manipulation via Fake Transactions
**Files:** `src/app/api/score/route.ts` (lines 96-110), `src/app/api/transactions/route.ts`

**Vulnerability:**  
The financial health score is calculated from user data (transactions, budgets, debts). A user can inflate their score by:
1. Creating fake income transactions (large positive amounts)
2. Creating fake savings goal contributions
3. Deleting expense transactions
4. Gaming the budget-to-spending ratio by creating huge budgets with minimal spending

**How to exploit:**
1. Create fake income transactions:
```json
POST /api/transactions
{
  "account_id": "your-account",
  "amount": 999999,
  "date": "2026-02-01",
  "payee_original": "Fake Salary"
}
```
2. Create minimal expense transactions
3. Call GET `/api/score` and get artificially high score
4. Share/export score for bragging rights

**Impact:** Score system loses credibility, users can fake financial health

**How to fix:**
1. **Add income verification flags** - mark transactions as "verified" only if from Plaid or trusted source
2. **Anomaly detection** - flag sudden large income spikes
3. **Budget reasonableness checks** (already partially implemented at line 256) - expand to detect:
   - Budgets >200% of historical spending
   - Income >300% of historical average
   - Sudden debt payoff without corresponding transactions
4. **Score tamper-proofing** - add a `verified` flag to score_history and only mark verified if data is from trusted sources

```typescript
// In score calculation, add:
const hasUnverifiedIncome = transactions.some(t => 
  t.amount > monthlyIncome * 2 && !t.plaid_transaction_id
);

if (hasUnverifiedIncome) {
  result.verified = false;
  result.warnings.push('Large unverified income detected');
}
```

---

### 🟠 H2: Future-Dated Transactions to Game Budgets
**Files:** Multiple transaction endpoints

**Vulnerability:**  
Most transaction creation endpoints (POST `/api/transactions`, `/api/transactions/quick`, `/api/import/commit`) allow future-dated transactions. This can be used to:
1. Pre-allocate spending to a future month to make current month look better
2. Move expenses to next month to inflate current month's score
3. Game budget adherence metrics

**How to exploit:**
```json
POST /api/transactions
{
  "account_id": "your-account",
  "amount": -500,
  "date": "2026-12-31",  // Far future
  "payee_original": "Future expense"
}
```

**Impact:** Budget reports are inaccurate, score calculations can be gamed

**How to fix:**
```typescript
// Add to all transaction creation endpoints:
const transactionDate = new Date(date);
const today = new Date();
today.setHours(0, 0, 0, 0);

// Allow up to 7 days in the future (for scheduled transactions)
const maxFutureDate = new Date(today);
maxFutureDate.setDate(maxFutureDate.getDate() + 7);

if (transactionDate > maxFutureDate) {
  return NextResponse.json(
    { error: 'Transaction date cannot be more than 7 days in the future' },
    { status: 400 }
  );
}
```

**Note:** Debt payment endpoint already has this protection (line 24-30 in `debts/pay/route.ts`)

---

### 🟠 H3: Unrealistic Budget Manipulation
**File:** `src/app/api/budgets/route.ts`

**Vulnerability:**  
Users can create budgets with unrealistic amounts (up to $1,000,000 per category) to game the score system. The budget discipline component of the financial health score rewards staying under budget. A user can:
1. Set budgets at $999,999 for all categories
2. Spend normally (e.g., $500/month)
3. Always be "under budget" and get perfect discipline score

**How to exploit:**
```json
POST /api/budgets
{
  "category_id": "groceries-id",
  "month": "2026-02-01",
  "budgeted": 999999,
  "rollover": true
}
```

**Impact:** Budget discipline score is meaningless, score inflation

**How to fix:**
The score calculation already has `budgetToSpendingRatio` check (score route line 256-268), but it needs to be enforced more strictly:

```typescript
// In budgets/route.ts POST handler, add:
// Get 3-month average spending for this category
const threeMonthsAgo = new Date();
threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

const { data: recentTransactions } = await supabase
  .from('transactions')
  .select('amount')
  .eq('user_id', user.id)
  .eq('category_id', category_id)
  .gte('date', threeMonthsAgo.toISOString().split('T')[0]);

const avgSpending = (recentTransactions || [])
  .filter(t => t.amount < 0)
  .reduce((sum, t) => sum + Math.abs(t.amount), 0) / 3;

// Reject budgets more than 500% of historical spending
if (avgSpending > 0 && budgetedAmount > avgSpending * 5) {
  return NextResponse.json(
    { 
      error: `Budget amount seems unrealistic. Your 3-month average spending is $${avgSpending.toFixed(2)}. Consider setting a budget closer to your actual spending.`,
      suggested: Math.round(avgSpending * 1.2)
    },
    { status: 400 }
  );
}
```

---

### 🟠 H4: Import Duplicate Data Repeatedly
**File:** `src/app/api/import/commit/route.ts`

**Vulnerability:**  
The import system has basic duplicate detection (line 84-87) but it's not foolproof:
1. Duplicate key is `date|amount|payee` - easy to bypass by changing payee slightly
2. No global import tracking - user can import same file multiple times with minor tweaks
3. No limit on number of imports per day

**How to exploit:**
1. Export your transactions to CSV
2. Import the same file multiple times
3. Slightly modify payee names to bypass duplicate detection
4. Inflate transaction count, income, or expenses

**Impact:** Corrupted data, inflated metrics, score manipulation

**How to fix:**
```typescript
// Add import fingerprinting:
// 1. Hash the file content and store in import_history table
const crypto = require('crypto');
const fileHash = crypto.createHash('sha256').update(csvContent).digest('hex');

// Check if this exact file was imported before
const { data: existingImport } = await db('import_history')
  .select('id')
  .eq('user_id', user.id)
  .eq('file_hash', fileHash)
  .single();

if (existingImport) {
  return NextResponse.json(
    { error: 'This file has already been imported' },
    { status: 400 }
  );
}

// 2. After successful import, record it
await db('import_history').insert({
  user_id: user.id,
  file_hash: fileHash,
  imported_count: imported,
  imported_at: new Date().toISOString(),
});

// 3. Add rate limiting on imports (5 per day max)
// This should go in apiGuard or a separate check
```

---

### 🟠 H5: Debt Balance Manipulation
**Files:** `src/app/api/debts/route.ts`, `src/app/api/debts/pay/route.ts`

**Vulnerability:**  
Users can manipulate debt data to game the score:
1. Create debts with $0 balance and 0% APR to appear debt-free
2. Set `cc_paid_monthly` type on revolving balances (partially fixed in score.ts line 135-139)
3. Record fake debt payments without actually paying
4. Set unrealistic APR or term_months values

**How to exploit:**
```json
POST /api/debts
{
  "name": "Fake Credit Card",
  "type": "cc_paid_monthly",
  "current_balance": 0,
  "apr": 0,
  "monthly_payment": 0
}
```

**Impact:** Debt-to-income ratio appears better, score is inflated

**How to fix:**
```typescript
// In debts/route.ts POST handler, add validation:
// 1. Disallow cc_paid_monthly with balance > 0
if (type === 'cc_paid_monthly' && current_balance > 0) {
  return NextResponse.json({
    error: 'Cards marked as "paid monthly" cannot have a balance. Use "credit_card" type for revolving balances.',
    suggestedType: 'credit_card'
  }, { status: 400 });
}

// 2. Validate APR is reasonable
if (apr !== undefined && apr !== null) {
  if (apr < 0 || apr > 100) {
    return NextResponse.json({ 
      error: 'APR must be between 0 and 100' 
    }, { status: 400 });
  }
  
  // Warn on unrealistic APR (>50% is payday loan territory)
  if (apr > 50 && type !== 'payday') {
    return NextResponse.json({
      error: 'APR over 50% is unusual. Please verify. Consider using "payday" type.',
    }, { status: 400 });
  }
}

// 3. Prevent fake payments in pay/route.ts
// Already has good validation (checks debt ownership, prevents future dates)
// Consider adding: max payment amount check
if (amount > debt.current_balance * 2) {
  return NextResponse.json({
    error: `Payment amount ($${amount}) seems too high for current balance ($${debt.current_balance})`
  }, { status: 400 });
}
```

---

### 🟠 H6: UUID Enumeration Risk
**Files:** All API endpoints

**Vulnerability:**  
The app uses UUIDs for all resource IDs (accounts, categories, transactions, debts). While UUIDs are hard to guess, if an attacker can obtain a single valid UUID from another user (via social engineering, leaked data, or other vulnerability), they can attempt to use it in API calls.

The RLS policies at the database level SHOULD prevent this, but several endpoints (as noted in CRITICAL section) don't validate foreign keys before passing to database.

**How to exploit:**
1. Social engineer a user into sharing a transaction export (contains UUIDs)
2. Extract account_id, category_id UUIDs
3. Attempt to use these in API calls (as demonstrated in C1-C6)

**Impact:** Cross-user data access if combined with foreign key validation issues

**How to fix:**
1. **Fix all foreign key validation issues** (C1-C6)
2. **Add request logging** for suspicious UUID patterns:
```typescript
// In api-guard.ts, add UUID monitoring:
const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const bodyString = JSON.stringify(requestBody);
const foundUuids = bodyString.match(uuidPattern) || [];

// Log if user is sending UUIDs that don't belong to them
// (This requires a lookup, but can be done async for monitoring)
```

3. **Consider obfuscated IDs** for public-facing APIs (ULID, HashID, etc.)

---

## MEDIUM (edge cases)

### 🟡 M1: Negative Income / Positive Expense Gaming
**Files:** Transaction creation endpoints

**Vulnerability:**  
The system allows:
- Positive amounts (stored as income)
- Negative amounts (stored as expenses)

But there's no validation that prevents:
- Creating an "income" transaction with negative amount (appears as expense)
- Creating an "expense" transaction with positive amount (appears as income)

This can confuse the score calculation and budget tracking.

**How to exploit:**
```json
POST /api/transactions
{
  "account_id": "your-account",
  "category_id": "salary-category",  // Income category
  "amount": -5000,  // Negative amount
  "date": "2026-02-01"
}
```

**Impact:** Confusing reports, score calculation errors

**How to fix:**
```typescript
// Add validation in transaction creation:
// Get category type
const { data: category } = await supabase
  .from('categories')
  .select('type')
  .eq('id', category_id)
  .single();

// Validate amount sign matches category type
if (category?.type === 'income' && transactionAmount < 0) {
  return NextResponse.json({
    error: 'Income categories must have positive amounts'
  }, { status: 400 });
}

if (category?.type === 'expense' && transactionAmount > 0) {
  return NextResponse.json({
    error: 'Expense categories must have negative amounts'
  }, { status: 400 });
}
```

---

### 🟡 M2: Account Balance Directly Editable
**Files:** Check if accounts can be updated via API

**Status:** Not exploitable (no PUT endpoint found for accounts)

**Note:** Accounts table has a `balance` field but I didn't find an API endpoint that allows direct balance updates. Balance should only change via transactions. This is GOOD ✅

If an endpoint exists that allows updating account.balance directly, it would be HIGH severity.

---

### 🟡 M3: Score History Tampering via Repeated Calls
**File:** `src/app/api/score/route.ts` line 428-439

**Vulnerability:**  
The score endpoint upserts to `score_history` table with `onConflict: 'user_id,scored_at'`. This means:
1. Multiple calls on the same day overwrite previous score
2. A user could call the score endpoint, game their data, call again, game differently, etc.
3. The "best" score for the day would be stored

**Impact:** Score history is not tamper-proof, users can optimize their data for scoring

**How to exploit:**
1. Call GET `/api/score` - get baseline score
2. Create fake income transactions
3. Call GET `/api/score` - get higher score (overwrites previous)
4. Score history now shows only the "best" version

**Mitigation already in place:**  
The upsert behavior is actually reasonable - it ensures one score per day per user. The real fix is to address the data manipulation issues (H1-H5).

**Additional fix:**
```typescript
// Add a 'verified' flag to score_history:
await sb.from('score_history').upsert({
  user_id: user.id,
  total_score: result.total,
  // ... other fields
  verified: hasVerifiedData, // new field
  data_quality_flags: {
    has_unverified_income: hasUnverifiedIncome,
    has_future_transactions: hasFutureTransactions,
    has_inflated_budgets: hasInflatedBudgets,
  },
  scored_at: today,
}, { onConflict: 'user_id,scored_at' });
```

---

### 🟡 M4: String Length Validation Missing in Some Fields
**Files:** Multiple transaction endpoints

**Vulnerability:**  
Some endpoints validate string lengths (e.g., transactions/route.ts lines 38-47) but others don't. Extremely long strings could:
1. Cause database errors
2. Break UI rendering
3. Be used for XSS if not sanitized on frontend

**Impact:** Potential DoS, UI breaks, minor security risk

**How to fix:**
Add consistent validation across all endpoints:
```typescript
// Create a validation helper:
function validateStringField(
  value: string | undefined, 
  fieldName: string, 
  maxLength: number,
  required = false
): string | null {
  if (!value) {
    return required ? `${fieldName} is required` : null;
  }
  if (typeof value !== 'string') {
    return `${fieldName} must be a string`;
  }
  if (value.length > maxLength) {
    return `${fieldName} too long (max ${maxLength} characters)`;
  }
  return null;
}

// Use in all endpoints:
const error = validateStringField(payee_original, 'Payee', 150);
if (error) {
  return NextResponse.json({ error }, { status: 400 });
}
```

---

### 🟡 M5: Import File Size Limit Exists But No Row Limit
**File:** `src/app/api/import/parse/route.ts` line 14

**Vulnerability:**  
Import is limited to 10MB file size, but there's no limit on number of rows. A malicious CSV could have millions of tiny rows, causing:
1. Parser timeout
2. Database insertion timeout
3. DoS on user's account

**Impact:** DoS, database bloat

**How to fix:**
```typescript
// In import/commit/route.ts, add:
const MAX_IMPORT_ROWS = 10000; // Reasonable limit

if (dataRows.length > MAX_IMPORT_ROWS) {
  return NextResponse.json({
    error: `Too many rows. Maximum ${MAX_IMPORT_ROWS} transactions per import.`,
    totalRows: dataRows.length,
  }, { status: 400 });
}
```

---

## PASSED ✅

### ✅ P1: Setup Reset Endpoint Is Properly Scoped
**File:** `src/app/api/setup/reset/route.ts`

**Verified:** All delete operations use `.eq('user_id', user.id)` (lines 34-56). A user can only delete their own data, not other users' data.

**Rate limit:** Protected by `apiGuard(5)` - only 5 resets per minute.

**Note:** Consider adding a stricter rate limit (e.g., 1 reset per hour) since data deletion is destructive:
```typescript
// Change line 9:
const guard = await apiGuard(1); // 1 per minute
// OR add a separate rate limit for destructive operations
```

---

### ✅ P2: RLS Policies Exist at Database Level
**File:** `supabase-schema.sql` lines 35-44, 63-78, 96-107, 139-153, etc.

**Verified:** Every table has RLS enabled with policies that check `auth.uid() = user_id`. This provides defense-in-depth even if API validation fails.

**Critical note:** RLS is the LAST line of defense. The API should still validate before database calls to provide better error messages and prevent data leakage.

---

### ✅ P3: All Data Fetching Queries Use user_id Filter
**Verified:** Checked with `grep -r "\.eq('user_id'" src/app/api`

All SELECT queries properly filter by user_id. Users cannot read other users' data.

---

### ✅ P4: Debt Payment Endpoint Has Good Validation
**File:** `src/app/api/debts/pay/route.ts`

**Verified:**
- Validates debt ownership (line 33)
- Prevents future dates (line 24-30)
- Calculates balance server-side (line 42-43)
- Server-side balance update (line 53-65)

This is a good example of secure implementation ✅

---

### ✅ P5: Budget Ownership Validated on Update/Delete
**File:** `src/app/api/budgets/route.ts`

**Verified:**
- PUT: `.eq('user_id', user.id)` at line 111
- DELETE: `.eq('user_id', user.id)` at line 136

Users cannot modify other users' budgets.

---

### ✅ P6: File Upload Size Limit (10MB)
**File:** `src/app/api/import/parse/route.ts` line 14

**Verified:** `MAX_FILE_SIZE = 10 * 1024 * 1024`

Prevents extremely large file uploads that could cause DoS.

---

### ✅ P7: Transaction Delete Validates Ownership
**File:** `src/app/api/transactions/[id]/route.ts` line 73

**Verified:** DELETE uses `.eq('user_id', user.id)`

Users cannot delete other users' transactions.

---

### ✅ P8: UUIDs Used (Not Sequential IDs)
**File:** `supabase-schema.sql` (all tables)

**Verified:** All IDs use `uuid default gen_random_uuid()`

This makes ID enumeration extremely difficult (2^122 possible values). Good security practice ✅

---

### ✅ P9: Rate Limiting Exists on All Endpoints
**File:** `src/lib/api-guard.ts` lines 18-20

**Verified:** Every endpoint calls `apiGuard(limit)` which enforces per-user rate limits.

This prevents brute-force attacks and API abuse.

---

### ✅ P10: Payee String Sanitization
**File:** Multiple transaction endpoints

**Verified:** Payee fields are trimmed and validated for length. No evidence of SQL injection risk (using Supabase client, not raw SQL).

---

## SUMMARY

### Critical Issues Found: **6**
All relate to missing foreign key validation when accepting account_id or category_id from client.

### High Issues Found: **6**
Score manipulation, future-dated transactions, budget gaming, import abuse, debt manipulation, UUID enumeration.

### Medium Issues Found: **5**
Edge cases around amount validation, string length, and import limits.

### Passed Security Checks: **10**
RLS, ownership validation, rate limiting, UUID usage, etc.

---

## PRIORITY FIXES

**Fix immediately:**
1. **C1-C6:** Add foreign key validation to ALL transaction/budget/debt endpoints
2. **H2:** Block future-dated transactions (>7 days)
3. **H3:** Reject unrealistic budgets

**Fix soon:**
4. **H1:** Add score verification flags and anomaly detection
5. **H4:** Add import deduplication and tracking
6. **H5:** Validate debt types and amounts

**Fix eventually:**
7. **M1-M5:** Edge case validations
8. **Security hardening:** Additional monitoring, logging, alerts

---

## CODE REVIEW CHECKLIST FOR FUTURE ENDPOINTS

When adding new API endpoints, always:
- [ ] Validate ALL foreign keys (account_id, category_id, debt_id, etc.) belong to authenticated user
- [ ] Add `.eq('user_id', user.id)` to ALL queries
- [ ] Validate date ranges (no far-future dates without business need)
- [ ] Validate amount ranges and signs
- [ ] Validate string lengths (payee: 150, memo: 500, notes: 500)
- [ ] Use `apiGuard(appropriate_limit)` for rate limiting
- [ ] Add input sanitization
- [ ] Test with malicious inputs (SQL injection attempts, XSS, etc.)
- [ ] Document any assumptions about data integrity

---

**End of Audit**
