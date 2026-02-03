-- ============================================================
-- AI Chat - Seed Knowledge Base Articles (25 articles)
-- ============================================================

INSERT INTO knowledge_base_articles (slug, category, question, alternate_questions, answer, short_answer, keywords) VALUES

-- ========== APP USAGE (10) ==========

('how-to-create-budget', 'app_usage',
 'How do I create a budget?',
 ARRAY['How to add a budget', 'How to set up a budget', 'How do I make a budget', 'Create new budget', 'Setting up my first budget'],
 'To create a budget in Thallo:

1. Go to the **Budgets** page from the sidebar
2. Click **Add Budget** or the + button
3. Select a category (e.g., Groceries, Entertainment)
4. Set your monthly budget amount
5. Click **Save**

Your budget will track spending automatically from transactions in that category. You can also use **Auto Budget** (Plus/Pro) to let AI suggest amounts based on your spending history.',
 'Go to Budgets → Add Budget → pick a category and amount → Save.',
 ARRAY['budget', 'create', 'add', 'new', 'set up', 'make', 'start']),

('how-to-add-transaction', 'app_usage',
 'How do I add a transaction?',
 ARRAY['How to log a transaction', 'How to record an expense', 'How to enter spending', 'Add expense manually', 'Track a purchase'],
 'To add a transaction manually:

1. Go to **Transactions** or tap the **+** button on mobile
2. Enter the amount
3. Select a category
4. Add a description (optional)
5. Set the date
6. Click **Save**

Transactions with negative amounts are expenses; positive amounts are income. If you link a bank account, transactions import automatically.',
 'Go to Transactions → tap + → enter amount, category, and description → Save.',
 ARRAY['transaction', 'add', 'expense', 'spending', 'record', 'log', 'enter', 'track', 'purchase']),

('how-to-use-auto-budget', 'app_usage',
 'What is Auto Budget and how do I use it?',
 ARRAY['How does auto budget work', 'AI budget suggestions', 'Automatic budget creation', 'Let AI set my budget'],
 'Auto Budget is an AI-powered feature (Plus/Pro plans) that analyzes your income and spending patterns to suggest optimal budget amounts for each category.

To use it:
1. Go to **Budgets** page
2. Click **Auto Budget**
3. Review the AI-suggested amounts
4. Adjust any amounts you want to change
5. Click **Apply** to set all budgets at once

Auto Budget considers your income, past spending, financial goals, and the 50/30/20 rule to create a balanced budget.',
 'Auto Budget (Plus/Pro) uses AI to suggest budget amounts based on your income and spending patterns. Find it on the Budgets page.',
 ARRAY['auto budget', 'automatic', 'ai budget', 'suggest', 'smart budget', 'auto']),

('how-to-set-up-categories', 'app_usage',
 'How do I set up or customize categories?',
 ARRAY['How to add categories', 'How to edit categories', 'Custom categories', 'Change transaction categories', 'Category management'],
 'Thallo comes with default categories (Groceries, Rent, Entertainment, etc.), but you can customize them:

1. Go to **Settings** → **Categories**
2. Click **Add Category** to create a new one
3. Choose a name, icon, and type (expense/income)
4. You can also set **category rules** to automatically categorize transactions based on merchant name

To recategorize a transaction, tap on it and select a different category.',
 'Go to Settings → Categories to add or edit categories. You can also set rules for automatic categorization.',
 ARRAY['category', 'categories', 'customize', 'add', 'edit', 'set up', 'recategorize']),

('how-to-link-bank', 'app_usage',
 'How do I link my bank account?',
 ARRAY['Connect bank account', 'Add bank account', 'How to link bank', 'Plaid connection', 'Import transactions from bank'],
 'To link your bank account for automatic transaction imports:

1. Go to **Settings** → **Linked Accounts**
2. Click **Link Account**
3. Search for your bank
4. Log in with your bank credentials through our secure connection (Plaid)
5. Select which accounts to link

Your transactions will sync automatically. The connection is secured through Plaid and Thallo never stores your bank login credentials.',
 'Go to Settings → Linked Accounts → Link Account → search for your bank and log in securely through Plaid.',
 ARRAY['bank', 'link', 'connect', 'plaid', 'account', 'import', 'sync']),

