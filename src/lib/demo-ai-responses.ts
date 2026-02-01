/**
 * Demo AI Responses
 * 
 * Pre-generated mock responses for AI features in demo mode.
 * Shows realistic output without hitting OpenRouter API.
 */

export const DEMO_AFFORD_CHECK_RESPONSES = {
  affordable: {
    verdict: 'yes' as const,
    confidence: 0.87,
    reasoning: "Based on your current budget allocations and spending patterns, you can comfortably afford this purchase. Your Shopping budget has $157 remaining this month, and you've been consistently under budget in Entertainment. This won't strain your finances.",
    impact: {
      monthly_cost: 89.00,
      budget_category: 'Shopping',
      current_budget: 300,
      current_spent: 54.01,
      remaining_after: 156.99,
    },
    adjusted_budget: null,
    alternatives: [],
    score_impact: 'Minor purchase - no significant impact on your Financial Health Score.',
  },
  
  stretch: {
    verdict: 'stretch' as const,
    confidence: 0.72,
    reasoning: "This is a stretch, but doable if you're willing to adjust other spending. Your Shopping budget is already 142% spent ($425.99 of $300), so this would push you further over. However, you have room in Entertainment ($61 unspent) that could be reallocated temporarily.",
    impact: {
      monthly_cost: 199.99,
      budget_category: 'Shopping',
      current_budget: 300,
      current_spent: 425.99,
      remaining_after: -325.98,
    },
    adjusted_budget: [
      {
        category: 'Shopping',
        current: 300,
        adjusted: 500,
        change: 200,
        duration_months: 1,
        reason: 'Temporary increase to accommodate purchase',
      },
      {
        category: 'Entertainment',
        current: 150,
        adjusted: 100,
        change: -50,
        duration_months: 1,
        reason: 'Reduce to fund Shopping increase',
      },
      {
        category: 'Food & Dining',
        current: 500,
        adjusted: 450,
        change: -50,
        duration_months: 1,
        reason: 'Eat out less this month',
      },
    ],
    alternatives: [
      'Wait until next month when your Shopping budget resets',
      'Look for a used or refurbished version (save ~30%)',
      'Split the purchase across 2 months using a 0% APR credit card',
    ],
    score_impact: 'Temporary overspending may slightly reduce your Budgeting Discipline score (-5 to -10 points).',
  },

  notAffordable: {
    verdict: 'no' as const,
    confidence: 0.91,
    reasoning: "This purchase would significantly strain your budget. You've already overspent in Shopping by 42% ($425.99 of $300), and adding this would push you 208% over budget. Without major spending cuts elsewhere, this would force you into debt or deplete emergency savings.",
    impact: {
      monthly_cost: 599.99,
      budget_category: 'Shopping',
      current_budget: 300,
      current_spent: 425.99,
      remaining_after: -725.98,
    },
    adjusted_budget: [
      {
        category: 'Shopping',
        current: 300,
        adjusted: 700,
        change: 400,
        duration_months: 2,
        reason: 'Major increase needed (not recommended)',
      },
      {
        category: 'Food & Dining',
        current: 500,
        adjusted: 300,
        change: -200,
        duration_months: 2,
        reason: 'Severe cuts required - difficult to sustain',
      },
      {
        category: 'Entertainment',
        current: 150,
        adjusted: 50,
        change: -100,
        duration_months: 2,
        reason: 'Near-elimination of discretionary spending',
      },
      {
        category: 'Transportation',
        current: 200,
        adjusted: 100,
        change: -100,
        duration_months: 2,
        reason: 'Reduce driving, carpool, or use transit',
      },
    ],
    alternatives: [
      'Save for 3-4 months and buy with cash (avoids debt)',
      'Consider a more budget-friendly alternative (~$200-300 range)',
      'Wait for a sale or Black Friday/Cyber Monday deals (potential 30-50% off)',
      'Sell unused items to raise funds first',
    ],
    score_impact: 'This level of overspending could reduce your Financial Health Score by 40-60 points if it leads to debt or depleted savings.',
  },
};

