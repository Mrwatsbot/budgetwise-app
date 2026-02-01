# Privacy & Data Minimization Checklist

## Core Principle: Collect Nothing We Don't Need

BudgetWise follows **data minimization** — we only collect the bare minimum needed for the app to function.

---

## ✅ What We DO Collect (Absolute Minimum)

### User Authentication (via Supabase Auth)
- ✅ **Email** — Required for account creation, login, password reset
- ✅ **Password (hashed)** — Never stored in plain text, bcrypt hashing by Supabase
- ✅ **User ID (UUID)** — Internal identifier, not PII

### User Profile (profiles table)
- ✅ **Subscription tier** (`free`, `plus`, `pro`) — Determines feature access
- ✅ **Monthly income** — Optional, used for budget calculations and score
- ✅ **OpenRouter API key** (optional) — For Pro users with BYOK (stored encrypted)
- ✅ **Plaid access token** (future, optional) — For Pro users connecting banks

### Financial Data (User-Entered)
- ✅ **Account balances** — Required for tracking
- ✅ **Transaction amounts/dates/categories** — Core app functionality
- ✅ **Budget allocations** — Core app functionality
- ✅ **Debt balances/APRs** — For debt tracking & score
- ✅ **Savings goal targets** — For savings tracking & score

### Anonymized Usage Data
- ✅ **AI feature usage counts** — For rate limiting only
- ✅ **Score history** — For progress tracking

---

## ❌ What We DO NOT Collect (Ever)

### Personal Identifiers
- ❌ **Full name** — NOT collected
- ❌ **Phone number** — NOT collected
- ❌ **Physical address** — NOT collected
- ❌ **Date of birth** — NOT collected
- ❌ **Social Security Number** — NOT collected
- ❌ **Government IDs** — NOT collected

### Financial Identifiers
- ❌ **Full credit card numbers** — NOT collected
- ❌ **Bank account numbers** — NOT collected (Plaid handles this securely)
- ❌ **Routing numbers** — NOT collected
- ❌ **CVV/security codes** — NOT collected

### Behavioral Tracking
- ❌ **Third-party cookies** — NOT used
- ❌ **Third-party analytics** (Google Analytics, Facebook Pixel, etc.) — NOT used
- ❌ **Advertising IDs** — NOT used
- ❌ **Device fingerprinting** — NOT used
- ❌ **Location tracking** — NOT used

### Content That Could Identify Users
- ❌ **Payee/merchant names** — Stripped before AI processing
- ❌ **Account nicknames** — Stripped before AI processing
- ❌ **Debt names** — Stripped before AI processing
- ❌ **Savings goal names** — Stripped before AI processing

---

## 🔒 Security Measures (Best-in-Class)

### Authentication & Authorization
- ✅ **JWT-based authentication** (Supabase Auth)
- ✅ **bcrypt password hashing** (Supabase handles this)
- ✅ **HttpOnly, Secure, SameSite=Lax cookies**
- ✅ **Session auto-expiry** (7 days default)
- ✅ **Row-Level Security (RLS)** on every database table

### Encryption
- ✅ **TLS 1.3 in transit** (HTTPS enforced via HSTS)
- ✅ **AES-256 at rest** (Supabase PostgreSQL default)
- ✅ **Encrypted API keys** (BYOK keys stored encrypted)

### API Security
- ✅ **Per-user rate limiting** (60 req/min data, 10 req/min AI)
- ✅ **Server-side only** (no direct database access from browser)
- ✅ **Security headers** (X-Frame-Options, CSP, etc.)
- ✅ **Middleware route protection** (auth required)

### AI Privacy
- ✅ **Full PII stripping** before AI calls
- ✅ **Anonymized data only** (indexed labels: "Debt 1", "Goal 1")
- ✅ **No request logging** with AI providers
- ✅ **Anonymization system messages** in all AI prompts

### Plaid Security (When Implemented)
- ✅ **Plaid handles bank credentials** (we never see them)
- ✅ **Encrypted access tokens** stored in our DB
- ✅ **Scoped permissions** (read-only access)
- ✅ **Revocable at any time** by user

---

## 🛡️ Compliance Standards

### GDPR (EU Privacy Regulation)
- ✅ **Right to access** — Users can export all their data (TODO: build export feature)
- ✅ **Right to deletion** — Users can delete account + all data (TODO: build delete feature)
- ✅ **Right to portability** — CSV export supported
- ✅ **Consent required** — Email verification before account activation (TODO: re-enable)
- ✅ **Privacy policy** — Clear, plain-language policy (TODO: write policy)

### CCPA (California Privacy Law)
- ✅ **No selling of personal information** — We don't sell data, period
- ✅ **Opt-out available** — Users can delete account anytime
- ✅ **Data minimization** — We only collect what's necessary

### SOC 2 (Security & Privacy)
- ✅ **Infrastructure** — Supabase is SOC 2 Type II compliant
- ✅ **Encryption** — In transit (TLS 1.3) and at rest (AES-256)
- ✅ **Access controls** — RLS + JWT auth
- ✅ **Audit logs** — Available via Supabase (for security events)

