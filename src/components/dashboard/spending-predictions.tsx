'use client';

import useSWR from 'swr';
import { getCategoryIcon } from '@/lib/category-icons';
import { Loader2, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface Prediction {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  budgetAmount: number;
  spent: number;
  dailyRate: number;
  projectedTotal: number;
  projectedOverspend: number;
  status: 'on_pace' | 'over_pace' | 'under_pace';
  daysElapsed: number;
  daysRemaining: number;
}

interface PredictionsData {
  predictions: Prediction[];
  atRiskCategories: Prediction[];
  daysElapsed: number;
  daysRemaining: number;
  daysInMonth: number;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

export function SpendingPredictions() {
  const monthStr = new Date().toISOString().split('T')[0].slice(0, 8) + '01';
  const { data, error, isLoading } = useSWR<PredictionsData>(
    `/api/predictions?month=${monthStr}`,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );

  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[#1a7a6d]" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null; // Silent fail
  }

  const { atRiskCategories, daysElapsed, daysInMonth } = data;

  // If no categories at risk, show success message
  if (atRiskCategories.length === 0) {
    return (
      <div className="glass-card rounded-xl p-5">
        <div className="mb-4">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#1a7a6d]" />
            Spending Predictions
          </h3>
          <p className="text-xs text-muted-foreground">
            Projected spending based on current pace (day {daysElapsed} of {daysInMonth})
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <CheckCircle className="w-12 h-12 text-[#7aba5c] mb-3" />
          <p className="text-sm font-medium text-[#7aba5c]">All categories on track 🎯</p>
          <p className="text-xs text-muted-foreground mt-1">
            Keep up the great work!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-[#1a7a6d]" />
          Spending Predictions
        </h3>
        <p className="text-xs text-muted-foreground">
          At this pace, these categories may exceed budget (day {daysElapsed} of {daysInMonth})
        </p>
      </div>

      <div className="space-y-4">
        {atRiskCategories.map((prediction) => {
          const Icon = getCategoryIcon(prediction.categoryIcon, prediction.categoryName);
          const pacePercentage = prediction.budgetAmount > 0
            ? Math.min((prediction.projectedTotal / prediction.budgetAmount) * 100, 150)
            : 0;

          return (
            <div key={prediction.categoryId} className="space-y-2">
              {/* Category header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon
                    className="w-4 h-4"
                    style={{ color: prediction.categoryColor || '#1a7a6d' }}
                  />
                  <span className="font-medium text-sm">{prediction.categoryName}</span>
                </div>
                <span className="text-xs text-orange-400 font-medium">
                  ⚠️ +${prediction.projectedOverspend.toFixed(0)} over
                </span>
              </div>

              {/* Projection text */}
              <p className="text-xs text-muted-foreground">
                At this pace, <span className="font-medium text-foreground">{prediction.categoryName}</span> will
                hit{' '}
                <span className="font-medium text-orange-400">
                  ${prediction.projectedTotal.toFixed(0)}
                </span>{' '}
                (budget: ${prediction.budgetAmount.toFixed(0)})
              </p>

              {/* Pace indicator bar */}
              <div className="relative h-2 rounded-full bg-secondary/30 overflow-hidden">
                {/* Budget limit marker (100%) */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white/50 z-10"
                  style={{ left: '100%' }}
                />
                {/* Current spending (darker) */}
                <div
                  className="absolute h-full rounded-full bg-[#1a7a6d]"
                  style={{
                    width: `${Math.min((prediction.spent / prediction.budgetAmount) * 100, 100)}%`,
                  }}
                />
                {/* Projected spending (lighter, extends beyond) */}
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pacePercentage}%`,
                    background: pacePercentage > 100
                      ? 'linear-gradient(90deg, #f97316 0%, #ef4444 100%)'
                      : '#f97316',
                    opacity: 0.5,
                  }}
                />
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#1a7a6d]" />
                  <span>Spent: ${prediction.spent.toFixed(0)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-orange-500 opacity-50" />
                  <span>Projected: ${prediction.projectedTotal.toFixed(0)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Daily rate summary */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          💡 <span className="font-medium">Tip:</span> These projections assume you continue spending at
          your current daily rate. Adjust now to stay on budget!
        </p>
      </div>
    </div>
  );
}
