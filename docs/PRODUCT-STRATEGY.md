# BudgetWise — Product Strategy

> **"The financial fitness game that makes you richer."**

---

## Vision

BudgetWise is a gamified financial health app that makes managing money feel like leveling up a character. Your Financial Health Score is your XP bar. Every good decision pushes it up. AI coaching tells you exactly what to do next. Achievements and streaks keep you coming back.

**We are NOT "cheaper YNAB."** We are the app that turns budgeting from a chore into a game — with a score that actually tells you if you're winning.

---

## Core Philosophy

1. **Direction > Snapshot.** Someone improving fast should score higher than someone coasting at "okay."
2. **Gamification drives behavior.** People don't stick with budgets because they're "responsible." They stick because it feels rewarding.
3. **AI as coach, not chatbot.** Every AI insight ties back to your score. "Do X → your score goes up Y points."
4. **Budgeting is the engine, not the product.** The score and game mechanics are what people talk about. The budget tools are what make it work underneath.

---

## Target Market

- **Primary:** People who know they should budget but can't stick with it (the 80% who try and quit)
- **Secondary:** Frustrated YNAB/Mint refugees who want something that actually motivates them
- **Tertiary:** Financially-curious younger users (25-40) who respond to gamification

**NOT targeting:** Hardcore budgeters already happy with YNAB, or people looking for the cheapest possible option.

---

## What We Track

### Income
- Paychecks, side hustles, freelance, passive income
- Income trends over time (growing? stagnant? diversified?)
- Used for: DTI ratio, savings rate calculations, trajectory scoring

### Spending & Budgets
- Categories: housing, food, transport, entertainment, subscriptions, etc.
- Monthly budgets per category with rollover options
- Overspend/underspend tracking
- Used for: Budget Discipline score, AI spending insights

### Debt (with type multipliers)
- Each debt tracked individually: type, balance, rate, minimum payment
- 11 types with research-backed multipliers:
  - Mortgage (0.3) | Auto (0.7) | Student (0.5) | Medical (0.4)
  - Credit card (1.5) | CC paid monthly (0.05) | Personal loan (1.0)
  - HELOC (0.35) | Business (0.6) | Payday (2.5) | Collections (1.5x on top)
- Tracks: payoff progress, velocity, extra payments, payoff date projections
- Used for: Debt Velocity score, DTI, AI payoff strategies

### Savings & Wealth Building
- Emergency fund balance + target (3-6 months expenses)
- Retirement: 401k, IRA, Roth IRA (balances + contribution rate)
- HSA, 529, brokerage accounts
- Extra debt payments count as wealth building
- Tracks: total wealth building rate as % of income
- Used for: Wealth Building Rate score, Emergency Buffer score

### Payments & Bills
- Bill due dates, payment history (on-time / late / missed)
- Streak tracking — consecutive on-time payments
- Used for: Payment Consistency score, streak achievements

---

## The Financial Health Score (0-1000)

A personal tracker that answers: **"Am I getting better with money?"**

| Pillar | Points | Weight | What It Measures |
|--------|--------|--------|-----------------|
| **Trajectory** | 400 | 40% | Are you moving in the right direction? |
| **Behavior** | 350 | 35% | Are you being responsible daily? |
| **Position** | 250 | 25% | Where do you stand right now? |

### Trajectory (400 pts)
- **Wealth Building Rate (200)** — % of income going to savings/retirement/debt payoff. 20% = max. Counts ALL vehicles (401k, IRA, HSA, cash, extra debt payments).
- **Debt Velocity (200)** — How fast debt is shrinking, weighted by type. Paying down credit cards matters more than a mortgage.

### Behavior (350 pts)
- **Payment Consistency (200)** — On-time payment streak, weighted by recency. One miss hurts, but recovery is rewarded.
- **Budget Discipline (150)** — Staying within budgets consistently across categories over time.

### Position (250 pts)
- **Emergency Buffer (125)** — Months of expenses covered. 6 months = max. Doesn't heavily penalize strategic debt payoff.
- **Debt-to-Income (125)** — Weighted DTI using type multipliers. Mortgage DTI hits different than credit card DTI.

### Design Principles
- Score updates in real-time as you log activity
- Someone improving fast scores higher than someone coasting
- No app-specific metrics — purely financial behavior
- Anti-gaming: smoothing over rolling windows, minimum data thresholds
- Research-backed: NY Fed, CFPB, Fannie Mae data for debt weighting

### Score Ranges
| Score | Level | Title |
|-------|-------|-------|
| 900-1000 | 5 | Financial Freedom 👑 |
| 750-899 | 4 | Wealth Builder 🚀 |
| 600-749 | 3 | Solid Ground 💪 |
| 400-599 | 2 | Foundation 🏗️ |
| 200-399 | 1 | Getting Started 🚶 |
| 0-199 | 0 | Starting Point 🌱 |

---

## The Engagement Loop

```
Track Activity → Score Updates → AI Analyzes → Suggests Actions
     ↑                                              ↓
  Complete Actions ← Earn Achievements ← Take Action
```

