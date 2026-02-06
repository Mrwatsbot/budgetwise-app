import { 
  AITask, 
  MODEL_CONFIG, 
  FALLBACK_MODELS, 
  TEMPERATURE_CONFIG, 
  MAX_TOKENS_CONFIG,
  estimateCost,
} from './config';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ============================================================
// TYPES
// ============================================================

interface TextContent {
  type: 'text';
  text: string;
}

interface ImageContent {
  type: 'image_url';
  image_url: {
    url: string; // base64 data URL or https URL
  };
}

type MessageContent = string | (TextContent | ImageContent)[];

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: MessageContent;
}

interface AIResponse {
  content: string;
  model: string;
  task: AITask;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  estimatedCost?: number;
}

interface AIRequestOptions {
  task: AITask;
  messages: Message[];
  overrideModel?: string;
  overrideTemp?: number;
}

// ============================================================
// CORE API
// ============================================================

export async function callAI(options: AIRequestOptions): Promise<AIResponse> {
  const { task, messages, overrideModel, overrideTemp } = options;
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const model = overrideModel || MODEL_CONFIG[task];
  const temperature = overrideTemp ?? TEMPERATURE_CONFIG[task];
  const maxTokens = MAX_TOKENS_CONFIG[task];

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://thallo.app',
        'X-Title': 'Thallo',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`OpenRouter error (${model}):`, error);
      
      if (!overrideModel) {
        console.log(`Trying fallback model for ${task}...`);
        return callAI({
          ...options,
          overrideModel: FALLBACK_MODELS[task],
        });
      }
      
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    
    const usage = data.usage;
    const cost = usage 
      ? estimateCost(data.model || model, usage.prompt_tokens, usage.completion_tokens)
      : undefined;

    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model || model,
      task,
      usage,
      estimatedCost: cost,
    };
  } catch (error) {
    if (!overrideModel) {
      console.log(`Error with ${model}, trying fallback...`);
      return callAI({
        ...options,
        overrideModel: FALLBACK_MODELS[task],
      });
    }
    throw error;
  }
}

// ============================================================
// VISION API — For document/receipt scanning
// ============================================================

