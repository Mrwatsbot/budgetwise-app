// Credit Booster Type Definitions

export type Bureau = 'equifax' | 'experian' | 'transunion';

export type NegativeItemType = 
  | 'collection'
  | 'late_payment'
  | 'charge_off'
  | 'repossession'
  | 'bankruptcy'
  | 'foreclosure'
  | 'tax_lien'
  | 'judgment'
  | 'inquiry'
  | 'other';

export type NegativeItemStatus = 
  | 'identified'
  | 'disputing'
  | 'responded'
  | 'deleted'
  | 'verified'
  | 'paid'
  | 'settled';

export type LetterType = 
  | '609_validation'
  | 'goodwill'
  | 'pay_for_delete'
  | 'general_dispute'
  | 'debt_validation'
  | 'cease_desist'
  | 'fraud_alert';

export type DisputeStatus = 
  | 'draft'
  | 'sent'
  | 'responded'
  | 'won'
  | 'lost'
  | 'expired';

export type ResponseType = 
  | 'pending'
  | 'deleted'
  | 'verified'
  | 'updated'
  | 'no_response'
  | 'need_more_info';

export type ImpactLevel = 'high' | 'medium' | 'low';

// ============================================
// Database Models
// ============================================

export interface CreditScore {
  id: string;
  user_id: string;
  equifax: number | null;
  experian: number | null;
  transunion: number | null;
  source: 'manual' | 'import' | 'api';
  recorded_at: string;
  created_at: string;
}

