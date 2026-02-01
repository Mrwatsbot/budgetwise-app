# BudgetWise Security Architecture

> **Last updated:** January 29, 2026
> **Version:** 1.0

## Our Commitment

BudgetWise is designed with a **privacy-first, zero-knowledge** approach to financial data. We do not sell, share, or expose personal financial information. All AI processing uses anonymized, aggregated data — never raw personal details.

---

## 1. Authentication & Access Control

### Supabase Authentication
- **JWT-based auth** via Supabase Auth (industry-standard)
- Passwords are hashed with **bcrypt** (handled by Supabase, never stored in plain text)
- Session tokens are **HttpOnly, Secure, SameSite=Lax** cookies
- Tokens are verified server-side on every API request via `supabase.auth.getUser()`

### Middleware Protection
- All protected routes (`/dashboard`, `/transactions`, `/budgets`, `/debts`, `/savings`, `/score`, `/settings`, `/api/*`) are gated by Next.js middleware
- Unauthenticated requests are redirected to `/login`
- Auth pages redirect authenticated users to `/dashboard`

---

## 2. Row-Level Security (RLS)

Every database table has **Row-Level Security enabled** with policies that scope all queries to the authenticated user:

| Table | Policy |
|-------|--------|
| `profiles` | Users can only read/update their own profile |
| `accounts` | Full CRUD scoped to `user_id` |
| `transactions` | Full CRUD scoped to `user_id` |
| `budgets` | Full CRUD scoped to `user_id` |
| `debts` | Full CRUD scoped to `user_id` |
| `debt_payments` | Full CRUD scoped to `user_id` |
| `savings_goals` | Full CRUD scoped to `user_id` |
| `savings_contributions` | Full CRUD scoped to `user_id` |
| `bills` | Full CRUD scoped to `user_id` |
| `bill_payments` | Full CRUD scoped to `user_id` |
| `payee_rules` | Full CRUD scoped to `user_id` |
| `ai_usage` | Read + insert scoped to `user_id` |
| `score_history` | Read + insert scoped to `user_id` |
| `user_achievements` | Read + insert scoped to `user_id` |
| `streaks` | Full CRUD scoped to `user_id` |
| `user_challenges` | Full CRUD scoped to `user_id` |
| `categories` | System categories are public (read-only); user-created categories scoped to `user_id` |
| `achievement_definitions` | Public read-only (reference data) |
| `challenge_definitions` | Public read-only (reference data) |

**What this means:** Even if an attacker obtains the public anon key (which is in the browser bundle by design), they can ONLY access data belonging to their own authenticated session. Cross-user data access is **impossible** at the database level.

---

## 3. AI Data Privacy — Zero PII Policy

### What We Send to AI Models
BudgetWise uses third-party AI models (via OpenRouter) for insights, coaching, and automation. **We never send personally identifiable information (PII) to any AI provider.**

Before any data reaches an AI model, it is **anonymized server-side**:

| Data Type | What We Send | What We Strip |
|-----------|-------------|---------------|
| Transactions | Amount, date, category | ~~Payee name~~, ~~merchant name~~ |
| Accounts | Type, balance | ~~Account name~~, ~~institution~~ |
| Debts | Type, balance, APR, payments | ~~Debt name~~, ~~lender~~ |
| Savings Goals | Type, target, current, contribution | ~~Goal name~~ |
| User Info | (nothing) | ~~Name~~, ~~email~~, ~~user ID~~ |

Named entities are replaced with indexed labels (e.g., "Debt 1 (credit_card)", "Goal 1 (emergency)") so AI can reason about relationships without knowing identities.

