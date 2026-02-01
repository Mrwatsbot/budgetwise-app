'use client';

import { useState } from 'react';
import {
  Sparkles,
  Check,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { requestBudgetTune, applyAutoBudget } from '@/lib/hooks/use-data';

// ============================================================
// TYPES
// ============================================================

interface Allocation {
  category_name: string;
  category_id?: string;
  amount: number;
  reasoning: string;
}

interface BudgetResult {
  monthly_income: number;
  allocations: Allocation[];
  summary: {
    total_needs: number;
    total_wants: number;
    total_savings_debt: number;
    needs_pct: number;
    wants_pct: number;
    savings_debt_pct: number;
  };
  notes: string;
  current_budgets?: Record<string, { budgeted: number; categoryName: string }>;
}

interface BudgetTuneDialogProps {
  currentMonth: string;
  onApplied?: () => void;
}

// ============================================================
// HELPERS
// ============================================================

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

// ============================================================
// COMPONENT
// ============================================================

export function BudgetTuneDialog({ currentMonth, onApplied }: BudgetTuneDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BudgetResult | null>(null);

  const resetForm = () => {
    setResult(null);
    setError(null);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await requestBudgetTune();

      if (response.result) {
        setResult(response.result);
      } else {
        setError(response.error || 'Failed to generate tune-up');
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('429')) {
        setError('You\'ve reached your AI limit for this month. Upgrade to Pro for unlimited access.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to generate tune-up');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!result) return;
    setApplying(true);
    setError(null);

    try {
      const allocations = result.allocations
        .filter((a) => (a.category_id || a.category_name) && a.amount > 0)
        .map((a) => ({
          category_id: a.category_id || null,
          category_name: a.category_name,
          amount: a.amount,
        }));

      await applyAutoBudget(allocations, currentMonth);
      onApplied?.();
      setOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply budget');
    } finally {
      setApplying(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v && !result) {
      // Auto-generate when dialog opens
      handleGenerate();
    }
    if (!v) {
      resetForm();
    }
  };

  // Calculate changes for diff view
  const changes = result?.allocations.map((alloc) => {
    const currentBudget = result.current_budgets?.[alloc.category_id || '']?.budgeted || 0;
    const newBudget = alloc.amount;
    const change = newBudget - currentBudget;
    
    return {
      categoryName: alloc.category_name,
      oldAmount: currentBudget,
      newAmount: newBudget,
      change,
      reasoning: alloc.reasoning,
    };
  }).filter((c) => c.oldAmount > 0 || c.newAmount > 0) || [];

  const totalChanges = changes.filter((c) => Math.abs(c.change) > 0).length;
  const totalReallocation = changes.reduce((sum, c) => sum + Math.abs(c.change), 0) / 2; // Divide by 2 to avoid double-counting

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="shimmer-btn-outline border-0 px-4 py-2 rounded-lg">
          <TrendingUp className="w-4 h-4 mr-2" />
          Tune Up
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-background border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#1a7a6d]" />
            Budget Tune-Up
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            AI analyzes your actual spending vs budgets and suggests adjustments
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {loading ? (
            <div className="text-center py-10">
              <Loader2 className="w-8 h-8 text-[#1a7a6d] animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium">Analyzing your spending patterns...</p>
              <p className="text-xs text-muted-foreground mt-1">Comparing budgets vs actuals across months</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-400 mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={handleGenerate}>
                Try Again
              </Button>
            </div>
          ) : result ? (
            <>
              {/* 50/30/20 Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Adjusted Breakdown</h4>
                <div className="flex gap-0.5 h-4 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 rounded-l-full transition-all"
                    style={{ width: `${result.summary.needs_pct}%` }}
                    title={`Needs: ${result.summary.needs_pct}%`}
                  />
                  <div
                    className="bg-[#1a7a6d] transition-all"
                    style={{ width: `${result.summary.wants_pct}%` }}
                    title={`Wants: ${result.summary.wants_pct}%`}
                  />
                  <div
                    className="bg-[#6db555] rounded-r-full transition-all"
                    style={{ width: `${result.summary.savings_debt_pct}%` }}
                    title={`Savings & Debt: ${result.summary.savings_debt_pct}%`}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Needs {result.summary.needs_pct}%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#1a7a6d]" />
                    Wants {result.summary.wants_pct}%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#6db555]" />
                    Save {result.summary.savings_debt_pct}%
                  </span>
                </div>
              </div>

              {/* Net change summary */}
              {totalChanges > 0 && (
                <div className="rounded-lg bg-[#1a7a6d1a] border border-[#1a7a6d4d] p-3 text-center">
                  <p className="text-sm font-semibold text-[#1a7a6d]">
                    Reallocated {formatCurrency(totalReallocation)} across {totalChanges} {totalChanges === 1 ? 'category' : 'categories'}
                  </p>
                </div>
              )}

              {/* Diff View */}
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {changes
                  .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
                  .map((item, idx) => {
                    const changeIcon = item.change > 0 
                      ? <TrendingUp className="w-4 h-4 text-green-500" />
                      : item.change < 0
                      ? <TrendingDown className="w-4 h-4 text-red-500" />
                      : <Minus className="w-4 h-4 text-muted-foreground" />;

                    const changeColor = item.change > 0
                      ? 'text-green-500'
                      : item.change < 0
                      ? 'text-red-500'
                      : 'text-muted-foreground';

                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-muted/20 border border-border space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {changeIcon}
                            <p className="text-sm font-medium truncate">{item.categoryName}</p>
                          </div>
                          <div className="flex items-center gap-2 text-sm font-semibold flex-shrink-0">
                            <span className="text-muted-foreground">{formatCurrency(item.oldAmount)}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className={changeColor}>{formatCurrency(item.newAmount)}</span>
                          </div>
                        </div>
                        {item.change !== 0 && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className={`font-medium ${changeColor}`}>
                              {item.change > 0 ? '+' : ''}{formatCurrency(item.change)}
                            </span>
                            <span className="text-muted-foreground">{item.reasoning}</span>
                          </div>
                        )}
                        {item.change === 0 && item.oldAmount > 0 && (
                          <p className="text-xs text-muted-foreground">{item.reasoning}</p>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Notes */}
              {result.notes && (
                <p className="text-xs text-muted-foreground italic border-t border-border pt-3">
                  {result.notes}
                </p>
              )}

              {totalChanges === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Your current budget looks good! No major adjustments needed based on your spending patterns.
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Actions */}
        {result && !loading && (
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              onClick={handleGenerate}
              disabled={applying}
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
            <Button
              onClick={handleApply}
              disabled={applying || totalChanges === 0}
              className="flex-1 gradient-btn border-0"
            >
              {applying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Apply Changes
                </>
              )}
            </Button>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground/50 text-center">
          For informational purposes only. Not financial advice.
        </p>
      </DialogContent>
    </Dialog>
  );
}
