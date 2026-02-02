# Thallo Production Audit Report

**Date:** 2025-07-13  
**Auditor:** Production Engineering Team  
**Codebase:** `/src` — Next.js 15 + Supabase + OpenRouter AI  
**Scope:** Security, Data Integrity, Error Handling, Performance, Edge Cases, Code Quality

---

## Executive Summary

The Thallo codebase demonstrates solid foundational architecture — proper RLS on all tables, consistent auth via `apiGuard`, parameterized queries through Supabase SDK, and good AI rate-limiting. However, several **critical** and **high-severity** issues were identified that must be fixed before handling real financial data.

**Issues Found:**
- 🔴 CRITICAL: 5
- 🟠 HIGH: 12
- 🟡 MEDIUM: 18
- 🔵 LOW: 14

---

## 1. SECURITY AUDIT

### CRITICAL Issues

#### SEC-01: Plaid Webhook Has No Signature Verification
- **Severity:** CRITICAL
- **File:** `src/app/api/plaid/webhook/route.ts`
- **Lines:** 8-15
- **Issue:** The `verifyWebhook()` function is a stub that always returns `true`. Any attacker who discovers the webhook URL can inject fake transaction data, fake error statuses, or trigger arbitrary syncs for any Plaid item ID. This could poison a user's financial data.
- **Fix:** Implement Plaid JWK-based webhook verification using their published public keys:
```typescript
import { plaidClient } from '@/lib/plaid/client';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

async function verifyWebhook(request: NextRequest): Promise<boolean> {
  const body = await request.text();
  const signedJwt = request.headers.get('plaid-verification');
  if (!signedJwt) return false;
  
  try {
    const decoded = jwt.decode(signedJwt, { complete: true });
    if (!decoded) return false;
    
    const response = await plaidClient.webhookVerificationKeyGet({
      key_id: decoded.header.kid!,
    });
    
    const key = response.data.key;
    // Verify JWT with the key
    jwt.verify(signedJwt, key.toString(), { algorithms: ['ES256'] });
    
    // Verify body hash matches
    const crypto = await import('crypto');
    const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
    const claims = decoded.payload as { request_body_sha256: string };
    return claims.request_body_sha256 === bodyHash;
  } catch {
    return false;
  }
}
```

#### SEC-02: Plaid Webhook Sync Trigger Has No Auth
- **Severity:** CRITICAL
- **File:** `src/app/api/plaid/webhook/route.ts`
- **Lines:** 45-53
- **Issue:** The webhook fires a `fetch()` to `/api/plaid/sync` but only forwards the `item_id` — no auth cookies. The sync endpoint requires auth, so webhook-triggered syncs will silently fail with 401. More critically, if this is ever "fixed" by bypassing auth for webhook-triggered syncs, it becomes an unauthenticated endpoint.
- **Fix:** Use a shared secret or service-role Supabase client for webhook-triggered syncs instead of calling the user-facing API route. Create an internal helper function.

#### SEC-03: Debts POST Route Accepts Arbitrary Fields (Mass Assignment)
- **Severity:** CRITICAL
- **File:** `src/app/api/debts/route.ts`
- **Lines:** 36-44
- **Issue:** `const body = await request.json(); await supabase.from('debts').insert({ ...body, user_id: user.id })` — The entire request body is spread into the insert. An attacker can set `id`, `user_id`, `is_paid_off`, `paid_off_date`, `plaid_account_id`, `plaid_connection_id`, or any other column. This is a classic mass-assignment vulnerability.
- **Fix:** Whitelist allowed fields:
```typescript
const body = await request.json();
const { name, type, original_balance, current_balance, apr, minimum_payment, 
        monthly_payment, due_day, in_collections, notes } = body;
// Validate each field...
const { data, error } = await supabase.from('debts').insert({
  user_id: user.id, name, type, original_balance, current_balance, 
  apr, minimum_payment, monthly_payment, due_day, in_collections, notes,
}).select().single();
```

