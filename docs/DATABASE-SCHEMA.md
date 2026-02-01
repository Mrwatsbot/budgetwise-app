# Database Schema

## Tables Overview

### Core (from base schema)
| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (extends Supabase Auth). Tiers: free, plus, pro |
| `accounts` | Bank accounts, credit cards, cash, investment accounts |
| `categories` | Spending categories (system defaults + user custom) |
| `transactions` | Individual income/expense transactions |
| `budgets` | Monthly budget allocations per category |
| `payee_rules` | Auto-rename/categorize rules for payees |
| `ai_usage` | Rate limiting for AI features |

### Financial Tracking (migration 001)
| Table | Purpose |
|-------|---------|
| `debts` | Individual debts with type, balance, APR, payments |
| `debt_payments` | Payment history per debt (tracks extra payments) |
| `savings_goals` | Savings targets (emergency, 401k, IRA, HSA, etc.) |
| `savings_contributions` | Contribution history per savings goal |
| `bills` | Recurring bills with due dates |
| `bill_payments` | Bill payment history (on-time/late tracking) |

### Gamification (migration 001)
| Table | Purpose |
|-------|---------|
| `score_history` | Daily score snapshots with full pillar breakdown |
| `achievement_definitions` | Global achievement definitions (seeded) |
| `user_achievements` | Per-user unlocked achievements |
| `streaks` | Per-user streak tracking (payment, budget, savings, logging) |
| `challenge_definitions` | Global challenge definitions (seeded) |
| `user_challenges` | Per-user active/completed challenges |

### Key Relationships

```
profiles
  ├── accounts
  │     └── transactions
  ├── categories ←── budgets
  ├── debts
  │     └── debt_payments
  ├── savings_goals
  │     └── savings_contributions
  ├── bills
  │     └── bill_payments
  ├── score_history
  ├── user_achievements → achievement_definitions
  ├── user_challenges → challenge_definitions
  ├── streaks
  └── ai_usage
```

### Subscription Tiers
| Tier | Features |
|------|----------|
| `free` | Score + manual tracking + CSV + basic gamification + 3 AI/month |
| `plus` | Full gamification + unlimited AI + leaderboards |
| `pro` | Everything + bank sync (Plaid) + family sharing |

### Debt Types (11 + other)
Matches the scoring algorithm's type multipliers:
- `credit_card` (1.5) | `cc_paid_monthly` (0.05) | `mortgage` (0.3)
- `heloc` (0.35) | `auto` (0.7) | `student` (0.5) | `personal` (1.0)
- `medical` (0.4) | `business` (0.6) | `payday` (2.5) | `bnpl` (1.2)
- `zero_pct` (0.1) | `secured` (0.15) | `other` (1.0)
- `in_collections` = 1.5x multiplier on top of base

### Savings Goal Types
- `emergency` | `general` | `retirement_401k` | `ira`
- `hsa` | `education_529` | `brokerage` | `custom`

### All tables use Row Level Security (RLS)
Every table enforces `auth.uid() = user_id` — users can only see/modify their own data.
