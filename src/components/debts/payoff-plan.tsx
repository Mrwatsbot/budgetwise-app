'use client';

import { useState } from 'react';
import {
  Calculator,
  Sparkles,
  TrendingDown,
  DollarSign,
  Clock,
  Target,
  Lock,
  ArrowRight,
  Loader2,
  Star,
  Trophy,
  Gauge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { requestPayoffPlan, useAILimits } from '@/lib/hooks/use-data';
import type { Debt } from '@/types/database';
import { DEBT_TYPE_LABELS } from '@/types/database';

// ============================================================
// TYPES
// ============================================================

interface PayoffPlanProps {
  debts: Debt[];
}

interface PaymentOrderItem {
  name: string;
  type: string;
  balance: number;
  apr: number;
  reason: string;
}

interface Scenario {
  label: string;
  extra_monthly: number;
  total_months: number;
  total_interest: number;
  total_paid: number;
  payoff_date: string;
  months_saved?: number;
  interest_saved?: number;
}

interface PayoffPlan {
  strategy: 'avalanche' | 'snowball' | 'hybrid';
  strategy_reasoning: string;
  payment_order: PaymentOrderItem[];
  scenarios: Scenario[];
  quick_wins: string[];
  disclaimer?: string;
}

// ============================================================
// HELPERS
// ============================================================

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const strategyConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  avalanche: {
    label: 'Avalanche',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-[#5b8fd9]4d',
  },
  snowball: {
    label: 'Snowball',
    color: 'text-[#22a090]',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
  },
  hybrid: {
    label: 'Hybrid',
    color: 'text-[#1a7a6d]',
    bg: 'bg-[#1a7a6d1a]',
    border: 'border-[#1a7a6d4d]',
  },
};

/**
 * Find the "sweet spot" scenario — best ratio of interest saved per extra dollar.
 * Skip the minimum-only scenario (index 0).
 */
function findSweetSpot(scenarios: Scenario[]): number {
  let bestIdx = -1;
  let bestRatio = 0;
  for (let i = 1; i < scenarios.length; i++) {
    const s = scenarios[i];
    if (s.extra_monthly > 0 && s.interest_saved && s.interest_saved > 0) {
      const ratio = s.interest_saved / s.extra_monthly;
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestIdx = i;
      }
    }
  }
  // Fallback to second scenario if none had interest_saved
  return bestIdx >= 0 ? bestIdx : 1;
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function ShimmerLoading() {
  return (
    <div className="space-y-6">
      {/* Strategy shimmer */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      {/* Payment order shimmer */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
      {/* Scenario cards shimmer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 rounded-xl bg-muted/30 space-y-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

function LockedState() {
  return (
    <div className="relative">
      {/* Fake blurred content */}
      <div className="space-y-6 blur-sm select-none pointer-events-none">
        {/* Fake strategy */}
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium border border-[#5b8fd9]4d">
            Avalanche
          </span>
          <p className="text-sm text-muted-foreground">
            Recommended for your debt profile with high-APR credit cards
          </p>
        </div>
        {/* Fake scenario cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {['Minimum only', 'Extra $50/mo', 'Extra $100/mo', 'Extra $200/mo'].map((label) => (
            <div key={label} className="p-4 rounded-xl bg-muted/20 border border-border">
              <p className="text-xs text-muted-foreground mb-2">{label}</p>
              <p className="text-3xl font-bold">36</p>
              <p className="text-xs text-muted-foreground">months to debt-free</p>
              <p className="text-sm mt-2">$4,200 in interest</p>
            </div>
          ))}
        </div>
      </div>

      {/* Overlay CTA */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg">
        <Lock className="w-8 h-8 text-[#1a7a6d] mb-3" />
        <p className="text-sm font-semibold mb-1">Unlock Smart Payoff Plan</p>
        <p className="text-xs text-muted-foreground mb-3">Upgrade to Plus for AI-powered debt elimination strategy</p>
        <Button size="sm" className="gradient-btn border-0" asChild>
          <a href="/settings">
            <Sparkles className="w-4 h-4 mr-1.5" />
            Upgrade to Plus
          </a>
        </Button>
      </div>
    </div>
  );
}

function StrategySection({ plan }: { plan: PayoffPlan }) {
  const config = strategyConfig[plan.strategy] || strategyConfig.hybrid;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${config.bg} ${config.color} ${config.border}`}>
          <TrendingDown className="w-3.5 h-3.5" />
          {config.label} Strategy
        </span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {plan.strategy_reasoning}
      </p>
    </div>
  );
}

function PaymentOrderSection({ order }: { order: PaymentOrderItem[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <ArrowRight className="w-4 h-4 text-[#1a7a6d]" />
        Payment Order
      </h3>
      <div className="space-y-2">
        {order.map((item, idx) => {
          const typeLabel = DEBT_TYPE_LABELS[item.type as keyof typeof DEBT_TYPE_LABELS] || item.type;
          return (
            <div
              key={`${item.name}-${idx}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border"
            >
              <div className="w-7 h-7 rounded-full bg-[#1a7a6d33] border border-[#1a7a6d4d] flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-[#1a7a6d]">{idx + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium truncate">{item.name}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {typeLabel}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{item.reason}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium">{formatCurrency(item.balance)}</p>
                <p className="text-xs text-muted-foreground">{item.apr}% APR</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScenarioCard({ scenario, isMinimum, isSweetSpot }: { scenario: Scenario; isMinimum: boolean; isSweetSpot: boolean }) {
  return (
    <div
      className={`relative p-4 rounded-xl border transition-all ${
        isSweetSpot
          ? 'border-[#1a7a6d80] bg-[#1a7a6d0d] ring-1 ring-purple-500/20'
          : isMinimum
            ? 'border-border bg-muted/10 opacity-70'
            : 'border-border bg-muted/20'
      }`}
    >
      {/* Sweet spot badge */}
      {isSweetSpot && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1a7a6d33] text-[#1a7a6d] text-[10px] font-semibold border border-[#1a7a6d4d]">
            <Star className="w-3 h-3" />
            Best Value
          </span>
        </div>
      )}

      {/* Label */}
      <p className="text-xs text-muted-foreground font-medium mb-3">
        {scenario.label}
      </p>

      {/* Big month number */}
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-3xl font-bold">{scenario.total_months}</span>
        <span className="text-sm text-muted-foreground">months</span>
      </div>

      {/* Payoff date */}
      <p className="text-xs text-muted-foreground mb-3">
        <Clock className="w-3 h-3 inline mr-1" />
        Debt-free by {scenario.payoff_date}
      </p>

      {/* Interest paid */}
      <div className="flex items-center gap-1.5 mb-2">
        <DollarSign className="w-3.5 h-3.5 text-red-400" />
        <span className="text-sm">
          <span className={isMinimum ? 'text-red-400 font-medium' : ''}>{formatCurrency(scenario.total_interest)}</span>
          <span className="text-muted-foreground"> in interest</span>
        </span>
      </div>

      {/* Savings (only for non-minimum) */}
      {!isMinimum && scenario.interest_saved && scenario.interest_saved > 0 && (
        <div className="space-y-1 mt-3 pt-3 border-t border-border">
          <p className="text-sm font-semibold text-[#7aba5c]">
            Save {formatCurrency(scenario.interest_saved)}
          </p>
          {scenario.months_saved && scenario.months_saved > 0 && (
            <p className="text-xs text-[#7aba5c]/80">
              {scenario.months_saved} months faster
            </p>
          )}
        </div>
      )}

      {/* Minimum warning */}
      {isMinimum && (
        <p className="text-[10px] text-muted-foreground mt-3 pt-3 border-t border-border italic">
          Total paid: {formatCurrency(scenario.total_paid)}
        </p>
      )}
    </div>
  );
}

function ScenariosSection({ scenarios }: { scenarios: Scenario[] }) {
  const sweetSpotIdx = findSweetSpot(scenarios);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Calculator className="w-4 h-4 text-[#1a7a6d]" />
        Payoff Scenarios
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {scenarios.map((scenario, idx) => (
          <ScenarioCard
            key={scenario.label}
            scenario={scenario}
            isMinimum={idx === 0}
            isSweetSpot={idx === sweetSpotIdx}
          />
        ))}
      </div>
    </div>
  );
}

function QuickWinsSection({ wins }: { wins: string[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Trophy className="w-4 h-4 text-[#1a7a6d]" />
        Quick Wins
      </h3>
      <div className="space-y-2">
        {wins.map((win, idx) => (
          <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/20">
            <Target className="w-4 h-4 text-[#1a7a6d] mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">{win}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function PayoffPlan({ debts }: PayoffPlanProps) {
  const [plan, setPlan] = useState<PayoffPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);

  const { tier, features, refresh: refreshLimits } = useAILimits();
  const isFree = tier === 'free' || tier === 'basic';
  const hasDebts = debts.filter((d) => !d.is_paid_off).length > 0;
  const payoffLimits = features?.payoff_plan;
  const isUnlimited = payoffLimits?.limit === -1;
  const remainingUses = payoffLimits?.remaining ?? 0;
  const totalLimit = payoffLimits?.limit ?? 0;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setRateLimitMessage(null);
    try {
      const result = await requestPayoffPlan();
      if (result.plan) {
        setPlan(result.plan);
        refreshLimits();
      } else {
        setError(result.error || 'Failed to generate plan');
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('429')) {
        setRateLimitMessage('You\'ve used all your payoff plan generations for this month. Upgrade to Pro for unlimited access.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to generate payoff plan');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1a7a6d33] to-[#146b5f33] border border-[#1a7a6d4d] flex items-center justify-center">
            <Calculator className="w-5 h-5 text-[#1a7a6d]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Smart Payoff Plan</h2>
            <p className="text-sm text-muted-foreground">AI-powered debt elimination strategy</p>
          </div>
        </div>

        {!isFree && hasDebts && (
          <div className="flex items-center gap-3">
            {!isUnlimited && totalLimit > 0 && (
              <span className="text-xs text-muted-foreground">
                {remainingUses} of {totalLimit}/mo remaining
              </span>
            )}
            <Button
              className="gradient-btn border-0"
              onClick={handleGenerate}
              disabled={loading || (!isUnlimited && remainingUses <= 0)}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : plan ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Regenerate
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Plan
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {isFree ? (
        <LockedState />
      ) : rateLimitMessage ? (
        <div className="text-center py-8">
          <Gauge className="w-10 h-10 text-teal-400 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">{rateLimitMessage}</p>
          <Button size="sm" className="gradient-btn border-0" asChild>
            <a href="/settings">
              <Sparkles className="w-4 h-4 mr-1.5" />
              Upgrade to Pro
            </a>
          </Button>
        </div>
      ) : !hasDebts ? (
        <div className="text-center py-8">
          <Trophy className="w-10 h-10 text-[#7aba5c] mx-auto mb-3" />
          <p className="text-sm font-semibold mb-1">No active debts</p>
          <p className="text-xs text-muted-foreground">Add debts to generate a payoff plan.</p>
        </div>
      ) : loading ? (
        <ShimmerLoading />
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-sm text-red-400 mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={handleGenerate}>
            Try Again
          </Button>
        </div>
      ) : plan ? (
        <div className="space-y-6">
          <StrategySection plan={plan} />
          {plan.payment_order && plan.payment_order.length > 0 && (
            <PaymentOrderSection order={plan.payment_order} />
          )}
          {plan.scenarios && plan.scenarios.length > 0 && (
            <ScenariosSection scenarios={plan.scenarios} />
          )}
          {plan.quick_wins && plan.quick_wins.length > 0 && (
            <QuickWinsSection wins={plan.quick_wins} />
          )}

          {/* Disclaimer */}
          <p className="text-[11px] text-muted-foreground/60 pt-4 border-t border-border">
            For informational purposes only. Not financial advice. Consult a qualified financial professional for personalized guidance.
          </p>
        </div>
      ) : (
        /* Initial state — prompt to generate */
        <div className="text-center py-8">
          <Sparkles className="w-10 h-10 text-[#1a7a6d] mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Get a personalized debt elimination strategy with interest savings projections.
          </p>
          <Button
            className="gradient-btn border-0"
            onClick={handleGenerate}
            disabled={loading}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Plan
          </Button>
        </div>
      )}
    </div>
  );
}