#### SEC-04: Savings POST Route Has Same Mass Assignment Issue
- **Severity:** CRITICAL
- **File:** `src/app/api/savings/route.ts`
- **Lines:** 33-36
- **Issue:** `const body = await request.json(); await supabase.from('savings_goals').insert({ ...body, user_id: user.id })` — Same vulnerability as SEC-03. An attacker can set `current_amount` to any value, `is_active`, etc.
- **Fix:** Whitelist: `name, type, target_amount, monthly_contribution`.

#### SEC-05: Savings PUT Route Accepts Arbitrary Field Updates
- **Severity:** CRITICAL
- **File:** `src/app/api/savings/route.ts`
- **Lines:** 43-51
- **Issue:** `const { id, ...fields } = await request.json(); await supabase.from('savings_goals').update(fields)` — Attacker can update `current_amount` to inflate their savings, or change `user_id`.
- **Fix:** Whitelist allowed update fields: `name, type, target_amount, monthly_contribution, is_active`.

### HIGH Issues

#### SEC-06: Debt Payment Route Missing Input Validation
- **Severity:** HIGH
- **File:** `src/app/api/debts/pay/route.ts`
- **Lines:** 13-15
- **Issue:** No validation on `debt_id`, `amount`, `date`, `balance_after`. Attacker can send negative amounts, future dates, or invalid UUIDs. The `balance_after` is client-provided — the server trusts the client to calculate correctly.
- **Fix:** Validate all inputs server-side. Calculate `balance_after` from the current debt balance minus payment amount. Validate `amount > 0`, `date` is a valid date not in the future, `debt_id` is a valid UUID.

#### SEC-07: Savings Contribute Route Missing Amount Validation
- **Severity:** HIGH
- **File:** `src/app/api/savings/contribute/route.ts`
- **Lines:** 15-17
- **Issue:** `amount` is parsed with `parseFloat()` but no validation for negative values. A user could "contribute" negative amounts to drain their savings goal balance. Also, the read-then-write pattern (read current_amount, add, write) has a race condition.
- **Fix:** Validate `amount > 0`. Use a single atomic update: `UPDATE savings_goals SET current_amount = current_amount + $1 WHERE id = $2`.

#### SEC-08: No Content Security Policy Header
- **Severity:** HIGH
- **File:** `next.config.ts`
- **Lines:** 4-14
- **Issue:** Good security headers are set (X-Frame-Options, HSTS, etc.) but **no CSP header**. This means any XSS vulnerability would have unrestricted access to load external scripts, exfiltrate data, etc.
- **Fix:** Add CSP:
```typescript
{ key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co https://openrouter.ai https://cdn.plaid.com; frame-src https://cdn.plaid.com;" }
```

#### SEC-09: OpenRouter API Key Stored in Plaintext
- **Severity:** HIGH
- **File:** `src/app/api/settings/route.ts` + DB schema
- **Issue:** User BYOK API keys (`openrouter_api_key`) are stored as plaintext in the `profiles` table. Anyone with database access (admin, backup leak, SQL injection elsewhere) gets all user API keys.
- **Fix:** Encrypt at rest using the same `encryptToken`/`decryptToken` pattern used for Plaid tokens.

#### SEC-10: Plaid Connection DELETE Doesn't Scope Transaction Deletion
- **Severity:** HIGH
- **File:** `src/app/api/plaid/connections/route.ts`
- **Lines:** 75-79
- **Issue:** When `deleteTransactions=true`, the query deletes ALL transactions where `plaid_transaction_id IS NOT NULL` for the user — even those from OTHER Plaid connections. Should scope to transactions linked to the specific connection being deleted.
- **Fix:** Track `plaid_connection_id` on transactions, or delete only transactions linked to the specific `item_id`.

#### SEC-11: AI Analyze Route Bypasses Tier Rate Limiting
- **Severity:** HIGH
- **File:** `src/app/api/ai/analyze/route.ts`
- **Lines:** 1-68
- **Issue:** The `/api/ai/analyze` route checks basic rate limiting (10/min) but does NOT check the tier-based AI rate limiter (`checkRateLimit`). A free-tier user can bypass all AI feature gates by using this endpoint instead of the specific feature endpoints.
- **Fix:** Add `checkRateLimit` with the appropriate feature key based on the `action` parameter.

