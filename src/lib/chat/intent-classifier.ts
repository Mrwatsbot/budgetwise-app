/**
 * Intent Classification — Phase 1 (Stages A+B only, no AI classification)
 * Stage A: Regex/pattern matching
 * Stage B: Keyword + heuristic scoring
 */

export type MessageIntent =
  | 'faq_match'
  | 'finance_personal'
  | 'finance_general'
  | 'greeting'
  | 'thanks'
  | 'off_topic'
  | 'abuse';

export interface ClassificationResult {
  intent: MessageIntent;
  confidence: number;
}

// ── Stage A: Pattern matching ──

function patternClassify(message: string): ClassificationResult | null {
  const normalized = message.toLowerCase().trim();
  const wordCount = normalized.split(/\s+/).length;

  // Greetings
  if (/^(hi|hey|hello|yo|sup|howdy|good\s+(morning|afternoon|evening))\b/i.test(normalized) && wordCount <= 5) {
    return { intent: 'greeting', confidence: 0.95 };
  }

  // Thanks
  if (/^(thanks|thank\s+you|thx|ty|appreciate\s+it|got\s+it|ok\s+thanks|cool\s+thanks)\b/i.test(normalized) && wordCount <= 6) {
    return { intent: 'thanks', confidence: 0.95 };
  }

  // Simple acknowledgments
  if (/^(ok|okay|got it|cool|nice|great|awesome|perfect|understood)\s*[!.]*$/i.test(normalized) && wordCount <= 3) {
    return { intent: 'thanks', confidence: 0.90 };
  }

  // Abuse: prompt injection patterns
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/i,
    /you\s+are\s+now\s+(a|an|the)\s/i,
    /pretend\s+(you'?re?|to\s+be|you\s+are)/i,
    /system\s*prompt/i,
    /jailbreak/i,
    /DAN\s*mode/i,
    /do\s+anything\s+now/i,
    /bypass\s+(your|the|all)\s+(rules?|restrictions?|filters?|safety)/i,
    /reveal\s+(your|the)\s+(system|initial|original)\s+(prompt|instructions?)/i,
    /\bsudo\b/i,
    /roleplay\s+as/i,
    /\[SYSTEM\]/i,
    /\[INST\]/i,
    /<<SYS>>/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(normalized)) {
      return { intent: 'abuse', confidence: 0.95 };
    }
  }

  // Off-topic: clearly non-financial
  const offTopicPatterns = [
    /write\s+(me\s+)?(a|an)\s+(poem|story|essay|song|code|script|email)/i,
    /what\s+is\s+the\s+(meaning|purpose)\s+of\s+life/i,
    /tell\s+me\s+(a\s+)?joke/i,
    /who\s+(is|was)\s+the\s+(president|king|queen)/i,
    /recipe\s+for/i,
    /how\s+to\s+(cook|bake|make\s+food)/i,
    /what\s+(is|are)\s+(the\s+)?(weather|news|sports|score)\s/i,
    /translate\s+.+\s+(to|into)\s/i,
    /play\s+(a\s+)?game/i,
    /help\s+me\s+with\s+(my\s+)?(homework|assignment|essay|code)/i,
  ];

  for (const pattern of offTopicPatterns) {
    if (pattern.test(normalized)) {
      return { intent: 'off_topic', confidence: 0.92 };
    }
  }

  return null;
}

// ── Stage B: Heuristic classification ──

const FINANCE_TERMS = new Set([
  'money', 'budget', 'spend', 'spending', 'spent', 'save', 'saving', 'savings',
  'income', 'salary', 'wage', 'paycheck', 'debt', 'loan', 'credit', 'mortgage',
  'rent', 'bill', 'bills', 'expense', 'expenses', 'invest', 'investing',
  'investment', 'retirement', '401k', 'ira', 'roth', 'tax', 'taxes',
  'interest', 'apr', 'apy', 'compound', 'net worth', 'assets', 'liabilities',
  'emergency fund', 'category', 'categories', 'transaction',
  'transactions', 'account', 'bank', 'checking', 'score',
  'health score', 'financial', 'finance', 'afford', 'cost', 'price',
  'payment', 'payments', 'subscription', 'insurance', 'grocery', 'groceries',
  'dining', 'restaurant', 'entertainment', 'utilities',
  'car payment', 'student loan', 'credit card', 'minimum payment',
  'snowball', 'avalanche', 'zero-based', 'envelope',
  'thallo', 'dashboard', 'report', 'chart', 'graph',
  'rollover', 'auto budget', 'payoff', 'goal', 'goals',
]);

function heuristicClassify(message: string): ClassificationResult | null {
  const normalized = message.toLowerCase().trim();
  const words = normalized.split(/\s+/);

  // Score financial relevance
  let financeScore = 0;
  for (const term of FINANCE_TERMS) {
    if (normalized.includes(term)) financeScore++;
  }

  const personalPronouns = /\b(my|i|i'm|i've|mine|me|we|our|us)\b/gi;
  const personalMatches = normalized.match(personalPronouns);
  const hasPersonal = !!personalMatches && personalMatches.length > 0;

  if (financeScore >= 2 && hasPersonal) {
    return { intent: 'finance_personal', confidence: 0.88 };
  }

  if (financeScore >= 2) {
    return { intent: 'finance_general', confidence: 0.85 };
  }

  if (financeScore === 1 && hasPersonal) {
    return { intent: 'finance_personal', confidence: 0.75 };
  }

  if (financeScore === 1) {
    return { intent: 'finance_general', confidence: 0.70 };
  }

  // No finance signals + longish message = likely off-topic
  if (financeScore === 0 && !hasPersonal && words.length > 8) {
    return { intent: 'off_topic', confidence: 0.70 };
  }

  // Ambiguous — default to finance_general to be safe (let the AI handle it)
  return { intent: 'finance_general', confidence: 0.50 };
}

// ── Main classifier ──

export function classifyMessage(message: string): ClassificationResult {
  // Stage A: Pattern matching
  const patternResult = patternClassify(message);
  if (patternResult && patternResult.confidence >= 0.90) {
    return patternResult;
  }

  // Stage B: Heuristic
  const heuristicResult = heuristicClassify(message);
  if (heuristicResult) {
    return heuristicResult;
  }

  // Fallback
  return { intent: 'finance_general', confidence: 0.50 };
}

// ── Canned responses ──

const CANNED_RESPONSES: Record<string, string[]> = {
  greeting: [
    "Hey! 👋 I'm Thallo's finance assistant. Ask me anything about budgeting, your spending, or how to use the app!",
    "Hi there! I'm here to help with your budgeting questions. What's on your mind?",
    "Hello! Ready to help with your finances. What would you like to know?",
  ],
  thanks: [
    "You're welcome! Let me know if you have any other questions. 😊",
    "Happy to help! Anything else about your finances?",
    "No problem! I'm here if you need anything else.",
  ],
  off_topic: [
    "I'm Thallo's budgeting assistant — I'm best at helping with money questions! 💰 Try asking about your spending, budgets, or savings goals.",
    "That's a bit outside my wheelhouse! I specialize in personal finance and budgeting. Want to ask about your money instead?",
  ],
  abuse: [
    "I'm here to help with your finances. Let me know if you have any budgeting questions!",
  ],
  budget_exceeded: [
    "You've reached your AI assistant limit for this period. You can still browse our help articles! Upgrade for higher limits.",
  ],
};

export function getCannedResponse(type: string): string {
  const options = CANNED_RESPONSES[type] || CANNED_RESPONSES.off_topic;
  return options[Math.floor(Math.random() * options.length)];
}
