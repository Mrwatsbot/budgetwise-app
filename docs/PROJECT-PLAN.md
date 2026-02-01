# BudgetWise — Project Plan

## Overview
A gamified financial health app. Budget, track debt, build wealth — and watch your Financial Health Score level up. AI coaching tells you what to do next. Achievements and streaks keep you coming back.

**Tagline:** "The financial fitness game that makes you richer."

---

## Pricing Tiers (Updated 2026-01-29)

| Feature | **Free** | **Plus ($79/yr)** | **Pro ($149/yr)** |
|---|---|---|---|
| Score + manual tracking + CSV | ✅ | ✅ | ✅ |
| Gamification | Basic | Full | Full |
| AI Insights (per-page) | 🔒 Locked (visible, blurred) | 5 refreshes/day | Unlimited |
| AI Auto Budget Wizard | 🔒 | 2/month | Unlimited |
| "Can I Afford This?" | 🔒 | 3/week | 15/week |
| Product Photo Scan | 🔒 | 2/week | 10/week |
| AI Coaching Page | 🔒 | 3 analyses/month | Unlimited |
| Smart Payoff Plan | 🔒 | 1/month | Unlimited |
| Debt strategy + scenarios | 🔒 | ✅ | ✅ |
| Leaderboards | ❌ | ✅ | ✅ |
| Bank sync (Plaid) | ❌ | ❌ | ✅ |
| BYOK (own API key) | ❌ | ❌ | ✅ Unlimited AI |
| Family sharing | ❌ | ❌ | +$29/yr |

### Pricing Rationale
- **Not a "cheaper YNAB"** — positioned as AI-powered financial coach
- 3/5 core AI features are truly unique (no competitor has them)
- Plus at $79 < YNAB ($109) but with superior AI features
- Pro at $149 < Cleo Builder ($180/yr) with structured planning tools
- Free tier shows all AI features locked/blurred to drive FOMO → conversion
- BYOK option for Pro: power users bring their own OpenRouter key for unlimited AI

---

## Tech Stack

- **Frontend:** Next.js 16 (App Router)
- **UI:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **AI:** OpenRouter → Grok 4.1 Fast (primary)
- **Payments:** Stripe
- **Hosting:** Vercel
- **Bank Sync:** Plaid (Pro tier)
- **Platform:** PWA first

---

## Development Phases

### Phase 1: Strategy & Foundation (Current)
- [x] Clone existing codebase (auth, dashboard, transactions, budgets, scoring, AI config)
- [x] Set up new repo with dev/main branches
- [x] Write PRODUCT-STRATEGY.md
- [x] Update PROJECT-PLAN.md with new direction
- [x] Update GAMIFICATION.md with full engagement system
- [ ] Update DATABASE-SCHEMA.md for new tier structure (Free/Plus/Pro)
- [ ] Push to GitHub

### Phase 2: Score Calculator (GTM Validation)
- [ ] Build free standalone score quiz (no account required)
- [ ] 8-10 questions covering all 3 pillars
- [ ] Shareable result page ("I got 720!")
- [ ] Email capture for app launch waitlist
- [ ] Deploy as standalone page or subdomain

### Phase 3: App MVP Refinement (Product Testing - Current)
- [x] Update demo mode with new engagement loop
- [x] Make AI testable in demo (Can I Afford This, Auto Budget, Insights)
- [x] Pricing page (`/pricing`) — DONE!
- [x] Score display with pillar breakdown — Already implemented!
  - 3 pillars: Trajectory (0-400), Behavior (0-350), Position (0-250)
  - 6 sub-factors with detailed progress bars
  - Score history chart
  - Achievements & streaks
- [ ] Add achievement unlock notifications (toasts)
- [ ] Verified badge on leaderboards (users with Plaid connected)
- [ ] AI coach integration (score-tied suggestions)
- [ ] Update onboarding flow for new positioning
- [ ] Personal product testing (1-2 weeks with real data)

### Pre-Launch Checklist
- [ ] **Re-enable email confirmation in Supabase Auth** (disabled for dev/testing)
- [ ] Add rate limiting on signup
- [ ] Terms of Service + Privacy Policy pages

### Phase 4: Monetization
- [ ] Stripe integration (Plus $49/yr, Pro $99/yr)
- [ ] Free tier limitations (3 AI insights/month, basic gamification)
- [ ] Plus tier unlock (full gamification, unlimited AI)
- [ ] CSV import for all tiers