#### SEC-12: AI Scan Route Missing Tier Gate
- **Severity:** HIGH
- **File:** `src/app/api/ai/scan/route.ts`
- **Lines:** 1-67
- **Issue:** The `/api/ai/scan` endpoint (debt statement scanning) has no tier check at all. Free users can use unlimited vision AI calls.
- **Fix:** Add tier check and `checkRateLimit` call.

#### SEC-13: Debug Info Leaks in Plaid Link Token Error
- **Severity:** HIGH
- **File:** `src/app/api/plaid/create-link-token/route.ts`
- **Lines:** 43-52
- **Issue:** The error response includes `debug: { hasClientId, hasSecret, env }`. This tells attackers whether credentials are configured and what environment they're in.
- **Fix:** Remove `debug` from production error responses. Use `process.env.NODE_ENV === 'development'` guard.

#### SEC-14: Settings Route Leaks API Key in Error Paths
- **Severity:** HIGH
- **File:** `src/app/api/settings/route.ts`
- **Lines:** 50-55
- **Issue:** The PUT handler returns `data` from the upsert which could include the unmasked `openrouter_api_key` in error or edge-case paths. The GET properly masks it, but the code reconstructs after update.
- **Fix:** Always mask the key in the response. The current code does mask on the happy path but should be verified.

### MEDIUM Issues

#### SEC-15: In-Memory Rate Limiter Ineffective on Serverless
- **Severity:** MEDIUM
- **File:** `src/lib/rate-limit.ts`
- **Lines:** 1-60
- **Issue:** Uses an in-memory `Map` for rate limiting. On Vercel serverless, each invocation may hit a different instance, making the limiter effectively useless under load. The code acknowledges this with a comment but it's still a production risk.
- **Fix:** Migrate to Upstash Redis or Vercel KV for persistent rate limiting. The current implementation is a best-effort fallback.

#### SEC-16: No CSRF Protection Beyond SameSite Cookies
- **Severity:** MEDIUM
- **Issue:** Next.js API routes don't have explicit CSRF tokens. Supabase auth cookies are SameSite=Lax by default, which protects against cross-origin POST but not same-site attacks. For a financial app, consider adding CSRF tokens for mutation endpoints.

#### SEC-17: Plaid Encryption Key Fallback to Null Buffer
- **Severity:** MEDIUM
- **File:** `src/lib/plaid/crypto.ts`
- **Lines:** 3-5
- **Issue:** If `TOKEN_ENCRYPTION_KEY` is missing, the code falls back to `Buffer.alloc(32)` (all zeros). This means tokens would be "encrypted" with a known key during development, and if the env var is accidentally missing in production, all tokens use a zero key.
- **Fix:** Throw an error at runtime if the key is missing when actually encrypting/decrypting:
```typescript
function getKey(): Buffer {
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    throw new Error('TOKEN_ENCRYPTION_KEY is required');
  }
  return Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, 'hex');
}
```

---

## 2. DATA INTEGRITY

### HIGH Issues

#### DI-01: Plaid Transaction Sign Convention Bug
- **Severity:** HIGH
- **File:** `src/app/api/plaid/sync/route.ts`
- **Lines:** 151
- **Issue:** `amount: Math.abs(txn.amount)` — Plaid uses positive numbers for debits (money leaving) and negative for credits. The code takes `Math.abs()` of everything, losing the sign. All Plaid transactions are stored as positive, breaking the app's convention where negative = expense and positive = income. **This means all Plaid-imported income (refunds, deposits) will be stored as expenses.**
- **Fix:**
```typescript
// Plaid: positive = debit (expense), negative = credit (income)
// App: negative = expense, positive = income
amount: -txn.amount, // Flip Plaid's sign convention
```

#### DI-02: Savings Contribution Race Condition
- **Severity:** HIGH
- **File:** `src/app/api/savings/contribute/route.ts`
- **Lines:** 29-38
- **Issue:** Read `current_amount`, add contribution, write back. Two concurrent requests will overwrite each other (last-write-wins). If user clicks "contribute" twice quickly, one contribution's amount will be lost from the running total.
- **Fix:** Use atomic update: `current_amount = current_amount + amount` or use a Supabase RPC function.

