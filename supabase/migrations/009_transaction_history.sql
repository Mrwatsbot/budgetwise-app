-- Transaction History for Undo Feature
-- Tracks the last edit for each transaction to enable undo

CREATE TABLE IF NOT EXISTS transaction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  previous_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by transaction
CREATE INDEX idx_transaction_history_transaction_id_created_at 
  ON transaction_history(transaction_id, created_at DESC);

-- Index for user-specific queries
CREATE INDEX idx_transaction_history_user_id 
  ON transaction_history(user_id);

-- RLS: Users can only read their own history
ALTER TABLE transaction_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transaction history"
  ON transaction_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transaction history"
  ON transaction_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Note: Cleanup of old history entries (keeping last 5 per transaction) 
-- will be handled in application logic to avoid trigger complexity