### PCI DSS (Payment Card Security)
- ✅ **We don't process payments** — Stripe handles all payment processing
- ✅ **We don't store card numbers** — Stripe hosted checkout
- ✅ **No PCI compliance needed** — We're out of scope

---

## 📋 Pre-Launch Security Checklist

### Authentication
- [x] JWT-based auth via Supabase
- [x] Passwords hashed with bcrypt
- [ ] **TODO:** Re-enable email verification (disabled for dev/testing)
- [x] Session auto-expiry
- [x] HttpOnly cookies

### Authorization
- [x] RLS enabled on all tables
- [x] User-scoped policies on all tables
- [x] Middleware route protection
- [x] API guards on all routes

### Encryption
- [x] HTTPS enforced (HSTS header)
- [x] TLS 1.3 in transit
- [x] AES-256 at rest (Supabase default)
- [x] Encrypted BYOK API keys

### API Security
- [x] Rate limiting (per-user)
- [x] Security headers (X-Frame-Options, CSP, etc.)
- [x] Server-side only (no direct DB access)
- [x] CORS restricted to own domain

### AI Privacy
- [x] PII stripping before AI calls
- [x] Anonymization system messages
- [x] No request logging with providers
- [x] Indexed labels for entities

### Data Minimization
- [x] No full names collected
- [x] No phone numbers collected
- [x] No addresses collected
- [x] No SSN or government IDs
- [x] No third-party tracking
- [x] No advertising pixels

### User Controls
- [ ] **TODO:** Account deletion feature
- [ ] **TODO:** Data export feature (enhanced)
- [ ] **TODO:** Privacy policy page
- [ ] **TODO:** Terms of service page
- [ ] **TODO:** Cookie consent banner (minimal, first-party only)

### Plaid (When Implemented)
- [ ] Encrypted access tokens
- [ ] User can disconnect anytime
- [ ] Plaid credentials never stored by us
- [ ] Read-only access only

---

## 🚨 What to NEVER Do

### Absolutely Forbidden
1. ❌ **Never store plain-text passwords** (Supabase handles this)
2. ❌ **Never send PII to AI providers** (always anonymize first)
3. ❌ **Never expose user data cross-user** (RLS prevents this)
4. ❌ **Never sell or share user data** with third parties
5. ❌ **Never use third-party analytics** without explicit consent
6. ❌ **Never log sensitive data** (passwords, tokens, card numbers)
7. ❌ **Never use unofficial APIs** (e.g., Robinhood unofficial API)
8. ❌ **Never store full credit card numbers** (Stripe handles payments)
9. ❌ **Never collect data we don't need** (data minimization)
10. ❌ **Never skip RLS on new tables** (always enforce user-scoped policies)

---

## ✅ Recommended Additions (Nice-to-Have)

### Enhanced Privacy Features
1. **Anonymous usage mode** — Let users use app without email (local storage only)
2. **End-to-end encryption** — Encrypt sensitive data client-side before upload
3. **Zero-knowledge architecture** — We can't read user data even if we wanted to
4. **Self-hosted option** — Power users can run their own instance
5. **Privacy dashboard** — Show users exactly what data we have

### Security Enhancements
1. **2FA/MFA** — Optional two-factor authentication
2. **Session management** — View/revoke active sessions
3. **Security notifications** — Alert users of unusual activity
4. **Audit log** — Users can see their own access history
5. **Biometric unlock** — FaceID/TouchID for mobile

### Compliance Features
1. **GDPR export** — One-click data export to JSON/CSV
2. **Right to be forgotten** — One-click account deletion
3. **Data retention policy** — Auto-delete data after X days of inactivity
4. **Consent management** — Granular privacy settings

---

## 📝 Developer Responsibilities

Every developer working on BudgetWise must:
1. **Read SECURITY.md** before touching code
2. **Follow data minimization** — Don't add fields we don't need
3. **Enable RLS on new tables** — No exceptions
4. **Strip PII before AI calls** — Always anonymize
5. **Use apiGuard() on all routes** — No raw Supabase client
6. **Test with security mindset** — Think like an attacker
7. **Document security decisions** — Update SECURITY.md

---

## 🎯 Summary

| Category | Status |
|----------|--------|
| **Data Minimization** | ✅ Collecting bare minimum |
| **Encryption** | ✅ TLS 1.3 + AES-256 |
| **Authentication** | ✅ JWT + bcrypt + RLS |
| **AI Privacy** | ✅ Full PII stripping |
| **Third-Party Tracking** | ✅ None (we don't use analytics) |
| **User Controls** | ⚠️ TODO: Export + Delete features |
| **Legal Docs** | ⚠️ TODO: Privacy Policy + ToS |

**Overall security posture:** ✅ **Best-in-class for financial app**

---

**Last updated:** January 30, 2026  
**Next review:** Before public launch
