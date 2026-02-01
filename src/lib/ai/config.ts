/**
 * AI Model Configuration — Thallo
 * 
 * Routing logic:
 *   Vision tasks     → Gemini 2.0 Flash ($0.10/M in, $0.40/M out)
 *   Simple text      → GPT-4.1-nano ($0.10/M in, $0.40/M out)
 *   Analysis/reasoning → Grok 4.1 Fast ($0.20/M in, $0.50/M out)
 *   Fallback         → GPT-4o-mini ($0.15/M in, $0.60/M out)
 * 
 * Cost target: <$0.10/user/month even for power users
 */

// ============================================================
// TASK TYPES
// ============================================================

export type AITask =
  // Vision
  | 'scan_statement'      // Read debt/loan statement image → extract fields
  | 'scan_receipt'        // Read receipt image → extract amount, vendor, date
  | 'product_scan'        // Identify product from photo → name, price, category
  | 'receipt_scan_full'   // Detailed receipt scan → merchant, items, totals
  // Simple text
  | 'categorize'          // Classify transaction into category
  | 'clean_payee'         // Clean up raw bank payee names
  | 'achievement_congrats' // Generate unlock celebration text
  // Analysis / reasoning
  | 'analyze_spending'    // Weekly spending pattern analysis
  | 'debt_strategy'       // Optimal payoff plan (avalanche/snowball/hybrid)
  | 'budget_suggestions'  // AI-generated budgets from income + history
  | 'score_coach'         // Tips to improve weakest score pillar
  | 'find_savings'        // Find subscriptions/savings opportunities
  // General
  | 'quick_response'      // Fast, simple responses
  // Insights
  | 'page_insights'       // Per-page cached AI insights
  // Payoff planning
  | 'debt_payoff_plan'    // Detailed debt payoff plan with scenarios
  // Budget tools
  | 'auto_budget'         // AI-generated budget from income/expenses profile
  | 'afford_check';       // "Can I afford this?" purchase analysis

// ============================================================
// MODEL ASSIGNMENTS
// ============================================================

export const MODEL_CONFIG: Record<AITask, string> = {
  // Vision → Gemini 2.0 Flash (cheapest good vision model)
  scan_statement: 'google/gemini-2.0-flash-001',
  scan_receipt: 'google/gemini-2.0-flash-001',
  product_scan: 'google/gemini-2.0-flash-001',
  receipt_scan_full: 'google/gemini-2.0-flash-001',

  // Simple text → GPT-4.1-nano (cheapest capable text model)
  categorize: 'openai/gpt-4.1-nano',
  clean_payee: 'openai/gpt-4.1-nano',
  achievement_congrats: 'openai/gpt-4.1-nano',
  quick_response: 'openai/gpt-4.1-nano',

  // Analysis → Grok 4.1 Fast (great reasoning at low cost)
  analyze_spending: 'x-ai/grok-4.1-fast',
  debt_strategy: 'x-ai/grok-4.1-fast',
  budget_suggestions: 'x-ai/grok-4.1-fast',
  score_coach: 'x-ai/grok-4.1-fast',
  find_savings: 'x-ai/grok-4.1-fast',

  // Insights
  page_insights: 'x-ai/grok-4.1-fast',

  // Payoff planning
  debt_payoff_plan: 'x-ai/grok-4.1-fast',

  // Budget tools
  auto_budget: 'x-ai/grok-4.1-fast',
  afford_check: 'x-ai/grok-4.1-fast',
};

// Fallback if primary model fails
export const FALLBACK_MODEL = 'openai/gpt-4o-mini';

export const FALLBACK_MODELS: Record<AITask, string> = {
  scan_statement: 'openai/gpt-4o-mini',     // Also has vision
  scan_receipt: 'openai/gpt-4o-mini',
  product_scan: 'openai/gpt-4o-mini',
  receipt_scan_full: 'openai/gpt-4o-mini',
  categorize: 'mistralai/mistral-7b-instruct',
  clean_payee: 'mistralai/mistral-7b-instruct',
  achievement_congrats: 'mistralai/mistral-7b-instruct',
  quick_response: 'openai/gpt-4o-mini',
  analyze_spending: 'openai/gpt-4o-mini',
  debt_strategy: 'openai/gpt-4o-mini',
  budget_suggestions: 'openai/gpt-4o-mini',
  score_coach: 'openai/gpt-4o-mini',
  find_savings: 'openai/gpt-4o-mini',
  page_insights: 'openai/gpt-4o-mini',
  debt_payoff_plan: 'openai/gpt-4o-mini',
  auto_budget: 'openai/gpt-4o-mini',
  afford_check: 'openai/gpt-4o-mini',
};

