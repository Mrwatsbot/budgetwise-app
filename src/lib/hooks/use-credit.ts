'use client';

import useSWR from 'swr';
import { CreditScore, NegativeItem, Dispute, LetterTemplate } from '@/types/credit';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
};

// ============================================
// CREDIT SCORES
// ============================================

export function useCreditScores() {
  const { data, error, isLoading, mutate } = useSWR<CreditScore[]>(
    '/api/credit/scores',
    fetcher
  );

  const latestScore = data?.[0] || null;
  
  // Calculate average
  const getAverage = (score: CreditScore | null) => {
    if (!score) return null;
    const values = [score.equifax, score.experian, score.transunion].filter(
      (v): v is number => v !== null
    );
    if (values.length === 0) return null;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  };

  // Calculate 30-day change
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const previousScore = data?.find(s => new Date(s.recorded_at) <= thirtyDaysAgo);
  const scoreChange = latestScore && previousScore 
    ? (getAverage(latestScore) || 0) - (getAverage(previousScore) || 0)
    : null;

  const addScore = async (scoreData: { equifax?: number; experian?: number; transunion?: number }) => {
    const res = await fetch('/api/credit/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scoreData),
    });
    if (!res.ok) throw new Error('Failed to add score');
    mutate();
    return res.json();
  };

  return {
    scores: data || [],
    latestScore,
    averageScore: getAverage(latestScore),
    scoreChange,
    isLoading,
    error,
    addScore,
    mutate,
  };
}

// ============================================
// NEGATIVE ITEMS
// ============================================

export function useNegativeItems() {
  const { data, error, isLoading, mutate } = useSWR<NegativeItem[]>(
    '/api/credit/negatives',
    fetcher
  );

  const addItem = async (item: Partial<NegativeItem>) => {
    const res = await fetch('/api/credit/negatives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error('Failed to add item');
    mutate();
    return res.json();
  };

  const updateItem = async (id: string, updates: Partial<NegativeItem>) => {
    const res = await fetch('/api/credit/negatives', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!res.ok) throw new Error('Failed to update item');
    mutate();
    return res.json();
  };

  const deleteItem = async (id: string) => {
    const res = await fetch(`/api/credit/negatives?id=${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete item');
    mutate();
  };

  // Stats
  const totalItems = data?.length || 0;
  const activeItems = data?.filter(i => !['deleted', 'paid', 'settled'].includes(i.status)).length || 0;
  const deletedItems = data?.filter(i => i.status === 'deleted').length || 0;
  const disputingItems = data?.filter(i => i.status === 'disputing').length || 0;
  
  const estimatedPointsRecoverable = data
    ?.filter(i => !['deleted', 'paid', 'settled'].includes(i.status))
    .reduce((sum, i) => sum + (i.estimated_points || 0), 0) || 0;

  return {
    items: data || [],
    totalItems,
    activeItems,
    deletedItems,
    disputingItems,
    estimatedPointsRecoverable,
    isLoading,
    error,
    addItem,
    updateItem,
    deleteItem,
    mutate,
  };
}

// ============================================
// DISPUTES
// ============================================

export function useDisputes(filters?: { status?: string; negative_item_id?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.negative_item_id) params.set('negative_item_id', filters.negative_item_id);
  
  const url = `/api/credit/disputes${params.toString() ? `?${params}` : ''}`;
  
  const { data, error, isLoading, mutate } = useSWR<Dispute[]>(url, fetcher);

  const createDispute = async (dispute: Partial<Dispute>) => {
    const res = await fetch('/api/credit/disputes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dispute),
    });
    if (!res.ok) throw new Error('Failed to create dispute');
    mutate();
    return res.json();
  };

  const updateDispute = async (id: string, updates: Partial<Dispute>) => {
    const res = await fetch('/api/credit/disputes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!res.ok) throw new Error('Failed to update dispute');
    mutate();
    return res.json();
  };

  const deleteDispute = async (id: string) => {
    const res = await fetch(`/api/credit/disputes?id=${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete dispute');
    mutate();
  };

  // Stats
  const stats = {
    total: data?.length || 0,
    draft: data?.filter(d => d.status === 'draft').length || 0,
    sent: data?.filter(d => d.status === 'sent').length || 0,
    won: data?.filter(d => d.status === 'won').length || 0,
    lost: data?.filter(d => d.status === 'lost').length || 0,
    pendingResponse: data?.filter(d => d.status === 'sent' && !d.response_date).length || 0,
    approachingDeadline: data?.filter(d => {
      if (d.status !== 'sent' || !d.deadline_date) return false;
      const deadline = new Date(d.deadline_date);
      const today = new Date();
      const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysLeft <= 7 && daysLeft >= 0;
    }).length || 0,
  };

  return {
    disputes: data || [],
    stats,
    isLoading,
    error,
    createDispute,
    updateDispute,
    deleteDispute,
    mutate,
  };
}

// ============================================
// LETTER GENERATION
// ============================================

interface GenerateLetterParams {
  letter_type: string;
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
  target_bureau?: 'equifax' | 'experian' | 'transunion';
  custom_params?: {
    hardship_reason?: string;
    years_customer?: number;
    offer_amount?: number;
  };
}

interface GeneratedLetter {
  letter_content: string;
  letter_type: string;
  letter_type_label: string;
  suggested_target: string;
  suggested_target_address?: string;
  tips: string[];
}

export function useLetterGenerator() {
  const generateLetter = async (params: GenerateLetterParams): Promise<GeneratedLetter> => {
    const res = await fetch('/api/ai/letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to generate letter' }));
      throw new Error(error.error || 'Failed to generate letter');
    }
    
    return res.json();
  };

  return { generateLetter };
}

// ============================================
// COMBINED CREDIT SUMMARY
// ============================================

export function useCreditSummary() {
  const { latestScore, averageScore, scoreChange, isLoading: scoresLoading } = useCreditScores();
  const { totalItems, activeItems, deletedItems, estimatedPointsRecoverable, isLoading: itemsLoading } = useNegativeItems();
  const { stats: disputeStats, isLoading: disputesLoading } = useDisputes();

  return {
    currentScore: latestScore,
    averageScore,
    scoreChange30d: scoreChange,
    totalNegatives: totalItems,
    activeNegatives: activeItems,
    itemsDeleted: deletedItems,
    activeDisputes: disputeStats.sent + disputeStats.draft,
    disputesWon: disputeStats.won,
    estimatedPointsRecoverable,
    isLoading: scoresLoading || itemsLoading || disputesLoading,
  };
}
