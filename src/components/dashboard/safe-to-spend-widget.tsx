'use client';

import { useState } from 'react';
import { ShoppingBag, TrendingUp, Info } from 'lucide-react';
import { AffordCheckDialog } from '@/components/budgets/afford-check-dialog';
import { getAllocationBarStyle } from '@/lib/bar-colors';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SafeToSpendWidgetProps {
  monthlyIncome: number;
  totalBudgeted: number;
  monthlyExpenses: number;
  currentMonth: string;
  onBudgetAdjusted?: () => void;
}

export function SafeToSpendWidget({
  monthlyIncome,
  totalBudgeted,
  monthlyExpenses,
  currentMonth,
  onBudgetAdjusted,
}: SafeToSpendWidgetProps) {
  // Calculate safe to spend amount
  // Formula: Income - Total Budgeted = Available
  // Then: Available - Already Spent on discretionary = Safe to Spend
  const allocated = totalBudgeted;
  const unallocated = monthlyIncome - totalBudgeted;
  const safeToSpend = Math.max(0, unallocated);
  
  // Calculate percentage of income that's safe to spend
  const safePercent = monthlyIncome > 0 ? (safeToSpend / monthlyIncome) * 100 : 0;
  
  // Determine status
  const isHealthy = safePercent >= 20;
  const isModerate = safePercent >= 10 && safePercent < 20;
  const isLow = safePercent < 10;

  const statusConfig = isHealthy
    ? { color: 'text-[#7aba5c]', bgGradient: 'from-[#6db555]/20 to-emerald-500/20', border: 'border-[#6db555]/30' }
    : isModerate
    ? { color: 'text-teal-400', bgGradient: 'from-teal-500/20 to-yellow-500/20', border: 'border-teal-500/30' }
    : { color: 'text-red-400', bgGradient: 'from-red-500/20 to-pink-500/20', border: 'border-red-500/30' };

  if (monthlyIncome === 0) return null;

  return (
    <div className={`glass-card rounded-xl p-5 border ${statusConfig.border} relative overflow-hidden group hover:shadow-lg transition-all`}>
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${statusConfig.bgGradient} opacity-30 group-hover:opacity-40 transition-opacity`} />
      
      {/* Content */}
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${statusConfig.bgGradient} border ${statusConfig.border} flex items-center justify-center`}>
              <ShoppingBag className={`w-6 h-6 ${statusConfig.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base">Safe to Spend</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="text-xs">
                        Your unallocated income this month. This is money not assigned to any budget category - safe for impulse purchases or unexpected expenses.
                      </p>
                      <p className="text-xs mt-2 text-muted-foreground">
                        Income (${monthlyIncome.toLocaleString()}) - Budgets (${totalBudgeted.toLocaleString()}) = ${safeToSpend.toLocaleString()}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-muted-foreground">Unallocated this month</p>
            </div>
          </div>
        </div>

        {/* Amount display */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold ${statusConfig.color}`}>
              ${safeToSpend.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-sm text-muted-foreground">
              ({safePercent.toFixed(0)}% of income)
            </span>
          </div>
          
          {/* Status message */}
          <p className="text-xs text-muted-foreground mt-2">
            {isHealthy && "Great cushion! You have flexibility for unexpected expenses."}
            {isModerate && "Decent buffer. Consider saving some for emergencies."}
            {isLow && "Tight budget. Be careful with discretionary spending."}
          </p>
        </div>

        {/* Visual breakdown - Gradient */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Budget allocation</span>
            <span className="font-medium">
              {Math.min((totalBudgeted / monthlyIncome) * 100, 100).toFixed(0)}% allocated
            </span>
          </div>
          <div className="h-2 rounded-full bg-border/10 overflow-hidden progress-bar-container">
            <div
              className="h-full rounded-full transition-all"
              style={{ 
                width: `${Math.min((totalBudgeted / monthlyIncome) * 100, 100)}%`,
                ...getAllocationBarStyle(Math.min((totalBudgeted / monthlyIncome) * 100, 100)),
              }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#6db555]">Flexible</span>
            <span className="text-[#1a7a6d]">Fully allocated</span>
          </div>
        </div>

        {/* CTA Button */}
        <AffordCheckDialog
          currentMonth={currentMonth}
          onBudgetAdjusted={onBudgetAdjusted}
        />
      </div>
    </div>
  );
}
