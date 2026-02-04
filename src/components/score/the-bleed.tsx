'use client';

import { DollarSign, AlertTriangle, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface DebtCost {
  type: string;
  balance: number;
  apr: number;
  monthlyInterest: number;
}

interface TheBleedProps {
  debts: DebtCost[];
}

/**
 * "The Bleed" — Shows monthly interest & fees as a concrete dollar amount.
 * 
 * This is the #1 sharing trigger per SaaS expert review.
 * "You're paying $847/month in interest" is emotional, concrete, screenshot-worthy.
 * 
 * Rules (from FRICTION_COST_ANALYSIS.md):
 * - Show ONLY interest costs (Tier 1 — verifiable from statements)
 * - NEVER say "your score costs you $X" — that implies causation
 * - Exclude mortgages at ≤7% APR (they're not friction)
 * - Label clearly: "Interest you're paying" not "money you're losing"
 */
export function TheBleed({ debts }: TheBleedProps) {
  // Filter to debts with meaningful interest (exclude 0% and low-rate mortgages)
  const costlyDebts = debts.filter(d => {
    if (d.apr <= 0) return false;
    // Exclude mortgages at reasonable rates (≤7%)
    if ((d.type === 'mortgage' || d.type === 'heloc') && d.apr <= 7) return false;
    return d.monthlyInterest > 0;
  });

  if (costlyDebts.length === 0) return null;

  const monthlyTotal = costlyDebts.reduce((sum, d) => sum + d.monthlyInterest, 0);
  const yearlyTotal = monthlyTotal * 12;

  // Find the worst offender
  const worst = costlyDebts.reduce((prev, curr) =>
    curr.monthlyInterest > prev.monthlyInterest ? curr : prev
  );

  const formatDebtType = (type: string) => {
    const labels: Record<string, string> = {
      credit_card: 'Credit Cards',
      personal: 'Personal Loans',
      auto: 'Auto Loan',
      student: 'Student Loans',
      student_federal: 'Student Loans',
      student_private: 'Private Student Loans',
      payday: 'Payday Loans',
      bnpl: 'Buy Now Pay Later',
      medical: 'Medical Debt',
      mortgage: 'Mortgage',
    };
    return labels[type] || 'Debt';
  };

  return (
    <Card className="relative overflow-hidden border-red-500/15 bg-gradient-to-br from-red-500/[0.04] to-transparent">
      {/* Subtle danger glow */}
      <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-20"
        style={{ background: 'radial-gradient(circle at 100% 0%, rgba(239,68,68,0.3), transparent 70%)' }}
      />

      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
            <TrendingDown className="w-4.5 h-4.5 text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Monthly Interest Cost</h3>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">
              What your debt costs you each month in interest alone
            </p>
          </div>
        </div>

        {/* The big number — the screenshot moment */}
        <div className="text-center py-3">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-3xl sm:text-4xl font-bold text-red-400 tabular-nums tracking-tight">
              ${Math.round(monthlyTotal).toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground/60">/mo</span>
          </div>
          <p className="text-xs text-muted-foreground/50 mt-1">
            That's <span className="text-red-400/80 font-semibold">${Math.round(yearlyTotal).toLocaleString()}/year</span> going to interest
          </p>
        </div>

        {/* Breakdown by debt type */}
        {costlyDebts.length > 1 && (
          <div className="mt-4 pt-3 border-t border-white/[0.04] space-y-2">
            {costlyDebts
              .sort((a, b) => b.monthlyInterest - a.monthlyInterest)
              .slice(0, 4)
              .map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3 h-3 text-muted-foreground/40" />
                    <span className="text-muted-foreground">{formatDebtType(d.type)}</span>
                    <span className="text-muted-foreground/40">{d.apr}% APR</span>
                  </div>
                  <span className="font-semibold text-red-400/80 tabular-nums">
                    ${Math.round(d.monthlyInterest).toLocaleString()}/mo
                  </span>
                </div>
              ))}
          </div>
        )}

        {/* Motivational nudge */}
        <div className="mt-4 pt-3 border-t border-white/[0.04]">
          <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
            {worst.type === 'credit_card' || worst.type === 'payday'
              ? `Paying off your ${formatDebtType(worst.type).toLowerCase()} first could save you $${Math.round(worst.monthlyInterest * 12).toLocaleString()}/year.`
              : `Focus extra payments on your highest-APR debt to reduce this number fastest.`
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
