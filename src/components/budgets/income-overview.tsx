'use client';

import { Wallet, TrendingDown, PiggyBank, CircleDollarSign } from 'lucide-react';

interface IncomeOverviewProps {
  monthlyIncome: number;
  totalSpent: number;
  totalBudgeted: number;
}

export function IncomeOverview({ monthlyIncome, totalSpent, totalBudgeted }: IncomeOverviewProps) {
  const unallocated = monthlyIncome - totalBudgeted;
  const remaining = monthlyIncome - totalSpent;
  
  const spentPercentage = (totalSpent / monthlyIncome) * 100;
  const budgetedPercentage = (totalBudgeted / monthlyIncome) * 100;
  const unallocatedPercentage = (unallocated / monthlyIncome) * 100;

  return (
    <div className="glass-card rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Monthly Income</h2>
            <p className="text-2xl font-bold text-green-400">${monthlyIncome.toLocaleString()}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Safe to spend</p>
          <p className={`text-xl font-bold ${remaining > 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${remaining.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-4 rounded-full bg-secondary overflow-hidden flex">
        {/* Spent portion */}
        <div
          className="h-full bg-gradient-to-r from-[#e8922e] to-[#d4800f] transition-all"
          style={{ width: `${Math.min(spentPercentage, 100)}%` }}
        />
        {/* Budgeted but not spent */}
        <div
          className="h-full bg-[#e8922e4d] transition-all"
          style={{ width: `${Math.max(0, Math.min(budgetedPercentage - spentPercentage, 100 - spentPercentage))}%` }}
        />
        {/* Unallocated */}
        <div
          className="h-full bg-secondary transition-all"
          style={{ width: `${Math.max(0, unallocatedPercentage)}%` }}
        />
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#e8922e]" />
            <TrendingDown className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Spent</p>
            <p className="text-sm font-semibold">${totalSpent.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{spentPercentage.toFixed(0)}%</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#e8922e4d]" />
            <PiggyBank className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Budgeted</p>
            <p className="text-sm font-semibold">${totalBudgeted.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{budgetedPercentage.toFixed(0)}%</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-secondary border border-border" />
            <CircleDollarSign className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Unallocated</p>
            <p className="text-sm font-semibold">${Math.max(0, unallocated).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{Math.max(0, unallocatedPercentage).toFixed(0)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