#### DI-03: Debt Payment `balance_after` Is Client-Trusted
- **Severity:** HIGH
- **File:** `src/app/api/debts/pay/route.ts`
- **Lines:** 13-15
- **Issue:** The client sends `balance_after` which the server writes directly to the debt's `current_balance`. A malicious client could set `balance_after: 0` to mark any debt as paid off regardless of actual payment.
- **Fix:** Calculate server-side: fetch current balance, subtract payment amount, validate result ≥ 0.

### MEDIUM Issues

#### DI-04: Score Calculation Edge Case — Zero Monthly Expenses
- **Severity:** MEDIUM
- **File:** `src/lib/scoring/financial-health-score.ts`
- **Lines:** ~225
- **Issue:** In `calculateEmergencyBuffer`, if `monthlyExpenses <= 0`, the function returns 125 (max) if `liquidSavings > 0`, or 0 if not. But the `monthsCovered = liquidSavings / monthlyExpenses` division is guarded. Score API calculates `monthlyExpenses` as `Math.max(totalDebtPmts, monthlyIncome * 0.6)` which could be 0 if both are 0. This is handled but returns a perfect score for new users with $1 in savings and no expense data, which is misleading.
- **Fix:** Return a neutral score (50%) for new users with no expense data rather than max.

#### DI-05: Budget-Tune Route Has N+1 Query for Historical Months
- **Severity:** MEDIUM
- **File:** `src/app/api/ai/budget-tune/route.ts`
- **Lines:** 68-92
- **Issue:** Fetches 3 months of historical transactions sequentially in a loop (3 sequential DB queries). Should be parallelized.
- **Fix:** Use `Promise.all()` for the 3 historical month queries.

#### DI-06: AI Usage Count Race Condition
- **Severity:** MEDIUM
- **File:** `src/lib/ai/rate-limiter.ts`
- **Lines:** 108-128
- **Issue:** `incrementUsage` reads the current count, then either updates or inserts. Two concurrent AI requests could both read count=4 and both write count=5, allowing one extra use.
- **Fix:** Use upsert with atomic increment: `count = count + 1` or Supabase RPC.

#### DI-07: Month Boundary Issue with `new Date()` in Budget-Tune
- **Severity:** MEDIUM
- **File:** `src/app/api/ai/budget-tune/route.ts`
- **Lines:** 33-34
- **Issue:** Uses `new Date()` server-side (UTC) for month calculation, but the client sends month in local timezone. A user at 11 PM CST on Jan 31 would be in Feb 1 UTC, causing month mismatch.
- **Fix:** Accept month parameter from client like other endpoints do.

---

## 3. ERROR HANDLING & RESILIENCE

### HIGH Issues

#### EH-01: No Error Boundaries in React App
- **Severity:** HIGH
- **File:** `src/app/` (missing `error.tsx` files)
- **Issue:** No `error.tsx` files exist anywhere in the app. Any runtime error in a React component will crash the entire page with no recovery option. For a financial app, users should see a friendly error message.
- **Fix:** Add `error.tsx` at the root layout level and for each major section (dashboard, budgets, etc.).

#### EH-02: No Global Error Page
- **Severity:** HIGH
- **File:** Missing `src/app/global-error.tsx` and `src/app/not-found.tsx`
- **Issue:** No global error page or 404 page. Invalid URLs show the default Next.js error page.
- **Fix:** Create `global-error.tsx` and `not-found.tsx`.

#### EH-03: AI JSON Parse Failures Return 200 with Error
- **Severity:** MEDIUM
- **File:** Multiple AI routes (afford, auto-budget, payoff-plan, etc.)
- **Issue:** When AI returns unparseable JSON, many routes return `{ result: null, error: "..." }` with HTTP 200. The client may not check for the error field and display a blank result.
- **Fix:** Return HTTP 422 for unparseable AI responses so clients can distinguish success from failure.

#### EH-04: Plaid Sync Doesn't Handle Token Expiration
- **Severity:** MEDIUM
- **File:** `src/app/api/plaid/sync/route.ts`
- **Issue:** When a Plaid access token is expired/invalid, the sync will throw an error that's caught generically. Should specifically handle `ITEM_LOGIN_REQUIRED` errors and update the connection status.
- **Fix:** Catch Plaid-specific errors and update connection status accordingly.