### AI Provider Data Handling
- AI requests are routed through **OpenRouter** (https://openrouter.ai)
- We do NOT enable request logging with OpenRouter
- No user data is stored by AI providers beyond the request lifecycle
- BYOK (Bring Your Own Key) users route directly through their own provider account

### What AI Never Sees
- ❌ User names or emails
- ❌ Bank/institution names
- ❌ Payee/merchant names (e.g., "Starbucks", "Dr. Smith")
- ❌ Account names (e.g., "Chase Checking", "Amex Gold")
- ❌ Debt names (e.g., "Sallie Mae Student Loan")
- ❌ Savings goal names (e.g., "Wedding Fund")
- ❌ Any data that could identify a specific person or institution

---

## 4. API Security

### Rate Limiting
All API endpoints are rate-limited per user to prevent abuse:

| Endpoint | Limit |
|----------|-------|
| `/api/dashboard`, `/api/transactions`, `/api/budgets` | 60 requests/minute |
| `/api/settings`, `/api/accounts`, `/api/debts`, `/api/savings`, `/api/score` | 30 requests/minute |
| `/api/ai/*` (all AI endpoints) | 10 requests/minute |

Exceeded limits return `429 Too Many Requests` with a `Retry-After` header.

### AI-Specific Rate Limits
In addition to API rate limiting, AI features have **monthly usage caps** per subscription tier:

| Feature | Free | Plus | Pro |
|---------|------|------|-----|
| Page Insights | 5/month | 30/month | Unlimited |
| AI Coaching | 0 | 10/month | Unlimited |
| Receipt Scanning | 3/month | 20/month | Unlimited |

### Security Headers
All responses include hardened HTTP headers:

```
X-Frame-Options: DENY                    — Prevents clickjacking
X-Content-Type-Options: nosniff          — Prevents MIME sniffing
Referrer-Policy: strict-origin-when-cross-origin
X-XSS-Protection: 1; mode=block         — XSS filter
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains  — HTTPS only
```

---

## 5. Data Architecture

### What We Store
BudgetWise stores financial data that users explicitly enter:
- Account balances (user-entered, not connected to banks)
- Transactions (user-entered or scanned from receipts)
- Budgets and goals
- Debt information

### What We Do NOT Store
- ❌ Bank credentials or login information
- ❌ Social Security numbers
- ❌ Full credit card numbers
- ❌ Raw AI conversation logs
- ❌ Third-party financial data (no Plaid/bank connections currently)

### Encryption
- **In transit:** All data encrypted via TLS 1.3 (HTTPS enforced via HSTS)
- **At rest:** Supabase PostgreSQL uses AES-256 encryption at rest
- **Sensitive fields:** BYOK API keys are stored encrypted and masked in API responses (only last 4 characters shown)

### Data Residency
- Database hosted on **Supabase** (AWS us-east-2)
- Application hosted on **Vercel** (edge network)
- AI processing via **OpenRouter** (US-based)

---

## 6. Server-Side Architecture

All data operations happen **server-side** in Next.js API routes:

```
Browser → Next.js API Route → Supabase (with RLS) → Database
                            → OpenRouter (anonymized data only)
```

The browser never directly queries the database with raw SQL. All queries go through authenticated API routes that:
1. Verify the user's JWT token
2. Check rate limits
3. Query Supabase (which enforces RLS)
4. Anonymize data before any AI calls
5. Return only the user's own data

---

## 7. Incident Response

### If a Data Breach Occurs
1. Immediately revoke all active sessions
2. Rotate all API keys (Supabase, OpenRouter)
3. Notify affected users within 72 hours
4. Conduct forensic analysis and publish findings

### Reporting Security Issues
Contact: [security contact to be added]

---

## 8. Compliance Considerations

BudgetWise is designed with the following standards in mind:
- **SOC 2 Type II** — Supabase infrastructure is SOC 2 compliant
- **GDPR** — Users can export and delete all their data
- **CCPA** — No selling of personal information
- **PCI DSS** — We do not process or store payment card data

---

## Development Standards — Mandatory for All New Code

Every new feature, route, and database table MUST follow these rules:

1. **API Routes:** Always use `apiGuard(limit)` as the first line. No raw `createClient()` + manual auth checks.
2. **New Tables:** Must have RLS enabled with user-scoped policies before going live. Add migration SQL to `supabase/migrations/`.
3. **AI Calls:** Never send PII (payee names, account names, debt names, goal names, user info). Use indexed labels ("Debt 1", "Goal 1"). All AI functions must include anonymization system messages.
4. **Sensitive Fields:** Mask in API responses (e.g., API keys show only last 4 chars).
5. **No Direct DB Access:** Browser never queries Supabase directly. All data flows through server-side API routes.

If a feature can't meet these standards, it doesn't ship.

---

## Summary

| Layer | Protection |
|-------|-----------|
| **Authentication** | JWT tokens, bcrypt passwords, HttpOnly cookies |
| **Authorization** | Row-Level Security on every table |
| **API Security** | Per-user rate limiting, middleware route protection |
| **AI Privacy** | Full PII stripping, anonymized data only |
| **Transport** | TLS 1.3, HSTS, security headers |
| **Storage** | AES-256 at rest, masked sensitive fields |
| **Architecture** | Server-side only, no direct DB access from browser |