### Phase 5: Bank Sync (Pro Tier)
- [ ] Plaid integration (banking)
- [ ] Auto-import transactions
- [ ] AI auto-categorization
- [ ] Account balance syncing
- [ ] Plaid investment accounts (Fidelity, Vanguard, Schwab, etc.)
- [ ] Portfolio value tracking
- [ ] Investment contributions to Wealth Building score
- [ ] Dashboard portfolio widget

### Phase 6: Growth Features
- [ ] Leaderboards (opt-in, anonymized, behavior-based)
- [ ] Monthly/weekly challenges
- [ ] Referral system
- [ ] Family sharing (Pro + $29/yr)

### Phase 7: Advanced Investment Tracking (Optional/Future)
- [ ] Research Robinhood official API availability
- [ ] Robinhood portfolio sync (if API becomes available)
- [ ] Alternative: Continue using Plaid for brokerage accounts
- [ ] Real-time portfolio value updates
- [ ] Investment performance tracking (gains/losses)
- [ ] Tax-loss harvesting suggestions (AI-powered)

---

## Cost Analysis

### Startup Costs
- Domain: ~$15
- LLC: ~$300 (Texas)
- Total: ~$315

### Monthly Fixed Costs
| Service | Free Tier Limit | Paid Tier | When to Upgrade |
|---------|----------------|-----------|-----------------|
| Vercel | Hobby (not commercial) | $20/mo Pro | Day 1 of launch |
| Supabase | 500MB DB | $25/mo Pro | Day 1 of launch |
| Domain | — | $15/yr | Already have |
| **Total** | — | **$45/mo** | — |

### Variable Costs Per User/Month (Updated)
| Cost | Free User | Plus User | Pro User |
|------|-----------|-----------|----------|
| AI | $0 | $0.30 | $2.00 |
| Infra (share) | $0.05 | $0.05 | $0.05 |
| Plaid | — | — | $0.50 |
| Stripe | — | $0.23 | $0.37 |
| **Total** | **$0.05** | **$0.58** | **$2.92** |

### Revenue Per Paid User/Month
| Tier | Revenue | Costs | Margin |
|------|---------|-------|--------|
| Plus | $6.58 | $0.58 | **$6.00 (91%)** |
| Pro | $12.42 | $2.92 | **$9.50 (76%)** |

### Revenue Milestones (60/40 Plus/Pro split)
| Paying Users | Monthly Revenue | Monthly Costs | Net Profit |
|-------------|----------------|---------------|------------|
| 500 | ~$4,450 | ~$680 | ~$3,770 |
| 1,000 | ~$8,900 | ~$1,210 | ~$7,690 |
| 2,500 | ~$22,250 | ~$2,800 | ~$19,450 |
| 5,000 | ~$44,500 | ~$5,400 | ~$39,100 |

---

## AI Implementation

### Features
| Feature | Trigger | Model | Tokens |
|---------|---------|-------|--------|
| Spending Insights | Weekly auto / on-demand | Grok 4.1 Fast | ~1500 |
| Debt Strategy | On-demand | Grok 4.1 Fast | ~1500 |
| Budget Suggestions | Monthly / on-demand | Grok 4.1 Fast | ~1000 |
| Score Coach | When score changes | Grok 4.1 Fast | ~800 |
| Categorization | On transaction import | Mistral 7B | ~100 |
| Achievement Congrats | On unlock | Grok 4.1 Fast | ~200 |

### Guardrails
- Fixed system prompts (no user modification)
- Rate limits: Free = 3/month, Plus/Pro = unlimited (soft cap ~50/day)
- Output validation (JSON schema)
- No conversation history (stateless)
- Server-side only

---

## Distribution Strategy

### Pre-Launch
- Free score calculator as viral hook
- Email waitlist from calculator
- Reddit presence (helpful member first, months before mention)

### Launch
- Product Hunt
- Reddit communities (r/personalfinance, r/ynab, r/budgeting)
- Hacker News (if score calculator gets traction)

### Growth
- Content marketing: "Why Your Credit Score Lies to You"
- SEO: "financial health", "budget app", "YNAB alternative"
- TikTok/YouTube: Score visual is content-friendly
- Referral: Share score → invite friends

---

## Success Metrics
| Milestone | What It Means |
|-----------|--------------|
| 10,000 score quizzes taken | People care about the score |
| 1,000 email signups | Real demand for the app |
| 500 paying users | Validation — ~$2,250/mo |
| 1,000 paying users | Sustainable — ~$4,650/mo |
| 5,000 paying users | Escape velocity — ~$23,900/mo |