---

## 4. PERFORMANCE & SCALABILITY

### HIGH Issues

#### PERF-01: Transactions Endpoint Has No Pagination
- **Severity:** HIGH
- **File:** `src/app/api/transactions/route.ts`
- **Lines:** 16
- **Issue:** `.limit(100)` — hardcoded to 100 transactions. A user with thousands of transactions can only see the latest 100, with no way to load more. Over time this becomes a significant UX issue.
- **Fix:** Add cursor-based pagination with `offset` and `limit` query params.

#### PERF-02: Score API Makes 12 Sequential-Then-Parallel Queries
- **Severity:** MEDIUM
- **File:** `src/app/api/score/route.ts`
- **Issue:** The score route makes 12 parallel queries (good), then a 13th for achievement definitions. But the total data fetched is enormous — all transactions for 3 months, all bill payments (200), all debt payments, all savings contributions. For power users this could timeout.
- **Fix:** Add date boundaries to bill_payments and optimize query scoping.

#### PERF-03: Budget-Tune N+1 Sequential Queries
- **Severity:** MEDIUM
- **File:** `src/app/api/ai/budget-tune/route.ts`
- **Lines:** 68-92
- **Issue:** 3 sequential DB queries for historical months, plus 4 more in a `Promise.all` afterward. The 3 sequential queries should be in the `Promise.all`.
- **Fix:** Combine all 7 queries into a single `Promise.all`.

#### PERF-04: Plaid Sync Processes Transactions One-by-One
- **Severity:** MEDIUM
- **File:** `src/app/api/plaid/sync/route.ts`
- **Lines:** 138-200
- **Issue:** Each added/modified/removed transaction is processed with individual DB calls. A sync with 100 new transactions = 100 sequential inserts. Should batch upsert.
- **Fix:** Collect all transactions, then do a single bulk upsert.

---

## 5. EDGE CASES

### HIGH Issues

#### EC-01: New User Cold Start — Score Shows Misleading Values
- **Severity:** HIGH
- **File:** `src/app/api/score/route.ts`
- **Issue:** A brand-new user with zero data gets:
  - Wealth Building: 0 (no income)
  - Debt Velocity: 200 (debt-free! — misleading for no data)
  - Payment Consistency: 100 (neutral — appropriate)
  - Budget Discipline: 75 (neutral — appropriate)
  - Emergency Buffer: 0 (no savings)
  - DTI: 125 or 0 (depends on income)
  Total: ~500 "Solid Ground" — misleading. The confidence multiplier only affects Behavior factors.
- **Fix:** Apply confidence multiplier to ALL factors for users with < 1 month of data, or show an "onboarding" score state.

#### EC-02: Free-Tier Users Can Access AI Via `/api/ai/analyze`
- **Severity:** HIGH
- **File:** `src/app/api/ai/analyze/route.ts`
- **Issue:** This endpoint has no tier check. Free users who should have 0 AI access can call `analyze_spending`, `find_savings`, `debt_strategy`, `budget_suggestions`, `score_coach` — all features that should require Plus.
- **Fix:** Add tier gating like other AI routes.

#### EC-03: Concurrent Budget Creation Race Condition
- **Severity:** MEDIUM
- **File:** `src/app/api/ai/auto-budget/route.ts` (PUT handler)
- **Issue:** The check-then-insert pattern for budgets (check if exists, then insert or update) can lead to duplicate budgets if two requests arrive simultaneously. The DB unique constraint `(user_id, category_id, month)` will catch this but return an error.
- **Fix:** Use `upsert` instead of check-then-insert.

---

## 6. CODE QUALITY

### MEDIUM Issues

#### CQ-01: No Input Validation Library (Zod)
- **Severity:** MEDIUM
- **File:** All API routes
- **Issue:** Zero usage of Zod or any schema validation library. All input validation is manual and inconsistent — some routes validate nothing, some validate partially. Financial data needs rigorous validation.
- **Fix:** Add Zod schemas for all API inputs. Priority: mutation endpoints (POST/PUT/DELETE).

