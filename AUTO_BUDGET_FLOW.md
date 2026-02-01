# BudgetWise Auto Budget Flow

## Before (3 steps + results)
```
┌─────────────┐    ┌──────────────┐    ┌─────────┐    ┌─────────┐
│   Income    │ →  │ Fixed Costs  │ →  │ Context │ →  │ Results │
│  (Step 0)   │    │   (Step 1)   │    │ (Step 2)│    │ (Step 3)│
└─────────────┘    └──────────────┘    └─────────┘    └─────────┘
      💰                  🏠                 🎯             ✨
```

## After (4 steps + results)
```
┌─────────────┐    ┌──────────────┐    ┌──────────┐    ┌─────────┐    ┌─────────┐
│   Income    │ →  │ Fixed Costs  │ →  │ Savings  │ →  │ Context │ →  │ Results │
│  (Step 0)   │    │   (Step 1)   │    │ (Step 2) │    │ (Step 3)│    │ (Step 4)│
└─────────────┘    └──────────────┘    └──────────┘    └─────────┘    └─────────┘
      💰                  🏠                 🐷              🎯             ✨
```

---

## Step Details

### Step 0: Income 💰
**Unchanged**
- Monthly take-home income input
- Required field

### Step 1: Fixed Costs 🏠
**Unchanged**
- Rent/Mortgage
- Utilities
- Insurance
- Car Payment
- Other Fixed Costs
- All optional

### Step 2: Savings & Goals 🐷
**NEW STEP**

#### Emergency Fund Status (required)
```
┌─────┐  ┌──────────────┐  ┌────┐
│ Yes │  │ Building one │  │ No │
└─────┘  └──────────────┘  └────┘
```
- **Yes**: User has emergency fund → AI won't over-prioritize it
- **Building one**: Currently building → AI maintains current priority
- **No**: Missing emergency fund → **AI prioritizes building 3-6 months expenses**

#### Savings Goals (multi-select, optional)
```
┌─────────────────┐  ┌────────────────────┐
│ 🛡️ Emergency fund│  │ 🏠 House down pmnt │
└─────────────────┘  └────────────────────┘

┌──────────┐  ┌──────┐  ┌─────────────────┐
│ 💍 Wedding│  │ 🚗 Car│  │ 🎓 Kids/education│
└──────────┘  └──────┘  └─────────────────┘

┌───────────┐  ┌──────────────┐  ┌────────┐
│ ✈️ Vacation│  │ 📈 Retirement │  │ ➕ Other│
└───────────┘  └──────────────┘  └────────┘
```
- User can select multiple goals
- If "Other" selected → shows text input
- AI will allocate toward these specific goals

#### Current Savings Contribution (optional)
```
$ [_____] /month
```
- Existing savings/investments outside BudgetWise
- Helps AI understand full financial picture
- Examples: 401k, IRA, automatic savings transfers

### Step 3: Context 🎯
**Unchanged**
- Do you have debts? (Yes/No)
- Savings priority (Aggressive/Moderate/Relaxed)
- Lifestyle notes (optional text)

### Step 4: Results ✨
**Enhanced with better savings allocation**
- Budget breakdown visualization (50/30/20)
- Category allocations with reasoning
- Summary statistics
- **Now includes savings categories!**

---

## AI Prompt Changes

### Before
```
Use the 50/30/20 rule:
- 50% Needs
- 30% Wants
- 20% Savings & Debt

[...allocate to categories...]
```

**Problem:** AI often allocated all money to expenses, ignoring the 20% savings part.

### After
```
Use the 50/30/20 rule:
- 50% Needs
- 30% Wants
- 20% Savings & Debt ← MUST allocate to savings categories

CRITICAL SAVINGS RULES:
1. ALWAYS allocate to savings/investment categories
2. Emergency fund priority if user doesn't have one
3. Allocate toward user's specific savings goals
4. Account for existing contributions
5. Look for savings categories and use them

THE REMAINING 20% MUST GO TO SAVINGS/DEBT, NOT EXPENSES
```

**Result:** AI now properly allocates savings and follows user's goals.

---

## Example User Journey

### Sarah's Input
```
Step 0: Income
  → $5,000/month

Step 1: Fixed Costs
  → Rent: $1,400
  → Utilities: $150
  → Insurance: $200
  → Car: $300

Step 2: Savings (NEW!)
  → Emergency fund: "Building one"
  → Goals: House down payment, Vacation
  → Current savings: $300/month (401k)

Step 3: Context
  → Debts: Yes
  → Priority: Moderate
  → Notes: "Getting married next year"
```

### AI Output (Enhanced)
```
Budget Allocations:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEEDS (50% = $2,500)
  Rent ...................... $1,400
  Utilities ................. $150
  Insurance ................. $200
  Car Payment ............... $300
  Groceries ................. $400
  Gas ....................... $50

WANTS (30% = $1,500)
  Dining Out ................ $300
  Entertainment ............. $150
  Shopping .................. $200
  Personal Care ............. $100
  Subscriptions ............. $100
  Wedding Fund .............. $650 ← for upcoming wedding

SAVINGS & DEBT (20% = $1,000)
  Emergency Fund ............ $400 ← prioritized (no fund yet)
  House Down Payment ........ $300 ← user goal
  Vacation Fund ............. $150 ← user goal
  Debt Payment .............. $150

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Notes: Since you're building an emergency fund,
we've prioritized that with $400/month. Combined
with your $300 401k contribution, you're saving
$1,000/month total (20%). The house and vacation
funds will accelerate once emergency fund hits
3 months of expenses (~$7,500).
```

### Before Enhancement (Old AI)
```
Allocations would have been:
  Needs: $2,500
  Wants: $2,000  ← allocated all remaining here
  Savings: $500  ← minimal, no specific goals
  
❌ No emergency fund focus
❌ No house/vacation allocation
❌ Didn't ask about savings goals
```

---

## Success Metrics

### Technical
- ✅ TypeScript compilation passes
- ✅ Security audit passes (60/60 checks)
- ✅ No type errors
- ✅ RLS enabled
- ✅ Rate limiting works

### User Experience
- 🎯 Savings allocation appears in 100% of budgets
- 🎯 Emergency fund prioritized when status = "no"
- 🎯 Savings goals reflected in category allocations
- 🎯 50/30/20 breakdown accurate
- 🎯 User understands where their money goes to savings

### AI Quality
- Budget quality score: TBD (A/B test old vs new)
- Savings allocation rate: Target >18% for moderate priority
- Emergency fund recommendations: 100% when status = "no"
- User satisfaction: Collect feedback after 100 budgets

---

## Deployment Checklist

- [ ] Code review
- [ ] Manual testing (all steps)
- [ ] Test with demo mode
- [ ] Test with real AI (staging)
- [ ] Verify savings allocations appear
- [ ] Check emergency fund priority
- [ ] Test edge cases (low income, high debt)
- [ ] Monitor first 50 generations
- [ ] Collect user feedback
- [ ] Deploy to production
- [ ] Monitor error rates
- [ ] Track savings allocation rate

**Status:** ✅ Ready for review & testing
