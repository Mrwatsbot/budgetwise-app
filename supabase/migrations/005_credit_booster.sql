-- Credit Booster Migration
-- Run this in Supabase SQL Editor
-- Date: 2026-02-06

-- ============================================
-- CREDIT SCORES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS credit_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  equifax INT CHECK (equifax IS NULL OR (equifax >= 300 AND equifax <= 850)),
  experian INT CHECK (experian IS NULL OR (experian >= 300 AND experian <= 850)),
  transunion INT CHECK (transunion IS NULL OR (transunion >= 300 AND transunion <= 850)),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'import', 'api')),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_scores_user ON credit_scores(user_id);
CREATE INDEX idx_credit_scores_recorded ON credit_scores(recorded_at DESC);

-- RLS
ALTER TABLE credit_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own scores" ON credit_scores
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- NEGATIVE ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS negative_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Item details
  item_type TEXT NOT NULL CHECK (item_type IN (
    'collection', 'late_payment', 'charge_off', 'repossession',
    'bankruptcy', 'foreclosure', 'tax_lien', 'judgment', 'inquiry', 'other'
  )),
  creditor_name TEXT NOT NULL,
  original_creditor TEXT,
  account_number TEXT,
  amount DECIMAL(12,2),
  date_opened DATE,
  date_reported DATE,
  
  -- Bureau presence
  on_equifax BOOLEAN DEFAULT false,
  on_experian BOOLEAN DEFAULT false,
  on_transunion BOOLEAN DEFAULT false,
  
  -- Status tracking
  status TEXT DEFAULT 'identified' CHECK (status IN (
    'identified', 'disputing', 'responded', 'deleted', 'verified', 'paid', 'settled'
  )),
  
  -- Impact estimate
  estimated_impact TEXT CHECK (estimated_impact IN ('high', 'medium', 'low')),
  estimated_points INT,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_negative_items_user ON negative_items(user_id);
CREATE INDEX idx_negative_items_status ON negative_items(status);
CREATE INDEX idx_negative_items_type ON negative_items(item_type);