export async function scanDocument(
  imageBase64: string, 
  mimeType: string = 'image/jpeg'
): Promise<AIResponse> {
  const dataUrl = imageBase64.startsWith('data:') 
    ? imageBase64 
    : `data:${mimeType};base64,${imageBase64}`;

  return callAI({
    task: 'scan_statement',
    messages: [
      {
        role: 'system',
        content: `You are a financial document reader. Extract debt/loan information from the uploaded statement image.

Return ONLY valid JSON with this structure (use null for fields you can't find):
{
  "name": "string — creditor/lender name (e.g. 'Chase Visa', 'Sallie Mae')",
  "type": "string — one of: credit_card, cc_paid_monthly, mortgage, heloc, auto, student, personal, medical, business, payday, bnpl, zero_pct, secured, other",
  "current_balance": number,
  "original_balance": number or null,
  "apr": number (as percentage, e.g. 24.99),
  "minimum_payment": number or null,
  "monthly_payment": number or null,
  "due_day": number (1-31) or null,
  "in_collections": boolean,
  "confidence": number (0-1, how confident you are in the extraction)
}

Be precise. If you see multiple debts, return an array of objects. If it's not a financial document, return {"error": "Not a financial document"}.`,
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract the debt information from this statement:' },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
  });
}

export async function scanReceipt(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<AIResponse> {
  const dataUrl = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:${mimeType};base64,${imageBase64}`;

  return callAI({
    task: 'scan_receipt',
    messages: [
      {
        role: 'system',
        content: `You are a receipt reader. Extract transaction information from the receipt image.

Return ONLY valid JSON:
{
  "vendor": "string — store/business name",
  "amount": number (total amount),
  "date": "YYYY-MM-DD",
  "category": "string — one of: Groceries, Dining Out, Transportation, Utilities, Healthcare, Entertainment, Shopping, Personal Care, Education, Subscriptions, Other",
  "items": ["string — key items if readable"] or null,
  "confidence": number (0-1)
}`,
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract the transaction details from this receipt:' },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
  });
}

// ============================================================
// TASK-SPECIFIC FUNCTIONS
// ============================================================

export async function categorizeTransaction(transaction: string): Promise<AIResponse> {
  return callAI({
    task: 'categorize',
    messages: [
      {
        role: 'system',
        content: `Categorize the transaction. Reply with ONLY the category name:
Groceries, Dining Out, Transportation, Utilities, Housing, Healthcare, Entertainment, Shopping, Personal Care, Education, Subscriptions, Insurance, Gifts, Travel, Pets, Other Expense, Salary, Freelance, Investment, Refund, Other Income`,
      },
      { role: 'user', content: transaction },
    ],
  });
}

export async function cleanPayee(rawPayee: string): Promise<AIResponse> {
  return callAI({
    task: 'clean_payee',
    messages: [
      {
        role: 'system',
        content: 'Clean up this bank transaction payee name. Return ONLY the clean, human-readable business name. Examples: "CHIPOTLE MEXICAN GR #2847 AUSTIN TX" → "Chipotle", "AMZN MKTP US*2K4M9J1H0" → "Amazon"',
      },
      { role: 'user', content: rawPayee },
    ],
  });
}

export async function analyzeSpending(transactionData: string): Promise<AIResponse> {
  return callAI({
    task: 'analyze_spending',
    messages: [
      {
        role: 'system',
        content: `You are a personal finance analyst for Thallo. Note: All data is anonymized. Payee names have been removed; only categories and amounts are provided. Analyze spending data and provide:
1. Top 3 spending patterns or trends
2. Areas of concern (if any)
3. Specific actionable recommendations tied to their Financial Health Score
4. One positive observation

Be concise, use bullet points, be specific with numbers. Tie recommendations to score impact when possible (e.g. "Reducing dining by $50/mo would boost your Budget Discipline by ~10 points").`,
      },
      {
        role: 'user',
        content: `Analyze this spending data:\n\n${transactionData}`,
      },
    ],
  });
}

export async function debtStrategy(debtData: string): Promise<AIResponse> {
  return callAI({
    task: 'debt_strategy',
    messages: [
      {
        role: 'system',
        content: `You are a debt payoff strategist for Thallo. Note: All data is anonymized. Debt names are replaced with generic labels (e.g. "Debt 1", "Debt 2"). Use these labels in your response. Given the user's debts, provide:
1. Recommended strategy (avalanche, snowball, or hybrid) with reasoning
2. Optimal payment order
3. Projected payoff timeline
4. How much they'd save in interest vs minimum payments
5. Impact on their Financial Health Score (Debt Velocity pillar)

Show the math. Be specific with amounts and dates.`,
      },
      {
        role: 'user',
        content: `Create a debt payoff strategy:\n\n${debtData}`,
      },
    ],
  });
}

export async function budgetSuggestions(financialData: string): Promise<AIResponse> {
  return callAI({
    task: 'budget_suggestions',
    messages: [
      {
        role: 'system',
        content: `You are a budget advisor for Thallo. Based on income and spending history, suggest monthly budgets.

Return a JSON array:
[{"category": "string", "suggested": number, "reasoning": "string"}]

Follow the 50/30/20 rule as a baseline (50% needs, 30% wants, 20% savings/debt), adjusted for the user's actual situation. Note where they're over/under and why the adjustment helps their Financial Health Score.`,
      },
      {
        role: 'user',
        content: `Suggest budgets based on this data:\n\n${financialData}`,
      },
    ],
  });
}

export async function scoreCoach(scoreData: string): Promise<AIResponse> {
  return callAI({
    task: 'score_coach',
    messages: [
      {
        role: 'system',
        content: `You are the Thallo Score Coach. Note: All data is anonymized. Names are replaced with generic labels. Given the user's Financial Health Score breakdown, provide:
1. Their weakest pillar and why
2. Top 3 specific actions to improve (with estimated point impact)
3. What they're doing well (positive reinforcement)
4. One "quick win" they can do this week

Be motivational but honest. Tie every suggestion to specific score points. Format for mobile reading (short paragraphs, bullet points).`,
      },
      {
        role: 'user',
        content: `Coach me on improving my score:\n\n${scoreData}`,
      },
    ],
  });
}

export async function findSavings(transactionData: string): Promise<AIResponse> {
  return callAI({
    task: 'find_savings',
    messages: [
      {
        role: 'system',
        content: `You are a savings expert for Thallo. Note: All data is anonymized. Payee names have been removed; only categories and amounts are provided. Find ways to reduce expenses:
1. Subscriptions that might be unused or redundant
2. Recurring charges that could be negotiated
3. Spending categories where costs seem high
4. Potential alternatives or switches

Be specific with amounts. Estimate monthly/yearly savings. Prioritize by impact.`,
      },
      {
        role: 'user',
        content: `Find savings opportunities:\n\n${transactionData}`,
      },
    ],
  });
}

export async function generatePayoffPlan(debtData: string): Promise<AIResponse> {
  return callAI({
    task: 'debt_payoff_plan',
    messages: [
      {
        role: 'system',
        content: `You are a debt payoff strategist. Analyze the user's debts and create a detailed payoff plan.

Note: All data is anonymized. Names are replaced with generic labels (e.g. "Debt 1", "Debt 2"). Use these labels in your response.

Return ONLY valid JSON with this structure:
{
  "strategy": "avalanche" | "snowball" | "hybrid",
  "strategy_reasoning": "2-3 sentences explaining why this strategy fits their situation",
  "payment_order": [
    { "name": "string", "type": "string", "balance": number, "apr": number, "reason": "Why this debt is in this position" }
  ],
  "scenarios": [
    {
      "label": "Minimum payments only",
      "extra_monthly": 0,
      "total_months": number,
      "total_interest": number,
      "total_paid": number,
      "payoff_date": "Month Year"
    },
    {
      "label": "Extra $50/month",
      "extra_monthly": 50,
      "total_months": number,
      "total_interest": number,
      "months_saved": number,
      "interest_saved": number,
      "total_paid": number,
      "payoff_date": "Month Year"
    },
    {
      "label": "Extra $100/month",
      "extra_monthly": 100,
      "total_months": number,
      "total_interest": number,
      "months_saved": number,
      "interest_saved": number,
      "total_paid": number,
      "payoff_date": "Month Year"
    },
    {
      "label": "Extra $200/month",
      "extra_monthly": 200,
      "total_months": number,
      "total_interest": number,
      "months_saved": number,
      "interest_saved": number,
      "total_paid": number,
      "payoff_date": "Month Year"
    }
  ],
  "quick_wins": ["string", "string", "string"]
}

Rules:
- Calculate real numbers based on their actual balances and APRs
- Use amortization math for loans, revolving for credit cards
- For the scenarios, apply extra payments to the highest priority debt first (per strategy)
- Include at least 4 scenarios: minimum, +$50, +$100, +$200
- Quick wins should be specific to their debts with actual dollar amounts
- If they have student/auto/mortgage loans, note the long-term impact of extra payments
- Return ONLY the JSON, no markdown wrapping`,
      },
      {
        role: 'user',
        content: `Create a payoff plan for these debts:\n\n${debtData}`,
      },
    ],
  });
}

export async function generatePageInsights(page: string, contextData: string): Promise<AIResponse> {
  const pagePrompts: Record<string, string> = {
    dashboard: 'Analyze the overall financial picture. Focus on: spending trends vs last month, balance health, and one quick win.',
    budgets: 'Analyze budget adherence. Focus on: categories over/under budget, optimization opportunities, and spending velocity.',
    transactions: 'Analyze recent transactions. Focus on: unusual spending, recurring charges, and potential savings.',
    savings: 'Analyze savings progress. Focus on: goal projections at current rate, contribution optimization, and milestones approaching.',
    debts: 'Analyze debt situation. Focus on: optimal payoff strategy, interest cost reduction, and progress milestones.',
  };

  return callAI({
    task: 'page_insights',
    messages: [
      {
        role: 'system',
        content: `You are Thallo AI, a sharp financial analyst. ${pagePrompts[page] || pagePrompts.dashboard}

Note: All data is anonymized. Personal names, account names, and payee names have been removed or replaced with generic labels. Use these labels in your response.

Return EXACTLY 3 insights as a JSON array. Each insight:
{
  "type": "tip" | "warning" | "positive" | "action",
  "title": "Short headline (5-8 words)",
  "body": "One sentence explanation with specific numbers",
  "impact": "Optional: score/savings impact estimate"
}

Rules:
- Use real numbers from the data, never generic advice
- "warning" = something needs attention
- "positive" = something they're doing well
- "tip" = optimization opportunity
- "action" = specific thing to do this week
- Be concise. Mobile-first. No fluff.
- Return ONLY the JSON array, no markdown wrapping.`,
      },
      {
        role: 'user',
        content: `Here's my ${page} data:\n\n${contextData}`,
      },
    ],
  });
}

