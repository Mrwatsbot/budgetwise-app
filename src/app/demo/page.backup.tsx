'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { DemoBudgetGrid } from '@/components/budgets/demo-budget-grid';
import { BudgetHealthChart } from '@/components/budgets/budget-health-chart';
import { IncomeOverview } from '@/components/budgets/income-overview';
import { AIInsightsPanel } from '@/components/budgets/ai-insights-panel';

// Mock income
const MONTHLY_INCOME = 4500;

// Mock AI insights
const mockInsights = [
  { 
    id: '1', 
    type: 'warning' as const, 
    icon: 'trending' as const, 
    text: 'Shopping spending is up 34% compared to last month.',
    action: 'View breakdown'
  },
  { 
    id: '2', 
    type: 'tip' as const, 
    icon: 'calendar' as const, 
    text: "At your current pace, you'll hit your Food budget in ~6 days.",
    action: 'Adjust budget'
  },
  { 
    id: '3', 
    type: 'opportunity' as const, 
    icon: 'scissors' as const, 
    text: 'Found 3 subscriptions you might want to review ($47/mo).',
    action: 'Review subscriptions'
  },
];

// Mock data for demo - using Lucide icon names instead of emojis
const initialBudgets = [
  { categoryId: '1', categoryName: 'Food & Dining', categoryIcon: 'utensils', categoryColor: '#1a7a6d', budgeted: 500, spent: 342.50 },
  { categoryId: '2', categoryName: 'Transportation', categoryIcon: 'car', categoryColor: '#3b82f6', budgeted: 200, spent: 156.00 },
  { categoryId: '3', categoryName: 'Shopping', categoryIcon: 'shopping-bag', categoryColor: '#1a7a6d', budgeted: 300, spent: 425.99 },
  { categoryId: '4', categoryName: 'Entertainment', categoryIcon: 'film', categoryColor: '#ec4899', budgeted: 150, spent: 89.00 },
  { categoryId: '5', categoryName: 'Utilities', categoryIcon: 'zap', categoryColor: '#eab308', budgeted: 250, spent: 187.32 },
  { categoryId: '6', categoryName: 'Health', categoryIcon: 'heart-pulse', categoryColor: '#22c55e', budgeted: 0, spent: 45.00 },
  { categoryId: '7', categoryName: 'Subscriptions', categoryIcon: 'repeat', categoryColor: '#06b6d4', budgeted: 0, spent: 62.97 },
  { categoryId: '8', categoryName: 'Personal Care', categoryIcon: 'sparkles', categoryColor: '#f43f5e', budgeted: 0, spent: 0 },
];

export default function DemoPage() {
  const [budgets, setBudgets] = useState(initialBudgets);

  const handleBudgetUpdate = (categoryId: string, newAmount: number) => {
    setBudgets(prev => prev.map(b => 
      b.categoryId === categoryId ? { ...b, budgeted: newAmount } : b
    ));
  };

  // Calculate totals
  const totalBudgeted = budgets.reduce((sum, b) => sum + b.budgeted, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);

  const monthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const demoUser = {
    email: 'demo@thallo.app',
    full_name: 'Demo User',
  };

  return (
    <AppShell user={demoUser} isDemo>
      <div className="space-y-6">
        {/* Demo Banner */}
        <div className="bg-gradient-to-r from-[#1a7a6d33] to-[#146b5f33] border border-[#1a7a6d4d] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-[#22a090]">Demo Mode</p>
            <p className="text-sm text-muted-foreground">Try editing budgets! Changes are local only.</p>
          </div>
          <a href="/signup">
            <button className="px-4 py-2 rounded-lg gradient-btn border-0 text-sm font-medium">
              Create Real Account
            </button>
          </a>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Budgets</h1>
            <p className="text-muted-foreground">{monthName}</p>
          </div>
          
          {/* Summary Card */}
          <div className="glass-card rounded-xl px-6 py-4 flex items-center gap-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Budgeted</p>
              <p className="text-xl font-bold">${totalBudgeted.toFixed(2)}</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Spent</p>
              <p className={`text-xl font-bold ${totalSpent > totalBudgeted ? 'text-red-400' : 'text-[#7aba5c]'}`}>
                ${totalSpent.toFixed(2)}
              </p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className={`text-xl font-bold ${totalBudgeted - totalSpent < 0 ? 'text-red-400' : 'text-[#7aba5c]'}`}>
                ${(totalBudgeted - totalSpent).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Income Overview */}
        <IncomeOverview 
          monthlyIncome={MONTHLY_INCOME}
          totalSpent={totalSpent}
          totalBudgeted={totalBudgeted}
        />

        {/* AI Insights + Budget Health - Two Column */}
        <div className="grid gap-6 lg:grid-cols-2">
          <AIInsightsPanel 
            insights={mockInsights}
            onAnalyze={() => console.log('Analyzing...')}
            onFindSavings={() => console.log('Finding savings...')}
          />
          <BudgetHealthChart categoryBudgets={budgets} />
        </div>

        {/* Budget Grid */}
        <DemoBudgetGrid 
          categoryBudgets={budgets} 
          onBudgetUpdate={handleBudgetUpdate}
        />
      </div>
    </AppShell>
  );
}