-- RLS
ALTER TABLE negative_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own negatives" ON negative_items
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- DISPUTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  negative_item_id UUID REFERENCES negative_items(id) ON DELETE CASCADE,
  
  -- Dispute details
  letter_type TEXT NOT NULL CHECK (letter_type IN (
    '609_validation', 'goodwill', 'pay_for_delete', 'general_dispute',
    'debt_validation', 'cease_desist', 'fraud_alert'
  )),
  target TEXT NOT NULL, -- bureau name or creditor
  target_type TEXT DEFAULT 'bureau' CHECK (target_type IN ('bureau', 'creditor', 'collection_agency')),
  target_address TEXT,
  
  -- Letter content
  letter_content TEXT NOT NULL,
  letter_generated_by TEXT DEFAULT 'ai' CHECK (letter_generated_by IN ('ai', 'template', 'manual')),
  
  -- Tracking
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'responded', 'won', 'lost', 'expired')),
  sent_date DATE,
  sent_method TEXT CHECK (sent_method IN ('certified_mail', 'regular_mail', 'online', 'fax')),
  tracking_number TEXT,
  
  -- Response
  deadline_date DATE,
  response_date DATE,
  response_type TEXT CHECK (response_type IN (
    'pending', 'deleted', 'verified', 'updated', 'no_response', 'need_more_info'
  )),
  response_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_disputes_user ON disputes(user_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_deadline ON disputes(deadline_date);
CREATE INDEX idx_disputes_negative ON disputes(negative_item_id);

-- RLS
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own disputes" ON disputes
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- LETTER TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS letter_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_system BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS - read only for all users
ALTER TABLE letter_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read templates" ON letter_templates
  FOR SELECT USING (true);

-- ============================================
-- SEED LETTER TEMPLATES
-- ============================================
INSERT INTO letter_templates (letter_type, name, description, template_content, variables) VALUES
('609_validation', '609 Validation Request', 'Request original documentation under Section 609', 
'{{date}}

{{creditor_name}}
{{creditor_address}}

Re: Account Number {{account_number}}

To Whom It May Concern:

I am writing to dispute the above-referenced account that appears on my credit report. Under Section 609 of the Fair Credit Reporting Act, I am requesting that you provide me with the following documentation:

1. A copy of the original signed contract or application bearing my signature
2. A complete payment history showing all transactions on this account  
3. Proof that this debt belongs to me and not another individual
4. Your company''s license to report credit information in my state

Please be advised that under the FCRA, you have 30 days to respond to this request. If you cannot provide the requested documentation, I demand that you delete this account from my credit report immediately.

Sincerely,

{{full_name}}
{{address}}
SSN: XXX-XX-{{ssn_last4}}',
'["date", "creditor_name", "creditor_address", "account_number", "full_name", "address", "ssn_last4"]'::jsonb),

('goodwill', 'Goodwill Adjustment Request', 'Request removal of late payment as courtesy',
'{{date}}

{{creditor_name}}
{{creditor_address}}

Re: Account Number {{account_number}}

Dear Sir or Madam:

I am writing regarding a late payment that was reported on my account in {{late_date}}. I have been a loyal customer for {{years_customer}} years and have otherwise maintained an excellent payment history with your company.

Unfortunately, during {{late_date}}, I experienced {{hardship_reason}}. This was an isolated incident and does not reflect my usual financial responsibility.

I am requesting, as a gesture of goodwill, that you remove this late payment notation from my credit report. I value my relationship with your company and am committed to maintaining timely payments going forward.

I would greatly appreciate your consideration of this request. Thank you for your time and understanding.

Sincerely,

{{full_name}}
{{address}}
Phone: {{phone}}',
'["date", "creditor_name", "creditor_address", "account_number", "late_date", "years_customer", "hardship_reason", "full_name", "address", "phone"]'::jsonb),

('pay_for_delete', 'Pay-for-Delete Offer', 'Offer payment in exchange for deletion',
'{{date}}

{{creditor_name}}
{{creditor_address}}

Re: Account Number {{account_number}}
Original Creditor: {{original_creditor}}
Amount: ${{amount}}

To Whom It May Concern:

I am writing to make an offer to resolve the above-referenced account. I am prepared to pay ${{offer_amount}} as settlement in full for this debt, provided you agree to the following terms:

1. Upon receipt of payment, you will request deletion of this account from all three credit bureaus (Equifax, Experian, and TransUnion) within 10 business days.
2. You will provide written confirmation of this agreement before payment is made.
3. You will not sell or transfer this debt to any other entity.

Please respond within 14 days to confirm your acceptance of these terms. Payment will be made within 5 business days of receiving your written agreement.

This is not an acknowledgment of the validity of this debt but rather an offer to resolve a disputed matter.

Sincerely,

{{full_name}}
{{address}}',
'["date", "creditor_name", "creditor_address", "account_number", "original_creditor", "amount", "offer_amount", "full_name", "address"]'::jsonb),

('debt_validation', 'Debt Validation Request', 'Request validation of debt from collector',
'{{date}}

{{creditor_name}}
{{creditor_address}}

Re: Account Number {{account_number}}

DEBT VALIDATION REQUEST - DO NOT IGNORE

To Whom It May Concern:

I am writing in response to your attempt to collect the above-referenced debt. Under the Fair Debt Collection Practices Act (FDCPA), Section 809(b), I am requesting validation of this alleged debt.

Please provide the following:

1. The name and address of the original creditor
2. The amount of the alleged debt and how it was calculated
3. Proof that you are licensed to collect debts in my state
4. A copy of the original signed agreement
5. A complete payment history
6. Proof that you own or have been assigned this debt

Until you provide this validation, you must cease all collection activity. Any continued collection attempts or negative credit reporting during this validation period will be considered a violation of the FDCPA.

This is not a refusal to pay, but a request for validation as allowed by law.

Sincerely,

{{full_name}}
{{address}}',
'["date", "creditor_name", "creditor_address", "account_number", "full_name", "address"]'::jsonb);

-- ============================================
-- UPDATE PROFILES TABLE
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credit_goal INT DEFAULT 700;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS repair_started_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS repair_target_date DATE;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to calculate average score
CREATE OR REPLACE FUNCTION get_average_score(eq INT, ex INT, tu INT)
RETURNS INT AS $$
BEGIN
  RETURN ROUND((COALESCE(eq, 0) + COALESCE(ex, 0) + COALESCE(tu, 0))::DECIMAL / 
    NULLIF((CASE WHEN eq IS NOT NULL THEN 1 ELSE 0 END + 
            CASE WHEN ex IS NOT NULL THEN 1 ELSE 0 END + 
            CASE WHEN tu IS NOT NULL THEN 1 ELSE 0 END), 0));
END;
$$ LANGUAGE plpgsql;

-- Function to get user's latest scores
CREATE OR REPLACE FUNCTION get_latest_scores(p_user_id UUID)
RETURNS TABLE(equifax INT, experian INT, transunion INT, average INT, recorded_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.equifax,
    cs.experian,
    cs.transunion,
    get_average_score(cs.equifax, cs.experian, cs.transunion) as average,
    cs.recorded_at
  FROM credit_scores cs
  WHERE cs.user_id = p_user_id
  ORDER BY cs.recorded_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT ALL ON credit_scores TO authenticated;
GRANT ALL ON negative_items TO authenticated;
GRANT ALL ON disputes TO authenticated;
GRANT SELECT ON letter_templates TO authenticated;
