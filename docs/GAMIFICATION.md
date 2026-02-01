# Gamification System

> The dopamine layer that makes people WANT to manage their money.

**Key Principle:** Gamification is SEPARATE from the Financial Health Score. The score is a pure financial metric. Gamification is the engagement layer that makes the app sticky.

---

## The Engagement Loop

```
Track Activity → Score Updates → AI Analyzes → Suggests Actions
     ↑                                              ↓
  Complete Actions ← Earn Achievements ← Take Action
```

**Layer 1 — The Score:** Immediate feedback. Log a transaction → score ticks. Pay off debt → pillar jumps. Miss a budget → dip. People check it like a credit score, but it responds to TODAY's actions.

**Layer 2 — AI Coach:** Every suggestion ties to the score. "Do X → +Y points." Not generic advice — specific, actionable, score-connected.

**Layer 3 — Gamification:** Achievements, streaks, challenges, leaderboards. This is what makes people open the app when they don't "need" to.

---

## 1. Achievements 🏆

Steam/Xbox-style badges with **rarity percentages** ("4% of users earned this").

### Beginner (Common)
| Badge | Name | Requirement | Est. Rarity |
|-------|------|-------------|-------------|
| 🎯 | First Steps | Log your first transaction | 95% |
| 📊 | Budget Maker | Create your first monthly budget | 85% |
| 🏦 | Account Setup | Add your first account | 90% |
| 📱 | Home Screen | Install PWA to home screen | 40% |
| 🔍 | Self-Aware | Complete your first Financial Health Score | 92% |

### Progress (Uncommon)
| Badge | Name | Requirement | Est. Rarity |
|-------|------|-------------|-------------|
| 📝 | Century Logger | Log 100 transactions | 45% |
| 📈 | Consistent | 30-day logging streak | 25% |
| 💰 | First Grand | Save $1,000 total | 35% |
| 🎯 | Budget Boss | Stay within all budgets for 30 days | 20% |
| 🤖 | AI Apprentice | Follow 10 AI coach suggestions | 30% |
| ⬆️ | Rising Tide | Increase score by 50 points in one month | 28% |

### Achievement (Rare)
| Badge | Name | Requirement | Est. Rarity |
|-------|------|-------------|-------------|
| 💳 | Debt Slayer | Pay off any debt completely | 15% |
| ☔ | Rainy Day Ready | Save 1 month of expenses | 22% |
| 🛡️ | Safety Net | Save 3 months of expenses | 12% |
| 🏰 | Fortress | Save 6 months of expenses | 8% |
| 🎯 | Perfect Quarter | 3 months: all bills on-time + all budgets hit | 6% |
| 🔥 | Centurion | 100-day budget streak | 8% |

### Elite (Very Rare)
| Badge | Name | Requirement | Est. Rarity |
|-------|------|-------------|-------------|
| 👑 | 700 Club | Reach Financial Health Score of 700 | 12% |
| 🏆 | 800 Club | Reach Financial Health Score of 800 | 5% |
| 💎 | 900 Club | Reach Financial Health Score of 900 | 1% |
| 🌟 | Year of Discipline | 365-day budget streak | 2% |
| 🦁 | Debt Free | Pay off ALL debts (except mortgage) | 4% |
| 🚀 | Wealth Builder | 20%+ wealth building rate for 6 consecutive months | 3% |

### Secret (Hidden until unlocked)
| Badge | Name | Requirement | Est. Rarity |
|-------|------|-------------|-------------|
| 🎉 | Late Night Budgeter | Log a transaction between 2-4 AM | 15% |
| 🍀 | Lucky Seven | Score lands exactly on 777 | <1% |
| 📉 | Phoenix | Score drops below 300, then rises above 600 | 5% |
| 🎄 | Holiday Saver | Stay within budget during December | 7% |

---

## 2. Streaks 🔥

Consecutive activity tracking with visual escalation.

### Streak Types
| Streak | What It Tracks | Reset Condition |
|--------|---------------|-----------------|
| 🔥 Payment Streak | Consecutive months all bills on-time | Miss any bill due date |
| 📊 Budget Streak | Consecutive months within ALL budgets | Overspend any category |
| 💰 Savings Streak | Consecutive months contributing to wealth building | $0 contribution month |
| 📝 Logging Streak | Consecutive days logging at least 1 transaction | Miss a day |

