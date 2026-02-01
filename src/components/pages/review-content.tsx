'use client';

import { useMonthReview } from '@/lib/hooks/use-data';
import { Sparkles, ArrowRight, Lock, TrendingUp, TrendingDown, Target, Trophy, Loader2 } from 'lucide-react';
import Link from 'next/link';

export function ReviewContent() {
  const { data, isLoading } = useMonthReview();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#1a7a6d] animate-spin" />
      </div>
    );
  }

  const isFreeUser = data?.tier === 'free' || data?.tier === 'basic';
  const hasData = data && data.headline && data.headline.totalSpent > 0;

  // Format currency
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Month in Review</h1>
        <p className="text-muted-foreground">{data?.month || 'Previous Month'}</p>
      </div>

      {!hasData ? (
        /* Empty state */
        <div className="glass-card rounded-xl p-8 text-center">
          <Sparkles className="w-10 h-10 text-[#1a7a6d] mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No data yet</h3>
          <p className="text-sm text-muted-foreground">
            Your first Month in Review will be ready after a full month of tracking.
            Keep logging transactions!
          </p>
        </div>
      ) : isFreeUser ? (
        /* Free tier teaser */
        <div className="space-y-4">
          <div className="glass-card rounded-xl p-6">
            <p className="text-xs text-[#1a7a6d] font-semibold uppercase tracking-wider mb-3">
              {data.month}
            </p>
            <p className="text-4xl font-bold text-[#1a7a6d] mb-1">{fmt(data.headline.totalSpent)}</p>
            <p className="text-sm text-muted-foreground mb-4">total spent this month</p>
            <div className="flex justify-between py-3 border-t border-border">
              <span className="text-sm text-muted-foreground">Income</span>
              <span className="text-sm font-semibold">{fmt(data.headline.totalIncome)}</span>
            </div>
            <div className="flex justify-between py-3 border-t border-border">
              <span className="text-sm text-muted-foreground">
                {data.headline.surplus >= 0 ? 'Surplus' : 'Deficit'}
              </span>
              <span className={`text-sm font-semibold ${data.headline.surplus >= 0 ? 'text-[#6db555]' : 'text-[#e05252]'}`}>
                {data.headline.surplus >= 0 ? '+' : ''}{fmt(data.headline.surplus)}
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="glass-card rounded-xl p-6 blur-sm select-none pointer-events-none">
              <div className="h-8 bg-muted/20 rounded mb-3" />
              <div className="h-6 bg-muted/20 rounded w-2/3 mb-6" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-24 bg-muted/20 rounded-lg" />
                <div className="h-24 bg-muted/20 rounded-lg" />
                <div className="h-24 bg-muted/20 rounded-lg" />
                <div className="h-24 bg-muted/20 rounded-lg" />
              </div>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-xl">
              <Lock className="w-8 h-8 text-[#1a7a6d] mb-3" />
              <p className="text-sm font-semibold mb-1">Unlock your full report</p>
              <p className="text-xs text-muted-foreground mb-3">Wins, trends, AI insights & more</p>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-[#1a7a6d] to-[#146b5f]"
              >
                <Sparkles className="w-4 h-4" />
                Upgrade to Plus
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* Plus/Pro — summary cards with CTA to full report */
        <div className="space-y-4">
          {/* Headline card */}
          <div className="glass-card rounded-xl p-6">
            <p className="text-xs text-[#1a7a6d] font-semibold uppercase tracking-wider mb-3">
              {data.month}
            </p>
            <p className="text-4xl font-bold text-[#1a7a6d] mb-1">{fmt(data.headline.totalSpent)}</p>
            <p className="text-sm text-muted-foreground mb-4">total spent this month</p>
            <div className="flex justify-between py-3 border-t border-border">
              <span className="text-sm text-muted-foreground">Income</span>
              <span className="text-sm font-semibold">{fmt(data.headline.totalIncome)}</span>
            </div>
            {data.headline.surplus !== 0 && (
              <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-opacity-10"
                style={{ backgroundColor: data.headline.surplus >= 0 ? 'rgba(109,181,85,0.1)' : 'rgba(224,82,82,0.1)' }}>
                {data.headline.surplus >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-[#6db555]" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-[#e05252]" />
                )}
                <span className={`text-sm font-semibold ${data.headline.surplus >= 0 ? 'text-[#6db555]' : 'text-[#e05252]'}`}>
                  {fmt(Math.abs(data.headline.surplus))} {data.headline.surplus >= 0 ? 'surplus' : 'deficit'}
                </span>
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            {data.wins && (
              <div className="glass-card rounded-xl p-4 text-center">
                <Target className="w-5 h-5 text-[#1a7a6d] mx-auto mb-2" />
                <p className="text-xl font-bold text-[#6db555]">
                  {data.wins.categoriesOnBudget}/{data.wins.totalCategories}
                </p>
                <p className="text-xs text-muted-foreground">On budget</p>
              </div>
            )}
            {data.score && (
              <div className="glass-card rounded-xl p-4 text-center">
                <Trophy className="w-5 h-5 text-[#1a7a6d] mx-auto mb-2" />
                <p className="text-xl font-bold">{data.score.current}</p>
                <p className="text-xs text-muted-foreground">
                  Health Score
                  {data.score.change !== 0 && (
                    <span className={data.score.change > 0 ? ' text-[#6db555]' : ' text-[#e05252]'}>
                      {' '}{data.score.change > 0 ? '+' : ''}{data.score.change}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Top overshoot preview */}
          {data.surprises?.overshoots?.length > 0 && (
            <div className="glass-card rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Biggest overshoot</p>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{data.surprises.overshoots[0].category}</span>
                <span className="text-sm font-semibold text-[#e05252]">
                  +{data.surprises.overshoots[0].pctOver}% over
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#e05252] opacity-60"
                  style={{ width: `${Math.min(100, 100 + data.surprises.overshoots[0].pctOver * 0.5)}%` }}
                />
              </div>
            </div>
          )}

          {/* CTA to full report */}
          <Link
            href="/review"
            className="flex items-center justify-between w-full glass-card rounded-xl p-5 hover:border-[#1a7a6d4d] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1a7a6d33] to-[#146b5f33] border border-[#1a7a6d4d] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#1a7a6d]" />
              </div>
              <div>
                <p className="text-sm font-semibold group-hover:text-[#1a7a6d] transition-colors">
                  View Full Report
                </p>
                <p className="text-xs text-muted-foreground">
                  Trends, flow, AI insights & more
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-[#1a7a6d] transition-colors" />
          </Link>
        </div>
      )}
    </div>
  );
}
