/**
 * Knowledge Base Search — Phase 1 (keyword-based matching)
 * No embeddings yet; uses keyword overlap, Jaccard similarity, and regex patterns.
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface KBArticle {
  id: string;
  slug: string;
  category: string;
  question: string;
  alternate_questions: string[];
  answer: string;
  short_answer: string;
  keywords: string[];
  related_articles: string[];
}

export interface KBSearchResult {
  type: 'exact' | 'good' | 'partial' | 'no_match';
  article?: KBArticle;
  suggestions?: KBArticle[];
  confidence: number;
}

// ── Regex pattern matching for ultra-common questions ──

const KEYWORD_PATTERNS: [RegExp, string][] = [
  [/how\s+(do\s+i\s+|to\s+)?(add|create|set\s*up|make)\s+(a\s+)?budget/i, 'how-to-create-budget'],
  [/what\s+is\s+(the\s+|my\s+)?health\s*score/i, 'what-is-health-score'],
  [/how\s+is\s+(the\s+|my\s+)?health\s*score\s+(calculated|computed|determined)/i, 'what-is-health-score'],
  [/how\s+(do\s+i\s+|to\s+)?(add|log|enter|record|track)\s+(a\s+)?(transaction|expense|spending)/i, 'how-to-add-transaction'],
  [/how\s+(do\s+i\s+|to\s+)?(connect|link|add)\s+(a\s+)?(bank|account)/i, 'how-to-link-bank'],
  [/how\s+(do\s+i\s+|to\s+)?(cancel|end|stop)\s+(my\s+)?(subscription|plan|membership)/i, 'subscription-tiers'],
  [/how\s+(do\s+i\s+|to\s+)?(delete|remove)\s+(my\s+)?account/i, 'delete-account'],
  [/(what|which)\s+(plan|tier|subscription)/i, 'subscription-tiers'],
  [/how\s+much\s+(does|do)\s+(it|plans?)\s+cost/i, 'subscription-tiers'],
  [/pric(e|ing)/i, 'subscription-tiers'],
  [/how\s+(do\s+i\s+|to\s+)?(set|add|create)\s+(a\s+)?(savings?\s+)?goal/i, 'how-to-set-savings-goal'],
  [/how\s+(do\s+i\s+|to\s+)?(track|manage|add)\s+(my\s+)?debt/i, 'how-to-track-debt'],
  [/how\s+(do\s+i\s+|to\s+)?(export|download)\s+(my\s+)?data/i, 'how-to-export-data'],
  [/how\s+(do\s+i\s+|to\s+)?(split|divide)\s+(a\s+)?transaction/i, 'how-to-split-transaction'],
  [/how\s+(do\s+i\s+|to\s+)?(change|reset|update)\s+(my\s+)?password/i, 'change-password'],
  [/forgot\s+(my\s+)?password/i, 'change-password'],
  [/(bank|plaid).*(not\s+working|broken|error|failed|issue)/i, 'bank-connection-issues'],
  [/(transaction|sync).*(not\s+working|missing|not\s+syncing)/i, 'transactions-not-syncing'],
  [/(app|page|thallo).*(slow|laggy|not\s+loading)/i, 'app-loading-slow'],
  [/(wrong|incorrect|fix)\s+(categor|auto.?categor)/i, 'categories-wrong'],
  [/what\s+is\s+(the\s+)?50.?30.?20/i, 'how-50-30-20-works'],
  [/snowball\s*(vs|or|versus)\s*avalanche/i, 'snowball-vs-avalanche'],
  [/(what\s+is\s+)?(my\s+)?net\s*worth/i, 'what-is-net-worth'],
  [/emergency\s+fund/i, 'emergency-fund-guide'],
  [/auto\s*budget/i, 'how-to-use-auto-budget'],
  [/rollover/i, 'how-rollover-works'],
  [/(contact|email|reach)\s+(support|help|human|someone)/i, 'contact-support'],
  [/(is\s+)?(my\s+)?(data|info).*(safe|secure|private)/i, 'data-security'],
  [/(categor).*(set\s*up|custom|add|edit)/i, 'how-to-set-up-categories'],
  [/(report|chart|graph|analytics|spending\s+breakdown)/i, 'how-to-view-reports'],
];

function patternMatch(message: string): string | null {
  const normalized = message.toLowerCase().trim();
  for (const [pattern, slug] of KEYWORD_PATTERNS) {
    if (pattern.test(normalized)) {
      return slug;
    }
  }
  return null;
}

// ── Jaccard similarity between two sets of words ──

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1)
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ── Score an article against user message ──

function scoreArticle(message: string, article: KBArticle): number {
  const msgTokens = tokenize(message);
  const msgLower = message.toLowerCase();
  let score = 0;

  // 1. Keyword overlap (up to 0.4)
  let keywordHits = 0;
  for (const kw of article.keywords) {
    if (msgLower.includes(kw.toLowerCase())) {
      keywordHits++;
    }
  }
  const keywordScore = article.keywords.length > 0
    ? Math.min(keywordHits / Math.min(article.keywords.length, 3), 1) * 0.4
    : 0;
  score += keywordScore;

  // 2. Question similarity via Jaccard (up to 0.35)
  const questionTokens = tokenize(article.question);
  const questionSim = jaccardSimilarity(msgTokens, questionTokens);
  score += questionSim * 0.35;

  // 3. Alternate questions — take best match (up to 0.25)
  let bestAltSim = 0;
  for (const alt of article.alternate_questions) {
    const altTokens = tokenize(alt);
    const sim = jaccardSimilarity(msgTokens, altTokens);
    if (sim > bestAltSim) bestAltSim = sim;
  }
  score += bestAltSim * 0.25;

  return score;
}

// ── Thresholds ──

const EXACT_THRESHOLD = 0.55;
const GOOD_THRESHOLD = 0.40;
const PARTIAL_THRESHOLD = 0.28;

// ── Main search function ──

export async function searchKB(
  supabase: SupabaseClient,
  userMessage: string
): Promise<KBSearchResult> {
  // Step 1: Regex pattern match (instant)
  const patternSlug = patternMatch(userMessage);

  if (patternSlug) {
    const { data: article } = await supabase
      .from('knowledge_base_articles')
      .select('id, slug, category, question, alternate_questions, answer, short_answer, keywords, related_articles')
      .eq('slug', patternSlug)
      .eq('is_published', true)
      .single();

    if (article) {
      return {
        type: 'exact',
        article: article as KBArticle,
        confidence: 0.97,
      };
    }
  }

  // Step 2: Fetch all published articles and score them
  const { data: articles } = await supabase
    .from('knowledge_base_articles')
    .select('id, slug, category, question, alternate_questions, answer, short_answer, keywords, related_articles')
    .eq('is_published', true);

  if (!articles || articles.length === 0) {
    return { type: 'no_match', confidence: 0 };
  }

  // Score all articles
  const scored = (articles as KBArticle[])
    .map(article => ({
      article,
      score: scoreArticle(userMessage, article),
    }))
    .sort((a, b) => b.score - a.score);

  const top = scored[0];

  if (top.score >= EXACT_THRESHOLD) {
    return {
      type: 'exact',
      article: top.article,
      confidence: Math.min(top.score * 1.5, 0.98),
    };
  }

  if (top.score >= GOOD_THRESHOLD) {
    return {
      type: 'good',
      article: top.article,
      suggestions: scored.slice(1, 3).map(s => s.article),
      confidence: top.score * 1.2,
    };
  }

  if (top.score >= PARTIAL_THRESHOLD) {
    return {
      type: 'partial',
      suggestions: scored.slice(0, 3).map(s => s.article),
      confidence: top.score,
    };
  }

  return { type: 'no_match', confidence: 0 };
}

/**
 * Format a KB article response to feel conversational.
 */
export function formatKBAnswer(article: KBArticle): string {
  const openers = [
    'Here\'s how that works:',
    'Great question!',
    'Sure thing —',
    '',
  ];
  const opener = openers[Math.floor(Math.random() * openers.length)];
  const answer = article.short_answer;
  return opener ? `${opener} ${answer}` : answer;
}