('how-to-split-transaction', 'app_usage',
 'How do I split a transaction across categories?',
 ARRAY['Split transaction', 'Divide transaction', 'Transaction in multiple categories', 'Split expense'],
 'To split a transaction across multiple categories:

1. Go to **Transactions** and find the transaction
2. Tap on it to open details
3. Click **Split**
4. Add the categories and amounts for each split
5. Make sure the splits add up to the total
6. Click **Save**

This is useful for trips to stores like Walmart where you buy groceries and household items together.',
 'Open a transaction → click Split → assign amounts to different categories → Save.',
 ARRAY['split', 'divide', 'multiple categories', 'transaction']),

('how-to-set-savings-goal', 'app_usage',
 'How do I set up a savings goal?',
 ARRAY['Create savings goal', 'Add savings goal', 'How to save for something', 'Set up emergency fund', 'Track savings'],
 'To create a savings goal:

1. Go to the **Savings** page
2. Click **Add Goal**
3. Choose a goal type (Emergency Fund, Retirement, Custom, etc.)
4. Set your target amount
5. Set a monthly contribution amount
6. Optionally set a target date

Thallo will track your progress and show you how close you are to reaching each goal. You can update your current balance anytime.',
 'Go to Savings → Add Goal → choose type, target amount, and monthly contribution → Save.',
 ARRAY['savings', 'goal', 'save', 'emergency fund', 'target', 'set up']),

('how-to-track-debt', 'app_usage',
 'How do I track my debts in Thallo?',
 ARRAY['Add debt', 'Track loans', 'Manage debt', 'Add credit card debt', 'Student loan tracking'],
 'To track your debts:

1. Go to the **Debts** page
2. Click **Add Debt**
3. Select the debt type (credit card, student loan, mortgage, etc.)
4. Enter the current balance, APR, and minimum payment
5. Set your monthly payment amount
6. Click **Save**

Thallo will calculate your payoff timeline and show you how different payment strategies (snowball vs. avalanche) can save you money.',
 'Go to Debts → Add Debt → enter balance, APR, and payment amount. Thallo calculates your payoff timeline.',
 ARRAY['debt', 'loan', 'credit card', 'track', 'add', 'manage', 'student loan', 'mortgage']),

('how-to-export-data', 'app_usage',
 'How do I export my financial data?',
 ARRAY['Download my data', 'Export transactions', 'Export CSV', 'Download budget data', 'Get my data'],
 'To export your data from Thallo:

1. Go to **Settings** → **Data & Privacy**
2. Click **Export Data**
3. Choose what to export (transactions, budgets, etc.)
4. Select the date range
5. Choose format (CSV)
6. Click **Download**

Your export will include transaction details, budget information, and account summaries for the selected period.',
 'Go to Settings → Data & Privacy → Export Data → choose what to export and download as CSV.',
 ARRAY['export', 'download', 'csv', 'data', 'transactions']),

('how-to-view-reports', 'app_usage',
 'How do I view spending reports and charts?',
 ARRAY['Spending reports', 'View charts', 'Analytics', 'Where am I spending', 'Spending breakdown'],
 'Thallo offers several ways to visualize your finances:

- **Dashboard**: Overview with spending trends, budget status, and key metrics
- **Review**: Detailed weekly/monthly spending review with AI insights (Plus/Pro)
- **Budgets**: See category-by-category budget vs. actual spending
- **Score**: Your Financial Health Score breakdown across multiple pillars

Each page has charts showing trends over time. The AI Coach (Plus/Pro) can also give you personalized spending analysis.',
 'Check your Dashboard for an overview, Review page for detailed analysis, or Budgets page for category spending.',
 ARRAY['reports', 'charts', 'spending', 'analytics', 'breakdown', 'trends', 'graphs']),

-- ========== FEATURES (7) ==========

