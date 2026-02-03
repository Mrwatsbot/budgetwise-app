-- ============================================================
-- AI Chat Support - Phase 1
-- Tables: knowledge_base_articles, conversations, messages,
--         token_usage_daily, rate_limit_state
-- ============================================================

-- Knowledge Base Articles (no embedding/vector column in Phase 1)
CREATE TABLE IF NOT EXISTS knowledge_base_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('app_usage', 'finance_education', 'troubleshooting', 'account')),
  question TEXT NOT NULL,
  alternate_questions TEXT[] DEFAULT '{}',
  answer TEXT NOT NULL,
  short_answer TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  priority INT DEFAULT 0,
  related_articles TEXT[] DEFAULT '{}',
  view_count INT DEFAULT 0,
  helpful_count INT DEFAULT 0,
  not_helpful_count INT DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base_articles (category) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_kb_slug ON knowledge_base_articles (slug);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  context_bridge TEXT,
  summary_cache TEXT,
  summary_covers_up_to INT DEFAULT 0,
  turn_count INT DEFAULT 0,
  total_input_tokens INT DEFAULT 0,
  total_output_tokens INT DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_active ON conversations (user_id) WHERE status = 'active';

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  intent TEXT,
  intent_confidence REAL,
  source TEXT NOT NULL CHECK (source IN ('ai_generated', 'kb_match', 'canned', 'system')),
  kb_article_id UUID REFERENCES knowledge_base_articles(id),
  model_used TEXT,
  input_tokens INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  latency_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_user_date ON messages (user_id, created_at DESC);

-- Token Usage Tracking (daily aggregated)
CREATE TABLE IF NOT EXISTS token_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  input_tokens INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  message_count INT DEFAULT 0,
  ai_message_count INT DEFAULT 0,
  kb_match_count INT DEFAULT 0,
  canned_response_count INT DEFAULT 0,
  cost_estimate_cents REAL DEFAULT 0,
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_token_usage_user_date ON token_usage_daily (user_id, date DESC);

-- Rate Limit State
CREATE TABLE IF NOT EXISTS rate_limit_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  minute_count INT DEFAULT 0,
  minute_window_start TIMESTAMPTZ DEFAULT NOW(),
  hour_count INT DEFAULT 0,
  hour_window_start TIMESTAMPTZ DEFAULT NOW(),
  cooldown_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row-Level Security
-- ============================================================

-- KB articles: public read
ALTER TABLE knowledge_base_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "KB articles are public read"
  ON knowledge_base_articles FOR SELECT
  USING (is_published = true);

-- Conversations: users own
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- Messages: users own
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own messages"
  ON messages FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Token usage: users own
ALTER TABLE token_usage_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own token usage"
  ON token_usage_daily FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own token usage"
  ON token_usage_daily FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own token usage"
  ON token_usage_daily FOR UPDATE
  USING (auth.uid() = user_id);

-- Rate limit state: users own
ALTER TABLE rate_limit_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own rate limit"
  ON rate_limit_state FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own rate limit"
  ON rate_limit_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own rate limit"
  ON rate_limit_state FOR UPDATE
  USING (auth.uid() = user_id);