export async function generateAutoBudget(financialProfile: string): Promise<AIResponse> {
  return callAI({
    task: 'auto_budget',
    messages: [
      {
        role: 'system',
        content: `You are a personal budget advisor for Thallo. Given the user's financial profile, generate a complete monthly budget allocation.

Note: All data is anonymized. Debt names and savings goal names are replaced with generic labels. Use these labels in your response.

Use the 50/30/20 rule as a baseline:
- 50% Needs (housing, groceries, utilities, insurance, transportation, healthcare)
- 30% Wants (dining out, entertainment, shopping, subscriptions, personal care)
- 20% Savings & Debt (savings goals, debt payments, emergency fund, investments)

Adjustments:
- If savings_priority is "aggressive": shift to ~40/25/35 (more to savings)
- If savings_priority is "relaxed": shift to ~50/35/15 (less to savings)
- If high debt load (>30% of income): prioritize debt payments, reduce wants
- If low income (<$3000/mo): prioritize needs, but still try to allocate something to savings
- If fixed expenses exceed 50%, adjust proportionally across remaining categories

CRITICAL SAVINGS RULES:
1. **ALWAYS allocate to savings/investment categories** - The 20% (or adjusted %) MUST go to savings, not just expenses
2. **Emergency fund priority**: If emergency_fund_status is "no" or "building", allocate the majority of savings budget to building an emergency fund (3-6 months of expenses)
3. **Savings goals**: If user specified savings goals (house, wedding, car, etc.), create allocations toward those specific goals
4. **Existing savings**: Account for current_savings_contribution - they're already saving that amount outside Thallo
5. Look for savings/investment categories in the available categories list (e.g., "Savings", "Emergency Fund", "Investments", "Retirement") and allocate to them
6. If no specific savings categories exist, still recommend savings in the notes

IMPORTANT: You MUST allocate budgets ONLY to the exact category names provided in the profile. Do not invent categories.

Return ONLY valid JSON with this structure:
{
  "monthly_income": number,
  "allocations": [
    { "category_name": "exact category name from list", "category_id": "uuid-if-provided", "amount": number, "reasoning": "Brief explanation" }
  ],
  "savings_goal_allocations": [
    { "goal_name": "descriptive name", "goal_id": "uuid-from-savings-goals", "monthly_contribution": number, "reasoning": "Brief explanation" }
  ],
  "summary": {
    "total_needs": number,
    "total_wants": number,
    "total_savings_debt": number,
    "needs_pct": number,
    "wants_pct": number,
    "savings_debt_pct": number
  },
  "notes": "Brief explanation of the budget philosophy applied, emphasizing savings strategy and emergency fund priority if applicable"
}

Rules:
- All allocations must sum to the monthly income
- Use round numbers (nearest $5 or $10)
- Fixed expenses (rent, utilities, etc.) should match what the user provided
- THE REMAINING 20% (or adjusted %) MUST GO TO SAVINGS/DEBT, NOT ADDITIONAL EXPENSES
- Every provided category should get an allocation (even if $0)
- If the user has savings goals with IDs, include savings_goal_allocations suggesting monthly contribution amounts for each goal (from the 20% savings portion). Use the exact goal IDs provided. If no savings goals exist, omit savings_goal_allocations or use an empty array.
- Return ONLY the JSON, no markdown wrapping`,
      },
      {
        role: 'user',
        content: `Create a monthly budget for this profile:\n\n${financialProfile}`,
      },
    ],
  });
}