// ============================================================
// PARAMETERS PER TASK
// ============================================================

export const TEMPERATURE_CONFIG: Record<AITask, number> = {
  scan_statement: 0.0,     // Maximum accuracy — no creativity
  scan_receipt: 0.0,
  product_scan: 0.0,       // Accurate product identification
  receipt_scan_full: 0.0,  // Accurate receipt extraction
  categorize: 0.1,         // Very deterministic
  clean_payee: 0.0,        // Exact transformation
  achievement_congrats: 0.7, // Fun and varied
  quick_response: 0.3,
  analyze_spending: 0.3,   // Slight creativity for insights
  debt_strategy: 0.1,      // Mostly math-driven
  budget_suggestions: 0.2,
  score_coach: 0.4,        // Motivational but accurate
  find_savings: 0.2,
  page_insights: 0.3,
  debt_payoff_plan: 0.1,       // Mostly math-driven
  auto_budget: 0.2,            // Balanced allocation
  afford_check: 0.2,           // Analytical with reasoning
};

export const MAX_TOKENS_CONFIG: Record<AITask, number> = {
  scan_statement: 800,     // Structured JSON output
  scan_receipt: 200,       // Small JSON
  product_scan: 400,       // Product identification JSON
  receipt_scan_full: 1500, // Detailed receipt with line items
  categorize: 50,          // Just a category name
  clean_payee: 50,         // Just a cleaned name
  achievement_congrats: 150, // Short celebration
  quick_response: 200,
  analyze_spending: 1500,  // Detailed analysis
  debt_strategy: 1500,     // Payoff plan
  budget_suggestions: 1000,
  score_coach: 800,        // Personalized tips
  find_savings: 1000,
  page_insights: 800,
  debt_payoff_plan: 2000,      // Detailed JSON payoff plan
  auto_budget: 1500,           // Budget allocations with reasoning
  afford_check: 1200,          // Affordability analysis
};

// ============================================================
// COST TRACKING (per million tokens, in USD)
// ============================================================

export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'google/gemini-2.0-flash-001': { input: 0.10, output: 0.40 },
  'openai/gpt-4.1-nano': { input: 0.10, output: 0.40 },
  'x-ai/grok-4.1-fast': { input: 0.20, output: 0.50 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.60 },
  'mistralai/mistral-7b-instruct': { input: 0.20, output: 0.20 },
};

/**
 * Estimate cost for a single API call
 */
export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[model] || { input: 0.50, output: 1.00 }; // Conservative default
  return (inputTokens * costs.input / 1_000_000) + (outputTokens * costs.output / 1_000_000);
}

// ============================================================
// TASK METADATA (for UI display)
// ============================================================

export const TASK_LABELS: Record<AITask, string> = {
  scan_statement: 'Statement Scan',
  scan_receipt: 'Receipt Scan',
  product_scan: 'Product Scan',
  receipt_scan_full: 'Receipt Scanner',
  categorize: 'Auto-Categorize',
  clean_payee: 'Payee Cleanup',
  achievement_congrats: 'Achievement',
  quick_response: 'Quick Response',
  analyze_spending: 'Spending Analysis',
  debt_strategy: 'Debt Strategy',
  budget_suggestions: 'Budget Suggestions',
  score_coach: 'Score Coach',
  find_savings: 'Find Savings',
  page_insights: 'Page Insights',
  debt_payoff_plan: 'Debt Payoff Plan',
  auto_budget: 'Auto Budget',
  afford_check: 'Affordability Check',
};

export const TASK_TIER: Record<AITask, 'vision' | 'simple' | 'analysis'> = {
  scan_statement: 'vision',
  scan_receipt: 'vision',
  product_scan: 'vision',
  receipt_scan_full: 'vision',
  categorize: 'simple',
  clean_payee: 'simple',
  achievement_congrats: 'simple',
  quick_response: 'simple',
  analyze_spending: 'analysis',
  debt_strategy: 'analysis',
  budget_suggestions: 'analysis',
  score_coach: 'analysis',
  find_savings: 'analysis',
  page_insights: 'analysis',
  debt_payoff_plan: 'analysis',
  auto_budget: 'analysis',
  afford_check: 'analysis',
};