('what-is-health-score', 'finance_education',
 'What is the Financial Health Score?',
 ARRAY['What is health score', 'How does the score work', 'Financial score explained', 'My score meaning'],
 'Your Financial Health Score is a 0-100 rating that measures your overall financial wellness across several pillars:

- **Spending**: Are you living within your means?
- **Savings**: Do you have an emergency fund and savings goals on track?
- **Debt**: Is your debt-to-income ratio healthy?
- **Budgeting**: Are you sticking to your budgets?
- **Consistency**: Are you tracking your finances regularly?

The score updates as you use Thallo. A score of 70+ is considered good. Focus on the lowest-scoring pillar for the biggest improvement.',
 'Your Financial Health Score (0-100) measures spending, savings, debt, budgeting, and consistency. 70+ is good.',
 ARRAY['health score', 'score', 'financial health', 'rating', 'pillars']),

('how-rollover-works', 'finance_education',
 'How does budget rollover work?',
 ARRAY['Budget rollover explained', 'Carry over budget', 'Unused budget next month', 'What happens to unspent budget'],
 'Budget rollover lets you carry unused budget amounts into the next month:

- If you budget $400 for groceries but only spend $350, the extra $50 rolls into next month
- Your next month''s grocery budget becomes $450
- Overspending also rolls over — if you spend $420, next month starts at $380

Rollover is **enabled by default** for each budget. You can toggle it off per-category in budget settings if you prefer a fresh start each month.',
 'Rollover carries unspent budget to the next month. Underspend adds to next month; overspend subtracts from it.',
 ARRAY['rollover', 'carry over', 'unused budget', 'next month', 'overspend']),

('subscription-tiers', 'account',
 'What subscription plans are available?',
 ARRAY['Pricing plans', 'What does Plus include', 'What does Pro include', 'Free vs paid', 'Upgrade options'],
 'Thallo offers three tiers:

**Free** — Core budgeting features:
- Manual transactions and budgets
- Categories and basic reports
- Financial Health Score
- Debt tracking

**Plus** ($4.08/mo) — Everything in Free, plus:
- Bank account linking (auto-import)
- AI Coach and insights
- Auto Budget
- Spending Review with AI analysis
- Product & receipt scanning

**Pro** ($8.25/mo) — Everything in Plus, plus:
- Unlimited AI features
- Priority support
- Advanced debt payoff planning
- Bring your own API key option',
 'Free (core features), Plus ($4.08/mo, bank linking + AI), Pro ($8.25/mo, unlimited AI + priority support).',
 ARRAY['subscription', 'plan', 'tier', 'pricing', 'free', 'plus', 'pro', 'upgrade', 'cost', 'price']),

('how-50-30-20-works', 'finance_education',
 'What is the 50/30/20 budget rule?',
 ARRAY['50 30 20 rule', 'Budget rule explained', 'How to split income', 'Budgeting percentages'],
 'The 50/30/20 rule is a simple budgeting guideline:

- **50% Needs**: Rent, utilities, groceries, insurance, minimum debt payments
- **30% Wants**: Dining out, entertainment, shopping, subscriptions
- **20% Savings & Debt**: Emergency fund, savings goals, extra debt payments

For example, on a $4,000/mo income:
- $2,000 → Needs
- $1,200 → Wants
- $800 → Savings & extra debt payments

Thallo''s Auto Budget can allocate your income using this framework automatically.',
 'Spend 50% on needs, 30% on wants, 20% on savings/debt. Thallo''s Auto Budget can apply this rule for you.',
 ARRAY['50/30/20', 'budget rule', 'needs', 'wants', 'savings', 'income split', 'budgeting rule']),

('snowball-vs-avalanche', 'finance_education',
 'What is debt snowball vs avalanche method?',
 ARRAY['Debt payoff strategies', 'Snowball method', 'Avalanche method', 'Best way to pay off debt', 'Which debt to pay first'],
 'Two popular debt payoff strategies:

**Snowball** (smallest balance first):
- Pay minimums on everything
- Put extra money toward the smallest debt
- ✅ Quick wins keep you motivated
- ❌ May cost more in interest overall

**Avalanche** (highest APR first):
- Pay minimums on everything
- Put extra money toward the highest-interest debt
- ✅ Saves the most money mathematically
- ❌ Can take longer to see the first debt disappear

Thallo''s Debt page shows you both strategies and calculates how much each one costs. Use the AI Payoff Planner (Plus/Pro) for personalized recommendations.',
 'Snowball pays smallest debt first (motivating). Avalanche pays highest interest first (cheapest). Thallo shows both.',
 ARRAY['snowball', 'avalanche', 'debt payoff', 'strategy', 'pay off', 'interest', 'method']),