**Layer 1: The Score.** Log a transaction → score ticks. Pay off debt → Debt Velocity jumps. Miss a budget → Behavior dips. Immediate feedback.

**Layer 2: AI Coach.** Contextual, score-tied nudges:
- "You're $47 over on dining. Cook 3 more nights → +8 Discipline."
- "Extra $50/mo on your Visa → debt-free 4 months sooner."
- "Haven't contributed to IRA this month. Even $25 keeps your streak."

**Layer 3: Gamification.** Achievements, streaks, challenges, leaderboards. The dopamine layer that makes people WANT to improve.

---

## Pricing

| | **Free** | **Plus $49/yr** | **Pro $99/yr** |
|---|---|---|---|
| Score + tracking | ✅ | ✅ | ✅ |
| Manual entry | ✅ | ✅ | ✅ |
| CSV import | ✅ | ✅ | ✅ |
| Gamification | Basic | **Full system** | Full system |
| AI insights | 3/month | **Unlimited** | Unlimited |
| Debt planner | Basic | **AI-optimized** | AI-optimized |
| Bank sync (Plaid) | ❌ | ❌ | **✅** |
| Leaderboards | ❌ | ✅ | ✅ |
| Family sharing | ❌ | ❌ | **+$29/yr** |

### Unit Economics

**Plus ($49/yr = $4.08/mo):**
- Costs: ~$0.73/mo (Stripe + AI + infra)
- **Margin: $3.35/mo = 82%** ← Cash cow, no Plaid

**Pro ($99/yr = $8.25/mo):**
- Costs: ~$2.33/mo (Stripe + Plaid + AI + infra)
- **Margin: $5.92/mo = 71%**

### Infrastructure at Scale
| Users | DB + Hosting | Plaid | AI | Total Infra | Revenue | Net |
|-------|-------------|-------|-----|------------|---------|-----|
| 1,000 | $45/mo | $300/mo | $42/mo | $402/mo | $3,282/mo | $2,880/mo |
| 5,000 | $55/mo | $1,500/mo | $175/mo | $1,745/mo | $14,370/mo | $12,625/mo |
| 10,000 | $150/mo | $3,000/mo | $350/mo | $3,500/mo | $28,740/mo | $25,240/mo |

---

## AI Integration

All AI is server-side, fixed-prompt, rate-limited. No open chat.

| Feature | Purpose | Model |
|---------|---------|-------|
| Spending Insights | Weekly pattern analysis + suggestions | Grok 4.1 Fast |
| Debt Strategy | Optimal payoff plan (avalanche/snowball/hybrid) | Grok 4.1 Fast |
| Budget Suggestions | AI-generated budgets from income + history | Grok 4.1 Fast |
| Score Coach | Tips to improve weakest pillar | Grok 4.1 Fast |
| Transaction Categorization | Auto-categorize from bank sync | Lighter model |
| Achievement Unlocks | Personalized congrats + next goals | Grok 4.1 Fast |

**Cost:** ~$0.03-0.10/user/month. Negligible.

---

## Tech Stack

- **Frontend:** Next.js 16 (App Router)
- **UI:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **AI:** OpenRouter (Grok 4.1 Fast primary)
- **Payments:** Stripe
- **Hosting:** Vercel
- **Bank Sync:** Plaid (Pro tier only)
- **Platform:** PWA first, native later

---

## Go-To-Market

### Phase 1: Validate (Week 1-2)
- **Free Financial Health Score Calculator** — No account needed, 8-10 questions, get your 0-1000 score, shareable result
- Validates: does anyone care about this score?
- Captures: email leads for app launch

### Phase 2: Launch MVP (Month 1-2)
- Full app with manual entry + score + gamification + AI
- Reddit: r/personalfinance, r/ynab, r/budgeting (be helpful first, mention product naturally)
- Content: "Why Your Credit Score Lies to You" style articles

### Phase 3: Growth (Month 3+)
- Add Plaid bank sync for Pro tier
- TikTok/YouTube: Score visual is inherently content-friendly
- Referral program: "Share your score, invite friends"
- SEO: "financial health score", "budget app", "YNAB alternative"

---

## Competitive Positioning

We don't compete on price. We compete on **feel**.

| | YNAB ($99) | Monarch ($99) | Copilot ($95) | **BudgetWise ($49-99)** |
|---|---|---|---|---|
| Budgeting | ✅ (rigid) | ✅ | ✅ | ✅ (flexible) |
| Bank Sync | ✅ | ✅ | ✅ | ✅ (Pro) |
| AI Insights | ❌ | Basic | Basic | **Deep + contextual** |
| Health Score | ❌ | ❌ | ❌ | **✅ (0-1000)** |
| Gamification | ❌ | ❌ | ❌ | **Full system** |
| Engagement Loop | Philosophy | Polish | Design | **Game mechanics** |

**Our moat:** Nobody else has a game dev building fintech. The score + gamification + AI coach is a combination that doesn't exist in the market.