export const DEMO_AUTO_BUDGET_RESPONSE = {
  analysis: {
    spending_patterns: [
      'You consistently overspend on Shopping (42% over budget)',
      'Food & Dining is well-managed (68% of budget used)',
      'Transportation spending is stable and predictable',
      'You have unallocated income ($1,100/month) that should be budgeted',
    ],
    recommendations: [
      'Increase Shopping budget to $450 to match actual spending patterns',
      'Allocate $500/month to Savings Goals (currently $0)',
      'Add $250/month for debt paydown beyond minimums',
      'Set aside $200/month for Utilities (currently unbudgeted)',
    ],
  },
  allocations: [
    { category: 'Food & Dining', amount: 500, change: 0, reason: 'Current budget is working well' },
    { category: 'Transportation', amount: 200, change: 0, reason: 'Spending is consistent' },
    { category: 'Shopping', amount: 450, change: 150, reason: 'Increase to match actual spending' },
    { category: 'Entertainment', amount: 150, change: 0, reason: 'Appropriate for discretionary spending' },
    { category: 'Utilities', amount: 200, change: 200, reason: 'NEW: Budget for regular utility bills' },
    { category: 'Health', amount: 75, change: 75, reason: 'NEW: Cover medical copays & prescriptions' },
    { category: 'Subscriptions', amount: 65, change: 65, reason: 'NEW: Budget for current subscriptions' },
    { category: 'Savings', amount: 500, change: 500, reason: 'NEW: Build emergency fund (3-6 months expenses)' },
    { category: 'Extra Debt Payment', amount: 250, change: 250, reason: 'NEW: Pay down high-interest credit card faster' },
  ],
  summary: {
    total_budgeted_before: 1400,
    total_budgeted_after: 2390,
    monthly_income: 4500,
    unallocated_after: 2110,
    confidence: 0.89,
  },
};

export const DEMO_RECEIPT_SCAN_RESPONSE = {
  merchant: "Whole Foods Market",
  date: new Date().toISOString().split('T')[0],
  total: 127.43,
  currency: "USD",
  items: [
    { name: "Organic Bananas", quantity: 6, unit_price: 0.79, total: 4.74, category: "Food & Dining" },
    { name: "Almond Milk", quantity: 2, unit_price: 4.99, total: 9.98, category: "Food & Dining" },
    { name: "Free-Range Eggs", quantity: 1, unit_price: 6.49, total: 6.49, category: "Food & Dining" },
    { name: "Grass-Fed Ground Beef", quantity: 2, unit_price: 12.99, total: 25.98, category: "Food & Dining" },
    { name: "Mixed Greens", quantity: 3, unit_price: 4.99, total: 14.97, category: "Food & Dining" },
    { name: "Kombucha (6-pack)", quantity: 1, unit_price: 9.99, total: 9.99, category: "Food & Dining" },
    { name: "Dark Chocolate Bar", quantity: 4, unit_price: 3.99, total: 15.96, category: "Food & Dining" },
    { name: "Quinoa (2lb)", quantity: 1, unit_price: 8.99, total: 8.99, category: "Food & Dining" },
    { name: "Olive Oil", quantity: 1, unit_price: 12.99, total: 12.99, category: "Food & Dining" },
    { name: "Fresh Salmon", quantity: 1, unit_price: 17.34, total: 17.34, category: "Food & Dining" },
  ],
  suggested_category: "Food & Dining",
  confidence: 0.94,
  payment_method: "Credit Card",
};

export const DEMO_PRODUCT_SCAN_RESPONSE = {
  success: {
    product_name: "AirPods Pro (2nd Gen)",
    estimated_price: 249,
    confidence: 0.92,
    category: "Electronics",
    price_source: "recognized_product" as const,
    notes: "Recognized Apple AirPods Pro from packaging. Price based on current retail value.",
  },
  
  priceTag: {
    product_name: "Nike Air Max Sneakers",
    estimated_price: 139.99,
    confidence: 0.88,
    category: "Clothing",
    price_source: "visible_price" as const,
    notes: "Price tag clearly visible in image: $139.99",
  },
};