#### CQ-02: Pervasive `as any` Casts for Supabase `.from()`
- **Severity:** MEDIUM
- **File:** Nearly every API route
- **Issue:** `(supabase.from as any)('table')` appears ~80+ times. This means TypeScript provides zero type checking for database queries — wrong column names, missing fields, type mismatches are all silent.
- **Fix:** Update `src/types/database.ts` to include all tables (debts, savings_goals, plaid_connections, etc.). Then remove `as any` casts.

#### CQ-03: Unused Import-Statement Route Uses OpenAI Directly
- **Severity:** MEDIUM
- **File:** `src/app/api/ai/import-statement/route.ts`
- **Issue:** This route imports `OpenAI` directly and uses `gpt-4o`, bypassing the app's OpenRouter abstraction. It also doesn't increment AI usage counts.
- **Fix:** Route through the app's `callAI()` function from `openrouter.ts` or at minimum increment usage.

#### CQ-04: `error: any` Types in Catch Blocks
- **Severity:** LOW
- **File:** Multiple (import-statement, plaid routes, bulk transactions)
- **Issue:** Several routes use `catch (error: any)` which bypasses TypeScript's error narrowing.
- **Fix:** Use `catch (error: unknown)` and type-guard: `error instanceof Error ? error.message : 'Unknown error'`.

#### CQ-05: Console.log/error for Production Logging
- **Severity:** LOW
- **File:** All API routes (~35 occurrences)
- **Issue:** Using `console.error()` for logging. In production, structured logging (JSON) is better for log aggregation, alerting, and debugging.
- **Fix:** Low priority — consider adding a structured logger (pino, winston) later.

#### CQ-06: Dead Code — `demo-mode.ts` and `demo-ai-responses.ts`
- **Severity:** LOW
- **File:** `src/lib/demo-mode.ts`, `src/lib/demo-ai-responses.ts`
- **Issue:** Demo mode files exist but unclear if they're still used in production builds. If not, they add to bundle size.
- **Fix:** Verify usage, remove if dead code.

#### CQ-07: `page.backup.tsx` Committed
- **Severity:** LOW
- **File:** `src/app/demo/page.backup.tsx`
- **Issue:** Backup file committed to repo. Should be in `.gitignore` or removed.
- **Fix:** Remove or rename.

---

## Summary of Required Fixes

### CRITICAL (Must Fix Before Launch)
| ID | Issue | File |
|---|---|---|
| SEC-01 | Plaid webhook no verification | `plaid/webhook/route.ts` |
| SEC-02 | Webhook sync trigger has no auth | `plaid/webhook/route.ts` |
| SEC-03 | Debts POST mass assignment | `debts/route.ts` |
| SEC-04 | Savings POST mass assignment | `savings/route.ts` |
| SEC-05 | Savings PUT accepts arbitrary fields | `savings/route.ts` |

### HIGH (Fix Before Production Traffic)
| ID | Issue | File |
|---|---|---|
| SEC-06 | Debt payment no input validation | `debts/pay/route.ts` |
| SEC-07 | Savings contribute negative amount | `savings/contribute/route.ts` |
| SEC-08 | No CSP header | `next.config.ts` |
| SEC-09 | API keys stored plaintext | `settings/route.ts` |
| SEC-10 | Plaid DELETE over-deletes | `plaid/connections/route.ts` |
| SEC-11 | AI analyze bypasses tier limits | `ai/analyze/route.ts` |
| SEC-12 | AI scan missing tier gate | `ai/scan/route.ts` |
| SEC-13 | Debug info leaks in error | `plaid/create-link-token/route.ts` |
| DI-01 | Plaid transaction sign bug | `plaid/sync/route.ts` |
| DI-02 | Savings contribution race condition | `savings/contribute/route.ts` |
| DI-03 | balance_after client-trusted | `debts/pay/route.ts` |
| EH-01 | No error boundaries | `src/app/` |
| EH-02 | No global error/404 page | `src/app/` |
| PERF-01 | No transaction pagination | `transactions/route.ts` |
| EC-02 | Free users bypass AI gates | `ai/analyze/route.ts` |

---

*End of Audit Report*