export async function checkAffordability(purchaseData: string, financialContext: string): Promise<AIResponse> {
  return callAI({
    task: 'afford_check',
    messages: [
      {
        role: 'system',
        content: `You are a purchase advisor for Thallo. Analyze whether the user can afford a specific purchase given their current budget and spending.

Note: All data is anonymized. Account names, debt names, and savings goal names are replaced with generic labels. Use these labels in your response.

Give a clear verdict:
- "yes": They can comfortably afford it within their current budget
- "stretch": Possible but requires budget adjustments or will be tight
- "no": Would significantly strain their finances or exceed their means

Return ONLY valid JSON with this structure:
{
  "verdict": "yes" | "stretch" | "no",
  "confidence": number (0-1),
  "reasoning": "2-3 sentences explaining why",
  "impact": {
    "monthly_cost": number,
    "budget_category": "string",
    "current_budget": number,
    "current_spent": number,
    "remaining_after": number
  },
  "adjusted_budget": [
    { "category": "string", "current": number, "adjusted": number, "change": number, "duration_months": number, "reason": "string" }
  ] or null,
  "alternatives": ["string", "string"],
  "score_impact": "string describing impact on Financial Health Score"
}

Rules:
- For financed purchases, use the monthly payment amount as the cost
- For cash purchases, consider the full price against remaining budget
- If verdict is "stretch", always provide adjusted_budget suggestions
- If verdict is "no", still provide alternatives
- Be realistic and specific with numbers
- adjusted_budget should be null if no adjustments needed (verdict "yes")
- Return ONLY the JSON, no markdown wrapping`,
      },
      {
        role: 'user',
        content: `Purchase details:\n${purchaseData}\n\nFinancial context:\n${financialContext}`,
      },
    ],
  });
}

