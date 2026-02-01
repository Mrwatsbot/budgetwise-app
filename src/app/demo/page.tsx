'use client';

import { useState } from 'react';
import { CubeNavigator } from '@/components/ui/cube-navigator';
import { IncomeOverview } from '@/components/budgets/income-overview';
import { AIInsightsPanel } from '@/components/budgets/ai-insights-panel';
import { BudgetHealthChart } from '@/components/budgets/budget-health-chart';
import { DemoBudgetGrid } from '@/components/budgets/demo-budget-grid';
import { FinancialHealthDisplay } from '@/components/score/financial-health-display';
import { calculateFinancialHealthScore } from '@/lib/scoring/financial-health-score';
import { AffordCheckDialog } from '@/components/budgets/afford-check-dialog';
import { AutoBudgetDialog } from '@/components/budgets/auto-budget-dialog';
import { 
  Wallet, TrendingDown, CreditCard, Sparkles,
  Search, Zap, FileText, MessageSquare, Trophy,
  Target, Flame, Gift, CheckCircle2,
  PencilLine, Ban
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

// Mock budgets
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

// Mock debts
const mockDebts = [
  { id: '1', name: 'Chase Sapphire', type: 'Credit Card', balance: 2847.32, apr: 24.99, minPayment: 85, color: '#3b82f6' },
  { id: '2', name: 'Student Loan', type: 'Loan', balance: 12450.00, apr: 5.5, minPayment: 250, color: '#22c55e' },
  { id: '3', name: 'Car Payment', type: 'Auto Loan', balance: 8920.00, apr: 6.9, minPayment: 320, color: '#1a7a6d' },
];

// Mock challenges
const mockChallenges = [
  { id: '1', title: 'No-Spend Weekend', description: 'Don\'t spend any money Saturday & Sunday', reward: '+15 pts', difficulty: 'Medium', active: true, progress: 1, total: 2 },
  { id: '2', title: 'Pack Lunch Week', description: 'Bring lunch from home 5 days', reward: '+20 pts', difficulty: 'Easy', active: true, progress: 3, total: 5 },
  { id: '3', title: 'Subscription Audit', description: 'Review and cancel 1 unused subscription', reward: '+25 pts', difficulty: 'Easy', active: false, progress: 0, total: 1 },
];

// Mock streaks
const mockStreaks = {
  budget: { current: 12, best: 23, iconName: 'target' },
  logging: { current: 45, best: 45, iconName: 'pencil-line' },
  noSpend: { current: 2, best: 5, iconName: 'ban' },
};

// Mock score input - calculated from the user's data
const mockScoreInput = {
  monthlyIncome: MONTHLY_INCOME,
  
  wealthContributions: {
    cashSavings: 200,
    retirement401k: 375,      // ~8% of income to 401k
    ira: 0,
    investments: 0,
    hsa: 75,
    extraDebtPayments: 200,   // Paying extra on credit card
  },
  
  liquidSavings: 8500,
  monthlyExpenses: 3200,
  
  currentDebts: [
    { type: 'credit_card' as const, balance: 2847.32, monthlyPayment: 285, apr: 24.99, inCollections: false },
    { type: 'student' as const, balance: 12450, monthlyPayment: 250, apr: 5.5, inCollections: false },
    { type: 'auto' as const, balance: 8920, monthlyPayment: 320, apr: 6.9, inCollections: false },
  ],
  debtsThreeMonthsAgo: [
    { type: 'credit_card' as const, balance: 4200, monthlyPayment: 285, apr: 24.99, inCollections: false },
    { type: 'student' as const, balance: 13100, monthlyPayment: 250, apr: 5.5, inCollections: false },
    { type: 'auto' as const, balance: 9800, monthlyPayment: 320, apr: 6.9, inCollections: false },
  ],
  
  billsPaidOnTime: 46,
  billsPaidLate1to30: 2,
  billsPaidLate31to60: 0,
  billsPaidLate61Plus: 0,
  
  budgetsOnTrack: 4,
  totalBudgets: 5,
  averageOverspendPercent: 18,
};

export default function DemoPage() {
  const [budgets, setBudgets] = useState(initialBudgets);

  const handleBudgetUpdate = (categoryId: string, newAmount: number) => {
    setBudgets(prev => prev.map(b => 
      b.categoryId === categoryId ? { ...b, budgeted: newAmount } : b
    ));
  };

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.budgeted, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalDebt = mockDebts.reduce((sum, d) => sum + d.balance, 0);

  // Face 1: Overview
  const OverviewFace = (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your financial overview</p>
      </div>
      
      <IncomeOverview 
        monthlyIncome={MONTHLY_INCOME}
        totalSpent={totalSpent}
        totalBudgeted={totalBudgeted}
      />
      
      <AIInsightsPanel 
        insights={mockInsights}
        onAnalyze={() => console.log('Analyzing...')}
        onFindSavings={() => console.log('Finding savings...')}
      />
      
      {/* AI Action: Can I Afford This? */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold">Smart Purchasing</h3>
            <p className="text-xs text-muted-foreground">AI-powered affordability check</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Thinking about a purchase? Let AI analyze if it fits your budget and suggest adjustments if needed.
        </p>
        <AffordCheckDialog 
          currentMonth={new Date().toISOString().split('T')[0]}
          onBudgetAdjusted={() => console.log('Budget adjusted in demo')}
        />
      </div>
    </div>
  );

  // Face 2: Budgets
  const BudgetsFace = (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h1 className="text-2xl font-bold">Budgets</h1>
        <p className="text-muted-foreground">Track your spending by category</p>
      </div>
      
      <BudgetHealthChart categoryBudgets={budgets} />
      
      {/* AI Auto Budget */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold">AI Budget Generator</h3>
            <p className="text-xs text-muted-foreground">Let AI create your budget in seconds</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Answer a few quick questions and AI will generate a personalized budget based on the 50/30/20 rule and your specific situation.
        </p>
        <AutoBudgetDialog 
          currentMonth={new Date().toISOString().split('T')[0]}
          onApplied={() => console.log('Budget applied in demo')}
          prominent={false}
        />
      </div>
      
      <DemoBudgetGrid 
        categoryBudgets={budgets} 
        onBudgetUpdate={handleBudgetUpdate}
      />
    </div>
  );

  // Face 3: Debts
  const DebtsFace = (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h1 className="text-2xl font-bold">Debts</h1>
        <p className="text-muted-foreground">Track and crush your debt</p>
      </div>

      {/* Total Debt Card */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Debt</p>
              <p className="text-2xl font-bold text-red-400">${totalDebt.toLocaleString()}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Debt-free in</p>
            <p className="text-xl font-bold text-[#7aba5c]">~18 months</p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Payoff progress</span>
            <span>32%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full w-[32%] rounded-full bg-gradient-to-r from-[#6db555] to-[#7aba5c]" />
          </div>
        </div>
      </div>

      {/* Debt List */}
      <div className="space-y-3">
        {mockDebts.map((debt) => (
          <div key={debt.id} className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${debt.color}20` }}
                >
                  <CreditCard className="w-5 h-5" style={{ color: debt.color }} />
                </div>
                <div>
                  <h3 className="font-medium">{debt.name}</h3>
                  <p className="text-xs text-muted-foreground">{debt.type} • {debt.apr}% APR</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold">${debt.balance.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">${debt.minPayment}/mo min</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full border-border">
              View Payoff Plan
            </Button>
          </div>
        ))}
      </div>

      {/* Strategy Toggle */}
      <div className="glass-card rounded-xl p-4">
        <p className="text-sm font-medium mb-3">Payoff Strategy</p>
        <div className="flex gap-2">
          <Button variant="default" size="sm" className="flex-1 shimmer-btn border-0">
            Avalanche (Save $)
          </Button>
          <Button variant="outline" size="sm" className="flex-1 border-border">
            Snowball (Wins)
          </Button>
        </div>
      </div>
    </div>
  );

  // Face 4: AI Actions
  const ActionsFace = (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h1 className="text-2xl font-bold">AI Actions</h1>
        <p className="text-muted-foreground">Let AI work for your wallet</p>
      </div>

      {/* Action Cards */}
      <div className="grid gap-4">
        <div className="glass-card rounded-xl p-6 hover:border-[#1a7a6d4d] transition-colors cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a7a6d33] to-[#146b5f33] border border-[#1a7a6d4d] flex items-center justify-center flex-shrink-0">
              <Search className="w-6 h-6 text-[#1a7a6d]" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Analyze Spending</h3>
              <p className="text-sm text-muted-foreground mb-3">AI reviews your transactions and identifies patterns, anomalies, and opportunities.</p>
              <Button className="shimmer-btn border-0">Run Analysis</Button>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 hover:border-[#1a7a6d4d] transition-colors cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6db555]/20 to-emerald-500/20 border border-[#6db555]/30 flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-[#7aba5c]" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Find Savings</h3>
              <p className="text-sm text-muted-foreground mb-3">Discover subscriptions you forgot about, duplicate charges, and potential negotiation targets.</p>
              <Button variant="outline" className="border-[#6db555]/30 text-[#7aba5c] hover:bg-[#6db555]/10">Scan Now</Button>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 hover:border-[#1a7a6d4d] transition-colors cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#5b8fd9]33 to-[#22a090]33 border border-[#5b8fd9]4d flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Analyze a Bill</h3>
              <p className="text-sm text-muted-foreground mb-3">Upload or select a recurring bill. AI researches competitors and drafts a negotiation script.</p>
              <Button variant="outline" className="border-[#5b8fd9]4d text-blue-400 hover:bg-blue-500/10">Select Bill</Button>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 hover:border-[#1a7a6d4d] transition-colors cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-600/20 to-teal-500/20 border border-teal-600/30 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-6 h-6 text-teal-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Ask Budget Pro</h3>
              <p className="text-sm text-muted-foreground mb-3">Chat with your AI budget professional about anything money-related.</p>
              <Button variant="outline" className="border-teal-600/30 text-teal-400 hover:bg-teal-600/10">Start Chat</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Calculate the score
  const healthScore = calculateFinancialHealthScore(mockScoreInput);

  // Face 5: Score & Challenges
  const ScoreFace = (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h1 className="text-2xl font-bold">Financial Health</h1>
        <p className="text-muted-foreground">Your score & challenges</p>
      </div>

      {/* Financial Health Score */}
      <FinancialHealthDisplay score={healthScore} previousScore={687} />

      {/* Streaks */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5 text-teal-400" />
          <span className="font-medium">Active Streaks</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(mockStreaks).map(([key, streak]) => {
            const iconMap: Record<string, LucideIcon> = { target: Target, 'pencil-line': PencilLine, ban: Ban };
            const StreakIcon = iconMap[streak.iconName] || Target;
            return (
              <div key={key} className="text-center p-3 rounded-lg bg-secondary/50">
                <StreakIcon className="w-6 h-6 mx-auto text-muted-foreground" />
                <p className="text-xl font-bold mt-1">{streak.current}</p>
                <p className="text-xs text-muted-foreground capitalize">{key}</p>
                {streak.current === streak.best && streak.current > 0 && (
                  <span className="text-xs text-yellow-400 flex items-center justify-center gap-1"><Trophy className="w-3 h-3 inline" /> Best!</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Challenges */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[#1a7a6d]" />
            <span className="font-medium">Active Challenges</span>
          </div>
          <Button variant="ghost" size="sm" className="text-[#1a7a6d] text-xs">
            View All
          </Button>
        </div>
        <div className="space-y-3">
          {mockChallenges.filter(c => c.active).map((challenge) => (
            <div key={challenge.id} className="p-3 rounded-lg bg-secondary/30 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{challenge.title}</span>
                <span className="text-xs text-[#7aba5c] font-medium">{challenge.reward}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{challenge.description}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-[#1a7a6d] to-[#6db555]"
                    style={{ width: `${(challenge.progress / challenge.total) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {challenge.progress}/{challenge.total}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Available Challenges */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="w-5 h-5 text-yellow-400" />
          <span className="font-medium">New Challenges</span>
        </div>
        <div className="space-y-3">
          {mockChallenges.filter(c => !c.active).map((challenge) => (
            <div key={challenge.id} className="p-3 rounded-lg bg-secondary/30 border border-border flex items-center justify-between">
              <div>
                <span className="font-medium text-sm">{challenge.title}</span>
                <p className="text-xs text-muted-foreground">{challenge.description}</p>
              </div>
              <Button size="sm" variant="outline" className="border-[#1a7a6d4d] text-[#1a7a6d] text-xs">
                Start
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const faces = [
    { id: 'overview', label: 'Overview', content: OverviewFace },
    { id: 'budgets', label: 'Budgets', content: BudgetsFace },
    { id: 'score', label: 'Score', content: ScoreFace },
    { id: 'debts', label: 'Debts', content: DebtsFace },
    { id: 'actions', label: 'AI', content: ActionsFace },
  ];

  return (
    <div className="bg-background" style={{ minHeight: '100dvh' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-btn flex items-center justify-center">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold">Thallo</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-[#1a7a6d33] text-[#1a7a6d]">Demo Mode</span>
          </div>
        </div>
      </header>

      {/* Cube Navigator */}
      <CubeNavigator faces={faces} />
    </div>
  );
}
