-- Migration 005: Link debts to Plaid accounts
-- Auto-create/update credit card debts from Plaid sync

-- Plaid account ID for auto-sync matching
ALTER TABLE debts ADD COLUMN IF NOT EXISTS plaid_account_id TEXT;

-- Reference to the Plaid connection that created this debt
ALTER TABLE debts ADD COLUMN IF NOT EXISTS plaid_connection_id UUID REFERENCES plaid_connections(id) ON DELETE SET NULL;

-- Index for fast lookup during sync
CREATE INDEX IF NOT EXISTS idx_debts_plaid_account_id ON debts(plaid_account_id) WHERE plaid_account_id IS NOT NULL;