export async function achievementCongrats(achievementName: string, achievementDesc: string, rarity: string): Promise<AIResponse> {
  return callAI({
    task: 'achievement_congrats',
    messages: [
      {
        role: 'system',
        content: 'Generate a short, enthusiastic congratulations message (2-3 sentences max) for unlocking a Thallo achievement. Be fun and motivating. Include the rarity to make it feel special.',
      },
      {
        role: 'user',
        content: `Achievement: "${achievementName}" — ${achievementDesc}. Rarity: ${rarity} of users have this.`,
      },
    ],
  });
}

export async function generateBudgetTune(financialProfile: string): Promise<AIResponse> {
  return callAI({
    task: 'auto_budget',
    messages: [
      {
        role: 'system',
        content: `You are a personal budget optimization advisor for Thallo. Given the user's spending history vs budgeted amounts, suggest budget adjustments that match reality.

Note: All data is anonymized. Debt names and savings goal names are replaced with generic labels. Use these labels in your response.

Your job:
1. Analyze spending patterns across multiple months
2. Identify categories that are consistently over or under budget
3. Reallocate budget amounts to match actual spending while keeping total = income
4. Preserve savings/debt allocations — do NOT raid savings to fund overspending
5. If a category is consistently over budget, find funds from categories that are consistently under budget

Reallocation rules:
- Total allocations MUST equal monthly income
- Prioritize needs over wants (50/30/20 rule as baseline)
- If someone consistently overspends in a "want" category, reduce other wants first before touching needs
- Savings/debt payments should remain stable unless there's a clear opportunity to increase them
- Use round numbers (nearest $5 or $10)

IMPORTANT: You MUST allocate budgets ONLY to the exact category names provided in the profile. Do not invent categories.

Return ONLY valid JSON with this structure:
{
  "monthly_income": number,
  "allocations": [
    { "category_name": "exact category name from list", "category_id": "uuid-if-provided", "amount": number, "reasoning": "Brief explanation of why this changed/stayed same" }
  ],
  "summary": {
    "total_needs": number,
    "total_wants": number,
    "total_savings_debt": number,
    "needs_pct": number,
    "wants_pct": number,
    "savings_debt_pct": number
  },
  "notes": "2-3 sentence summary of key changes and why they'll help the user stay on track"
}

Rules:
- All allocations must sum to the monthly income
- Every provided category should get an allocation
- Focus on REALISTIC adjustments based on actual spending patterns
- Return ONLY the JSON, no markdown wrapping`,
      },
      {
        role: 'user',
        content: `Tune up my budget based on actual spending:\n\n${financialProfile}`,
      },
    ],
  });
}