### Streak Milestones
| Duration | Reward | Visual |
|----------|--------|--------|
| 7 days/1 month | Bronze badge | 🔥 |
| 30 days/3 months | Silver badge | 🔥🔥 |
| 100 days/6 months | Gold badge | 🔥🔥🔥 |
| 365 days/12 months | Diamond badge + special title | 💎🔥 |

### Streak Protection
- **Freeze (1 per month):** Protect a streak from breaking once. Encourages consistency but allows life to happen.
- **Grace Period:** Payment streak has 3-day grace period after due date (bills can be weird).

---

## 3. Challenges 🎯

Time-boxed goals that teach financial habits.

### Weekly Challenges (rotate)
| Challenge | Description | Reward |
|-----------|-------------|--------|
| No-Spend Weekend | $0 discretionary spending Sat-Sun | +5 score bonus, badge progress |
| Debt Blitz | Make an extra payment on highest-rate debt | +3 score bonus |
| Meal Prep Master | Stay under food budget this week | +2 score bonus |
| Review Week | Categorize all transactions for the week | Badge progress |

### Monthly Challenges (rotate)
| Challenge | Description | Reward |
|-----------|-------------|--------|
| $50 Redirect | Find $50 in budget to move to savings | +8 score bonus |
| Subscription Audit | Review and cancel at least 1 unused subscription | +5 score bonus, badge |
| Emergency Builder | Add $100+ to emergency fund | +10 score bonus |
| Bill Negotiator | Call and negotiate at least 1 bill down | +15 score bonus, rare badge |

### Community Challenges (Plus/Pro)
- **Collective Goal:** "Together, BudgetWise users saved $1M this month!"
- **Leaderboard Challenge:** "Most improved score this month"
- **Theme Months:** "Debt Destruction December," "Savings Sprint September"

---

## 4. Leaderboards 🏅

**Opt-in and anonymized.** No absolute wealth comparisons — only behavior and improvement.

### Board Types
| Board | What It Ranks | Why It's Healthy |
|-------|--------------|-----------------|
| Most Improved | Score increase this month | Rewards effort, not wealth |
| Longest Streak | Current budget/payment streak | Rewards consistency |
| Challenge Champion | Challenges completed this month | Rewards engagement |
| Achievement Hunter | Total achievements unlocked | Rewards exploration |

### Safety Rules
- **No income/wealth display.** Ever. Comparing net worth is toxic.
- **Anonymized by default.** Usernames, not real names.
- **Age bracket option.** Compare with peers, not billionaires.
- **Opt-in only.** Never auto-enroll anyone.

---

## 5. Score Bonus System

Challenges and special actions grant temporary score bonuses:
- Bonuses show separately from base score: "742 (+15 bonus)"
- Bonuses decay over 30 days (encourages continued engagement)
- Max bonus cap: +50 points (prevents gaming)
- Bonuses motivate action but don't inflate the real score permanently

---

## 6. Notifications & Nudges

Smart, score-tied notifications (not spam):

### Trigger-Based
- "🔥 Your payment streak is at 5 months! Don't break it — rent is due in 3 days."
- "📈 Your score jumped +12 this week! Keep it up."
- "⚠️ You're $23 over on dining. Cut back this weekend to stay green."
- "🏆 You just unlocked 'Debt Slayer'! Only 15% of users have this."

### Weekly Digest (email/push)
- Score change this week (+/-)
- Streaks status
- Active challenges progress
- Top AI suggestion

### Smart Timing
- Learn when user typically opens app
- Don't spam — max 1 push notification per day
- Night mode: no notifications 11PM-8AM unless urgent bill due

---

## Design Principles

1. **Earn, don't give.** Achievements should feel meaningful, not participation trophies.
2. **Never punish harshly.** A broken streak hurts, but streak freezes and recovery achievements (Phoenix badge) keep people from rage-quitting.
3. **Normalize struggle.** Secret badges for bouncing back (Phoenix) tell users "it's okay to stumble."
4. **No wealth shaming.** Leaderboards measure behavior and improvement, never absolute amounts.
5. **Surprise and delight.** Hidden achievements, milestone celebrations, personalized AI congrats.
6. **Game dev quality.** This isn't lazy fintech gamification. This is engagement loop design from someone who builds games.