export const DEMO_SPENDING_INSIGHTS = [
  {
    type: 'warning' as const,
    category: 'Shopping',
    message: 'Shopping spending up 34% vs last month',
    detail: 'You spent $425.99 this month vs $318.50 last month. Major purchases: Amazon ($142), Target ($89), Best Buy ($78).',
    action: 'Review transactions',
  },
  {
    type: 'tip' as const,
    category: 'Food & Dining',
    message: 'On track to hit Food budget in 6 days',
    detail: 'You\'ve spent $342.50 of $500 budgeted (68%). At your current pace ($15.57/day), you\'ll hit your limit around the 26th.',
    action: 'Adjust spending pace',
  },
  {
    type: 'opportunity' as const,
    category: 'Subscriptions',
    message: 'Found 3 subscriptions you might want to review',
    detail: 'Netflix ($15.99), Spotify ($10.99), Adobe Creative Cloud ($54.99) - Total: $81.97/month. You could save by downgrading or canceling unused services.',
    action: 'Review subscriptions',
  },
  {
    type: 'success' as const,
    category: 'Transportation',
    message: 'Transportation spending down 18%',
    detail: 'Great work! You spent $156 this month vs $190 last month. Keep up the carpooling and public transit usage.',
    action: null,
  },
];

export const DEMO_AI_COACH_RESPONSE = {
  overall_assessment: "You're making solid progress! Your Financial Health Score of 723 puts you in the 'Building Momentum' tier. Your biggest strength is consistent debt paydown, but you're leaving money on the table by not maximizing savings.",
  
  pillar_breakdown: [
    {
      pillar: 'Budgeting Discipline',
      score: 278,
      max: 400,
      grade: 'B-',
      summary: 'Good but inconsistent. 4 of 5 budgets are on track, but Shopping overspending (42%) is dragging you down.',
      recommendations: [
        'Increase Shopping budget to $450 to match reality',
        'Use the "Can I Afford This?" feature before impulse purchases',
        'Set up alerts when you hit 75% of any budget',
      ],
    },
    {
      pillar: 'Debt Management',
      score: 247,
      max: 300,
      grade: 'A-',
      summary: 'Excellent! You\'re paying $285/month on a $2,847 credit card (10% of balance). Plus $200 extra toward principal each month.',
      recommendations: [
        'Continue avalanche strategy (highest APR first)',
        'You\'re on track to be credit-card-debt-free in 11 months',
        'Once CC is paid off, redirect $285/month to emergency savings',
      ],
    },
    {
      pillar: 'Wealth Building',
      score: 198,
      max: 300,
      grade: 'C+',
      summary: 'This is your opportunity area. You have $1,100/month unallocated but only $200 going to savings. Your 401k contributions are good (8%), but no IRA or investments yet.',
      recommendations: [
        'Boost emergency savings from $200 to $500/month until you hit 6 months of expenses',
        'Open a Roth IRA and contribute $500/month (max is $583/month)',
        'After emergency fund is solid, start investing in index funds',
      ],
    },
  ],

  action_plan: [
    {
      priority: 1,
      title: 'Fix Shopping Budget Mismatch',
      description: 'Increase Shopping budget from $300 to $450 to align with actual spending. This reduces stress and score penalties.',
      impact: '+12 points to Budgeting Discipline',
      effort: 'Low',
      timeframe: 'This month',
    },
    {
      priority: 2,
      title: 'Boost Emergency Savings',
      description: 'Increase monthly savings contribution from $200 to $500. Build emergency fund to 6 months of expenses ($19,200).',
      impact: '+35 points to Wealth Building',
      effort: 'Medium',
      timeframe: '3-6 months',
    },
    {
      priority: 3,
      title: 'Open Roth IRA',
      description: 'Start contributing $500/month to a Roth IRA (max $7,000/year or $583/month). Great for long-term wealth building.',
      impact: '+45 points to Wealth Building',
      effort: 'Medium',
      timeframe: 'Next month',
    },
  ],

  next_milestone: {
    score: 800,
    level: 'Financial Fortress',
    what_it_takes: 'To reach 800+ (Financial Fortress), focus on maxing out retirement contributions, eliminating all high-interest debt, and building 9+ months of liquid savings.',
    eta: '~14 months if you follow the action plan',
  },
};

// Helper to get random demo response variant
export function getDemoAffordResponse(scenario: 'affordable' | 'stretch' | 'notAffordable' = 'affordable') {
  return DEMO_AFFORD_CHECK_RESPONSES[scenario];
}
