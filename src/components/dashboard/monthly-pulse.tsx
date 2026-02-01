'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Check, X, Loader2, TrendingUp, TrendingDown, CheckCircle, AlertTriangle } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { toast } from 'sonner';
import { AffordCheckDialog } from '@/components/budgets/afford-check-dialog';

interface MonthlyPulseProps {
  monthlyIncome: number;
  totalBudgeted: number;
  monthlyExpenses: number;
  currentMonth: string;
  editingIncome: boolean;
  setEditingIncome: (editing: boolean) => void;
  incomeValue: string;
  setIncomeValue: (value: string) => void;
  savingIncome: boolean;
  handleSaveIncome: () => Promise<void>;
  onBudgetAdjusted: () => void;
  totalBalance?: number;
  accountCount?: number;
}

export function MonthlyPulse({
  monthlyIncome,
  totalBudgeted,
  monthlyExpenses,
  currentMonth,
  editingIncome,
  setEditingIncome,
  incomeValue,
  setIncomeValue,
  savingIncome,
  handleSaveIncome,
  onBudgetAdjusted,
  totalBalance,
  accountCount,
}: MonthlyPulseProps) {
  // Calculate "Left to Spend"
  const leftToSpend = totalBudgeted - monthlyExpenses;
  
  // Pace calculations
  const date = new Date(currentMonth);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const dayOfMonth = new Date().getDate();
  const expectedPace = (dayOfMonth / daysInMonth) * 100;
  const actualPace = totalBudgeted > 0 ? (monthlyExpenses / totalBudgeted) * 100 : 0;
  const isOnTrack = actualPace <= expectedPace + 5; // 5% buffer
  const isAhead = actualPace > expectedPace + 5;
  
  // Color logic for "Left to Spend"
  const getLeftToSpendColor = () => {
    const percentRemaining = totalBudgeted > 0 ? (leftToSpend / totalBudgeted) * 100 : 0;
    if (leftToSpend < 0) return 'text-red-500'; // Over budget
    if (percentRemaining > 40) return 'text-[#7aba5c]'; // Healthy
    if (percentRemaining > 20) return 'text-yellow-500'; // Moderate
    return 'text-orange-500'; // Low
  };

  const handleEditIncome = () => {
    setIncomeValue(monthlyIncome > 0 ? monthlyIncome.toString() : '');
    setEditingIncome(true);
  };

  return (
    <div className="glass-card rounded-xl p-5 sm:p-6">
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-lg font-semibold mb-1">Monthly Pulse</h2>
        <p className="text-sm text-muted-foreground">{new Date(currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Hero: Left to Spend */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-2">Left to Spend</p>
        <div className={`text-5xl font-bold tabular-nums mb-1 ${getLeftToSpendColor()}`}>
          ${leftToSpend >= 0 ? leftToSpend.toLocaleString('en-US', { minimumFractionDigits: 2 }) : `-${Math.abs(leftToSpend).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
        </div>
        {leftToSpend < 0 && (
          <p className="text-sm text-red-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            Over budget this month
          </p>
        )}
      </div>

      {/* Pace Indicator */}
      <div className="mb-5 p-4 rounded-lg bg-secondary/30 border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">
            Day {dayOfMonth} of {daysInMonth}: spent {actualPace.toFixed(0)}% of budget
          </p>
          {isOnTrack ? (
            <span className="text-[#7aba5c] flex items-center gap-1 text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              On track
            </span>
          ) : (
            <span className="text-orange-500 flex items-center gap-1 text-sm font-medium">
              <AlertTriangle className="w-4 h-4" />
              Ahead of pace
            </span>
          )}
        </div>
        
        {/* Visual pace bar */}
        <div className="relative h-3 rounded-full bg-border/10 overflow-hidden">
          {/* Expected pace marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/40 z-10"
            style={{ left: `${Math.min(expectedPace, 100)}%` }}
          />
          {/* Actual spending */}
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(actualPace, 100)}%`,
              backgroundColor: isOnTrack ? '#7aba5c' : isAhead ? '#f97316' : '#ef4444',
            }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
          <span>Expected: {expectedPace.toFixed(0)}%</span>
          <span>Actual: {actualPace.toFixed(0)}%</span>
        </div>
      </div>

      {/* Income (secondary, editable) */}
      <div className="mb-5 pb-5 border-b border-border/50">
        {editingIncome ? (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={incomeValue}
                onChange={(e) => setIncomeValue(e.target.value)}
                className="pl-7 bg-secondary/50 border-border h-9 text-sm"
                placeholder="5,000.00"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveIncome()}
              />
            </div>
            <Button
              size="icon"
              className="gradient-btn border-0 h-9 w-9"
              onClick={handleSaveIncome}
              disabled={savingIncome}
            >
              {savingIncome ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="border-border h-9 w-9"
              onClick={() => setEditingIncome(false)}
              disabled={savingIncome}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Income:</span>
              <span className="font-medium text-foreground">
                ${monthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}/mo
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={handleEditIncome}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-lg bg-secondary/20 border border-border/30 p-3">
          <p className="text-xs text-muted-foreground mb-0.5">Budgeted</p>
          <p className="text-lg font-semibold text-[#1a7a6d]">
            ${totalBudgeted.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="rounded-lg bg-secondary/20 border border-border/30 p-3">
          <p className="text-xs text-muted-foreground mb-0.5">Spent</p>
          <p className="text-lg font-semibold">
            ${monthlyExpenses.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="rounded-lg bg-secondary/20 border border-border/30 p-3">
          <p className="text-xs text-muted-foreground mb-0.5">Remaining</p>
          <p className={`text-lg font-semibold ${leftToSpend >= 0 ? 'text-[#7aba5c]' : 'text-red-500'}`}>
            ${leftToSpend >= 0 ? leftToSpend.toLocaleString('en-US', { maximumFractionDigits: 0 }) : `-${Math.abs(leftToSpend).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          </p>
        </div>
        {totalBalance !== undefined && (
          <div className="rounded-lg bg-secondary/20 border border-border/30 p-3">
            <p className="text-xs text-muted-foreground mb-0.5">Total Balance</p>
            <p className="text-lg font-semibold">
              ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            {accountCount !== undefined && accountCount > 0 && (
              <p className="text-[10px] text-muted-foreground">{accountCount} account{accountCount !== 1 ? 's' : ''}</p>
            )}
          </div>
        )}
      </div>

      {/* Can I Afford? Button */}
      <AffordCheckDialog
        currentMonth={currentMonth}
        onBudgetAdjusted={onBudgetAdjusted}
      />
    </div>
  );
}