export interface NegativeItem {
  id: string;
  user_id: string;
  item_type: NegativeItemType;
  creditor_name: string;
  original_creditor: string | null;
  account_number: string | null;
  amount: number | null;
  date_opened: string | null;
  date_reported: string | null;
  on_equifax: boolean;
  on_experian: boolean;
  on_transunion: boolean;
  status: NegativeItemStatus;
  estimated_impact: ImpactLevel | null;
  estimated_points: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Dispute {
  id: string;
  user_id: string;
  negative_item_id: string | null;
  letter_type: LetterType;
  target: string;
  target_type: 'bureau' | 'creditor' | 'collection_agency';
  target_address: string | null;
  letter_content: string;
  letter_generated_by: 'ai' | 'template' | 'manual';
  status: DisputeStatus;
  sent_date: string | null;
  sent_method: 'certified_mail' | 'regular_mail' | 'online' | 'fax' | null;
  tracking_number: string | null;
  deadline_date: string | null;
  response_date: string | null;
  response_type: ResponseType | null;
  response_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  negative_item?: NegativeItem;
}

export interface LetterTemplate {
  id: string;
  letter_type: LetterType;
  name: string;
  description: string | null;
  template_content: string;
  variables: string[];
  is_system: boolean;
  created_at: string;
}

// ============================================
// Form/Input Types
// ============================================

export interface CreditScoreInput {
  equifax?: number | null;
  experian?: number | null;
  transunion?: number | null;
  source?: 'manual' | 'import' | 'api';
}

export interface NegativeItemInput {
  item_type: NegativeItemType;
  creditor_name: string;
  original_creditor?: string;
  account_number?: string;
  amount?: number;
  date_opened?: string;
  date_reported?: string;
  on_equifax?: boolean;
  on_experian?: boolean;
  on_transunion?: boolean;
  estimated_impact?: ImpactLevel;
  notes?: string;
}

export interface DisputeInput {
  negative_item_id?: string;
  letter_type: LetterType;
  target: string;
  target_type?: 'bureau' | 'creditor' | 'collection_agency';
  target_address?: string;
  letter_content: string;
}

// ============================================
// Computed/Display Types
// ============================================

export interface CreditScoreWithAverage extends CreditScore {
  average: number | null;
}

export interface NegativeItemWithDisputes extends NegativeItem {
  disputes: Dispute[];
  active_dispute?: Dispute;
}

export interface CreditSummary {
  current_score: CreditScoreWithAverage | null;
  score_change_30d: number | null;
  total_negatives: number;
  active_disputes: number;
  items_deleted: number;
  estimated_points_recoverable: number;
}

export interface DisputeStats {
  total: number;
  draft: number;
  sent: number;
  won: number;
  lost: number;
  pending_response: number;
  approaching_deadline: number;
}

// ============================================
// AI/Letter Generation Types
// ============================================

export interface LetterGenerationRequest {
  letter_type: LetterType;
  negative_item?: NegativeItem;
  user_info: {
    full_name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone?: string;
    ssn_last4?: string;
  };
  custom_params?: {
    hardship_reason?: string;
    years_customer?: number;
    offer_amount?: number;
    [key: string]: unknown;
  };
}

export interface LetterGenerationResponse {
  letter_content: string;
  suggested_target: string;
  suggested_target_address?: string;
  tips: string[];
}

export interface CreditAnalysisRequest {
  scores: CreditScoreInput;
  negatives: NegativeItem[];
  goal_score?: number;
  target_date?: string;
}

export interface CreditAnalysisResponse {
  priority_items: Array<{
    item_id: string;
    reason: string;
    recommended_action: LetterType;
    success_probability: 'high' | 'medium' | 'low';
    estimated_points: number;
  }>;
  quick_wins: string[];
  timeline_estimate: string;
  additional_recommendations: string[];
}

// ============================================
// Score Utilities
// ============================================

export type ScoreRating = 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor';

export function getScoreRating(score: number): ScoreRating {
  if (score >= 750) return 'excellent';
  if (score >= 700) return 'good';
  if (score >= 650) return 'fair';
  if (score >= 550) return 'poor';
  return 'very_poor';
}

export function getScoreColor(score: number): string {
  if (score >= 750) return '#10b981'; // green
  if (score >= 700) return '#22c55e'; // light green
  if (score >= 650) return '#eab308'; // yellow
  if (score >= 550) return '#f97316'; // orange
  return '#ef4444'; // red
}

export function getAverageScore(scores: CreditScoreInput): number | null {
  const values = [scores.equifax, scores.experian, scores.transunion].filter(
    (v): v is number => v !== null && v !== undefined
  );
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function getImpactEstimate(type: NegativeItemType, amount?: number): { impact: ImpactLevel; points: number } {
  // Based on research data
  const estimates: Record<NegativeItemType, { impact: ImpactLevel; points: number }> = {
    collection: { impact: 'high', points: 60 },
    late_payment: { impact: 'medium', points: 25 },
    charge_off: { impact: 'high', points: 50 },
    repossession: { impact: 'high', points: 60 },
    bankruptcy: { impact: 'high', points: 100 },
    foreclosure: { impact: 'high', points: 80 },
    tax_lien: { impact: 'high', points: 70 },
    judgment: { impact: 'high', points: 60 },
    inquiry: { impact: 'low', points: 5 },
    other: { impact: 'medium', points: 20 },
  };
  
  return estimates[type] || { impact: 'medium', points: 20 };
}

export function getDaysUntilDeadline(deadlineDate: string): number {
  const deadline = new Date(deadlineDate);
  const today = new Date();
  const diffTime = deadline.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export const ITEM_TYPE_LABELS: Record<NegativeItemType, string> = {
  collection: 'Collection',
  late_payment: 'Late Payment',
  charge_off: 'Charge-Off',
  repossession: 'Repossession',
  bankruptcy: 'Bankruptcy',
  foreclosure: 'Foreclosure',
  tax_lien: 'Tax Lien',
  judgment: 'Judgment',
  inquiry: 'Hard Inquiry',
  other: 'Other',
};

export const STATUS_LABELS: Record<NegativeItemStatus, string> = {
  identified: 'Identified',
  disputing: 'Disputing',
  responded: 'Responded',
  deleted: 'Deleted ✓',
  verified: 'Verified',
  paid: 'Paid',
  settled: 'Settled',
};

export const LETTER_TYPE_LABELS: Record<LetterType, string> = {
  '609_validation': '609 Validation',
  goodwill: 'Goodwill Request',
  pay_for_delete: 'Pay for Delete',
  general_dispute: 'General Dispute',
  debt_validation: 'Debt Validation',
  cease_desist: 'Cease & Desist',
  fraud_alert: 'Fraud Alert',
};

export const BUREAU_ADDRESSES = {
  equifax: {
    name: 'Equifax Information Services LLC',
    address: 'P.O. Box 740256',
    city: 'Atlanta',
    state: 'GA',
    zip: '30374',
  },
  experian: {
    name: 'Experian',
    address: 'P.O. Box 4500',
    city: 'Allen',
    state: 'TX',
    zip: '75013',
  },
  transunion: {
    name: 'TransUnion LLC',
    address: 'P.O. Box 2000',
    city: 'Chester',
    state: 'PA',
    zip: '19016',
  },
};