('what-is-net-worth', 'finance_education',
 'What is net worth and how is it calculated?',
 ARRAY['Net worth meaning', 'How to calculate net worth', 'Assets minus liabilities', 'My net worth'],
 'Net worth is simply:

**Assets − Liabilities = Net Worth**

- **Assets**: Bank account balances, savings, investments, property value
- **Liabilities**: Credit card debt, loans, mortgage balance

A negative net worth is normal early in your financial journey (especially with student loans or a mortgage). What matters is the **trend** — is your net worth growing over time?

In Thallo, your net worth is calculated from your linked accounts and tracked debts.',
 'Net worth = assets minus liabilities. Track it in Thallo through your accounts and debts.',
 ARRAY['net worth', 'assets', 'liabilities', 'worth', 'calculate']),

('emergency-fund-guide', 'finance_education',
 'What is an emergency fund and how much do I need?',
 ARRAY['How much emergency savings', 'Emergency fund amount', 'Why do I need emergency fund', 'Rainy day fund'],
 'An emergency fund is savings set aside for unexpected expenses — job loss, medical bills, car repairs, etc.

**How much:**
- **Starter goal**: $1,000 (covers most small emergencies)
- **Standard goal**: 3-6 months of essential expenses
- **Conservative goal**: 6-12 months (freelancers, single income)

**Where to keep it**: A high-yield savings account — accessible but separate from daily spending.

Set up an Emergency Fund savings goal in Thallo to track your progress!',
 'An emergency fund covers unexpected expenses. Aim for 3-6 months of essential expenses in a high-yield savings account.',
 ARRAY['emergency fund', 'savings', 'rainy day', 'how much', 'unexpected']),

-- ========== ACCOUNT (4) ==========

('change-password', 'account',
 'How do I change my password?',
 ARRAY['Reset password', 'Update password', 'Forgot password', 'Change login'],
 'To change your password:

1. Go to **Settings** → **Account**
2. Click **Change Password**
3. Enter your current password
4. Enter your new password (min 8 characters)
5. Click **Update**

If you''ve forgotten your password, click **Forgot Password** on the login screen and we''ll send a reset link to your email.',
 'Go to Settings → Account → Change Password. Or use Forgot Password on the login screen.',
 ARRAY['password', 'change', 'reset', 'forgot', 'update', 'login']),

('delete-account', 'account',
 'How do I delete my account?',
 ARRAY['Remove account', 'Cancel account', 'Close account', 'Delete my data'],
 'To delete your Thallo account:

1. Go to **Settings** → **Account**
2. Scroll to **Danger Zone**
3. Click **Delete Account**
4. Confirm by typing "DELETE"
5. Click **Permanently Delete**

⚠️ This action is irreversible. All your data (transactions, budgets, goals, etc.) will be permanently deleted. If you have an active subscription, it will be canceled automatically.

We recommend exporting your data first (Settings → Data & Privacy → Export).',
 'Go to Settings → Account → Delete Account. Warning: this permanently deletes all your data.',
 ARRAY['delete', 'account', 'remove', 'cancel', 'close']),

('data-security', 'account',
 'Is my financial data secure?',
 ARRAY['How is my data protected', 'Privacy policy', 'Data encryption', 'Is Thallo safe', 'Security measures'],
 'Thallo takes your data security seriously:

- **Bank connections** are handled through Plaid — we never see or store your bank login credentials
- **Data encryption**: All data is encrypted in transit (TLS) and at rest
- **Authentication**: Secure session management with row-level security — you can only access your own data
- **No data selling**: We never sell your financial data to third parties
- **Data export**: You can export or delete all your data at any time

For more details, see our Privacy Policy in the app footer.',
 'Thallo uses encryption, Plaid for bank connections (never stores your credentials), and row-level security. We never sell your data.',
 ARRAY['security', 'safe', 'privacy', 'encryption', 'data', 'protect']),