export async function generateMonthlyNudge(monthSummary: string): Promise<AIResponse> {
  return callAI({
    task: 'score_coach',
    messages: [
      {
        role: 'system',
        content: `You are a financial coach for Thallo's "Month in Review" feature. Given a summary of the user's monthly financial data, provide ONE specific actionable tip for next month and 3 brief secondary observations.

Note: All data is anonymized. Category names and amounts are provided but personal details are removed.

Return ONLY valid JSON with this structure:
{
  "primary": {
    "emoji": "string (one relevant emoji like 🍽️, 💰, 📊, etc.)",
    "text": "string (one specific actionable recommendation with real numbers, 40-80 words)",
    "impact": "string (estimated annual or monthly financial impact, e.g. 'Potential annual savings: $1,200' or 'Could boost score by +8 points')"
  },
  "secondary": [
    "string (brief observation or tip, 15-30 words)",
    "string (brief observation or tip, 15-30 words)",
    "string (brief observation or tip, 15-30 words)"
  ]
}

Rules:
- Primary tip should be SPECIFIC with actual dollar amounts from their data
- Focus on the biggest opportunity (overspending, savings potential, or debt payoff)
- Secondary observations should be diverse (1 positive, 2 actionable)
- Be motivational but honest
- Return ONLY the JSON, no markdown wrapping`,
      },
      {
        role: 'user',
        content: `Analyze this month's data and provide guidance:\n\n${monthSummary}`,
      },
    ],
  });
}

// ============================================================
// GENERIC OPENROUTER CALL (for custom prompts)
// ============================================================

interface GenericOpenRouterOptions {
  model: string;
  messages: Message[];
  max_tokens?: number;
  temperature?: number;
}

interface GenericOpenRouterResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generic OpenRouter API call for custom prompts
 * Use this when you need direct control over the model and prompt
 */
export async function callOpenRouter(options: GenericOpenRouterOptions): Promise<GenericOpenRouterResponse> {
  const { model, messages, max_tokens = 2000, temperature = 0.7 } = options;
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://thallo.app',
      'X-Title': 'Thallo Credit Booster',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`OpenRouter error (${model}):`, error);
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in OpenRouter response');
  }

  return {
    content,
    model: data.model || model,
    usage: data.usage,
  };
}