('contact-support', 'account',
 'How do I contact support?',
 ARRAY['Help', 'Customer service', 'Talk to human', 'Support email', 'Get help'],
 'You can reach Thallo support in several ways:

- **AI Chat** (right here!): Ask me anything about budgeting or the app
- **Email**: support@thallo.app — we respond within 24 hours
- **In-app Feedback**: Settings → Send Feedback

For account or billing issues, email is the fastest way to reach a human. Include your account email so we can look you up quickly.',
 'Use this AI chat for quick help, or email support@thallo.app for account/billing issues.',
 ARRAY['support', 'help', 'contact', 'email', 'customer service', 'human']),

-- ========== TROUBLESHOOTING (4) ==========

('bank-connection-issues', 'troubleshooting',
 'My bank connection is not working',
 ARRAY['Bank not syncing', 'Plaid connection failed', 'Cannot connect bank', 'Bank login error', 'Re-link bank account'],
 'If your bank connection is having issues:

1. **Re-authenticate**: Go to Settings → Linked Accounts → click the affected bank → Re-link
2. **Check bank status**: Some banks have temporary outages. Try again in a few hours
3. **Clear and re-add**: If re-linking doesn''t work, remove the connection and add it again
4. **Two-factor auth**: Make sure you complete any 2FA prompts from your bank

Common issues:
- Bank changed their login page (Plaid needs to update)
- Your bank password recently changed
- Bank is blocking third-party access (contact your bank)

If problems persist, email support@thallo.app with your bank name.',
 'Try re-linking your bank in Settings → Linked Accounts. If that fails, remove and re-add the connection.',
 ARRAY['bank', 'connection', 'not working', 'sync', 'plaid', 'error', 'failed', 'broken']),

('transactions-not-syncing', 'troubleshooting',
 'My transactions are not syncing',
 ARRAY['Missing transactions', 'Transactions not updating', 'No new transactions', 'Sync not working', 'Old transactions'],
 'If transactions aren''t syncing from your bank:

1. **Wait a bit**: Bank syncs happen periodically, not in real-time. It can take up to 24 hours
2. **Manual refresh**: Go to Settings → Linked Accounts and tap your bank → Refresh
3. **Check the connection**: Make sure the bank link is active (green status)
4. **Pending transactions**: Some banks don''t report pending transactions

If transactions are consistently missing:
- Check if the account is selected for syncing
- Re-link the bank connection
- Contact support@thallo.app if the issue persists',
 'Bank syncs can take up to 24 hours. Try manual refresh in Settings → Linked Accounts. Re-link if needed.',
 ARRAY['sync', 'transactions', 'not syncing', 'missing', 'update', 'refresh']),

('app-loading-slow', 'troubleshooting',
 'The app is loading slowly',
 ARRAY['App is slow', 'Pages not loading', 'Thallo is laggy', 'App performance issues', 'Slow loading'],
 'If Thallo is loading slowly:

1. **Check your connection**: Make sure you have a stable internet connection
2. **Clear browser cache**: Try a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. **Try a different browser**: Chrome and Firefox work best
4. **Reduce data**: If you have thousands of transactions, loading may be slower on the first visit

The app caches data locally, so subsequent visits should be faster. If the problem persists, it may be a temporary server issue — try again in a few minutes.',
 'Try clearing your browser cache (Ctrl+Shift+R), checking your internet, or using Chrome/Firefox.',
 ARRAY['slow', 'loading', 'performance', 'laggy', 'speed', 'not loading']),

('categories-wrong', 'troubleshooting',
 'My transactions are being categorized incorrectly',
 ARRAY['Wrong category', 'Fix category', 'Auto-categorization wrong', 'Change transaction category', 'Recategorize'],
 'If transactions are landing in the wrong category:

1. **Manual fix**: Tap the transaction → change the category
2. **Set a rule**: Settings → Category Rules → Add Rule. For example, set "Walmart" to always go to "Groceries"
3. **AI will learn**: When you recategorize transactions, the AI learns your preferences over time

Common issues:
- Generic merchants (Amazon, Walmart) may default to the wrong category
- New merchants default to "Uncategorized"

Category rules are the best way to fix recurring miscategorizations.',
 'Tap a transaction to change its category. Set category rules in Settings to auto-fix recurring merchants.',
 ARRAY['category', 'wrong', 'incorrect', 'fix', 'recategorize', 'miscategorized', 'auto-categorize']);
