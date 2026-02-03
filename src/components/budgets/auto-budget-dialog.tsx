'use client';

import { useState } from 'react';
import {
  DollarSign,
  Home,
  Zap,
  Target,
  Sparkles,
  Check,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Lock,
  Gauge,
  PiggyBank,
  GraduationCap,
  Car as CarIcon,
  Heart,
  Plane,
  Shield,
  TrendingUp,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { requestAutoBudget, applyAutoBudget, useAILimits } from '@/lib/hooks/use-data';
import { useIsDemo } from '@/lib/demo-mode';
import { DEMO_AUTO_BUDGET_RESPONSE } from '@/lib/demo-ai-responses';

// ============================================================
// TYPES
// ============================================================

interface Allocation {
  category_name: string;
  category_id?: string;
  amount: number;
  reasoning: string;
}

interface SavingsGoalAllocation {
  goal_name: string;
  goal_id: string;
  monthly_contribution: number;
  reasoning: string;
}

interface BudgetResult {
  monthly_income: number;
  allocations: Allocation[];
  savings_goal_allocations?: SavingsGoalAllocation[];
  summary: {
    total_needs: number;
    total_wants: number;
    total_savings_debt: number;
    needs_pct: number;
    wants_pct: number;
    savings_debt_pct: number;
  };
  notes: string;
}

interface SavingsGoalProp {
  id: string;
  name: string;
  type: string;
  monthly_contribution: number;
  current_amount: number;
  target_amount: number | null;
}

interface AutoBudgetDialogProps {
  currentMonth: string;
  onApplied?: () => void;
  prominent?: boolean;
  savingsGoals?: SavingsGoalProp[];  // renamed internally to avoid collision with form state
}

type SavingsPriority = 'aggressive' | 'moderate' | 'relaxed';
type EmergencyFundStatus = 'yes' | 'no' | 'building';
type SavingsGoal = 
  | 'emergency_fund'
  | 'house'
  | 'wedding'
  | 'car'
  | 'kids_education'
  | 'vacation'
  | 'retirement'
  | 'other';

// ============================================================
// HELPERS
// ============================================================

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const STEPS = ['Income', 'Fixed Costs', 'Savings', 'Context', 'Results'];

const PRIORITY_OPTIONS: { value: SavingsPriority; label: string; desc: string; icon: typeof Target }[] = [
  { value: 'aggressive', label: 'Aggressive', desc: 'Maximize savings', icon: Zap },
  { value: 'moderate', label: 'Moderate', desc: 'Balanced approach', icon: Target },
  { value: 'relaxed', label: 'Relaxed', desc: 'More flexibility', icon: DollarSign },
];

const SAVINGS_GOAL_OPTIONS: { value: SavingsGoal; label: string; icon: typeof PiggyBank }[] = [
  { value: 'emergency_fund', label: 'Emergency fund', icon: Shield },
  { value: 'house', label: 'House down payment', icon: Home },
  { value: 'wedding', label: 'Wedding', icon: Heart },
  { value: 'car', label: 'Car', icon: CarIcon },
  { value: 'kids_education', label: 'Kids/education', icon: GraduationCap },
  { value: 'vacation', label: 'Vacation', icon: Plane },
  { value: 'retirement', label: 'Retirement', icon: TrendingUp },
  { value: 'other', label: 'Other', icon: Plus },
];

// ============================================================
// COMPONENT
// ============================================================

export function AutoBudgetDialog({ currentMonth, onApplied, prominent = false, savingsGoals: existingSavingsGoals = [] }: AutoBudgetDialogProps) {
  const isDemo = useIsDemo();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BudgetResult | null>(null);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);

  // Form state
  const [income, setIncome] = useState('');
  const [rent, setRent] = useState('');
  const [utilities, setUtilities] = useState('');
  const [insurance, setInsurance] = useState('');
  const [carPayment, setCarPayment] = useState('');
  const [otherFixed, setOtherFixed] = useState('');
  const [hasDebts, setHasDebts] = useState(false);
  const [savingsPriority, setSavingsPriority] = useState<SavingsPriority>('moderate');
  const [lifestyleNotes, setLifestyleNotes] = useState('');
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [emergencyFundStatus, setEmergencyFundStatus] = useState<EmergencyFundStatus>('no');
  const [currentSavingsContribution, setCurrentSavingsContribution] = useState('');
  const [otherSavingsGoal, setOtherSavingsGoal] = useState('');

  const { tier, features, refresh: refreshLimits } = useAILimits();
  const isFree = tier === 'free' || tier === 'basic';
  const budgetLimits = features?.auto_budget;
  const isUnlimited = budgetLimits?.limit === -1;
  const remainingUses = budgetLimits?.remaining ?? 0;
  const totalLimit = budgetLimits?.limit ?? 0;

  const resetForm = () => {
    setStep(0);
    setIncome('');
    setRent('');
    setUtilities('');
    setInsurance('');
    setCarPayment('');
    setOtherFixed('');
    setHasDebts(false);
    setSavingsPriority('moderate');
    setLifestyleNotes('');
    setSavingsGoals([]);
    setEmergencyFundStatus('no');
    setCurrentSavingsContribution('');
    setOtherSavingsGoal('');
    setResult(null);
    setError(null);
    setRateLimitMessage(null);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setRateLimitMessage(null);
    setStep(4);

    try {
      // DEMO MODE: Use mock response instead of API
      if (isDemo) {
        // Simulate loading delay for realism
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Map demo response to expected format
        const mockResult: BudgetResult = {
          monthly_income: parseFloat(income) || 4500,
          allocations: DEMO_AUTO_BUDGET_RESPONSE.allocations.map(a => ({
            category_name: a.category,
            amount: a.amount,
            reasoning: a.reason,
          })),
          summary: {
            total_needs: 1640,
            total_wants: 665,
            total_savings_debt: 750,
            needs_pct: 53,
            wants_pct: 22,
            savings_debt_pct: 25,
          },
          notes: 'This is a demo budget based on sample data. Sign up to get a personalized budget based on YOUR income and expenses.',
        };
        
        setResult(mockResult);
        setLoading(false);
        return;
      }

      // REAL MODE: Call API
      const fixedExpenses: Record<string, number> = {};
      if (rent) fixedExpenses.rent = parseFloat(rent);
      if (utilities) fixedExpenses.utilities = parseFloat(utilities);
      if (insurance) fixedExpenses.insurance = parseFloat(insurance);
      if (carPayment) fixedExpenses.car_payment = parseFloat(carPayment);
      if (otherFixed) fixedExpenses.other = parseFloat(otherFixed);

      const response = await requestAutoBudget({
        monthly_income: parseFloat(income),
        fixed_expenses: fixedExpenses,
        has_debts: hasDebts,
        savings_priority: savingsPriority,
        lifestyle_notes: lifestyleNotes || undefined,
        savings_goals: savingsGoals.length > 0 ? savingsGoals : undefined,
        emergency_fund_status: emergencyFundStatus,
        current_savings_contribution: currentSavingsContribution 
          ? parseFloat(currentSavingsContribution) 
          : undefined,
        other_savings_goal: otherSavingsGoal || undefined,
      });

      if (response.result) {
        setResult(response.result);
        refreshLimits();
      } else {
        setError(response.error || 'Failed to generate budget');
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('429')) {
        setRateLimitMessage('You\'ve used all your auto budget generations for this month. Upgrade to Pro for unlimited access.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to generate budget');
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
      // Fetch real categories from the DB so we can resolve AI names → real IDs
      let realCategories: { id: string; name: string; type: string }[] = [];
      try {
        const catRes = await fetch('/api/budgets?month=' + currentMonth);
        if (catRes.ok) {
          const catData = await catRes.json();
          realCategories = catData.categories || [];
        }
      } catch { /* fallback to server-side resolution */ }

      // Build lookup maps for client-side resolution
      const catByExactName = new Map(realCategories.map(c => [c.name.toLowerCase().trim(), c.id]));
      
      // Fuzzy match: find best category by checking if name contains/is contained
      const fuzzyResolve = (aiName: string): string | null => {
        const needle = aiName.toLowerCase().trim();
        // Exact match first
        if (catByExactName.has(needle)) return catByExactName.get(needle)!;
        // Check if AI name contains a real category name or vice versa
        for (const [realName, realId] of catByExactName) {
          if (needle.includes(realName) || realName.includes(needle)) return realId;
        }
        // Word overlap: find category with most matching words
        const aiWords = needle.split(/[\s&,/]+/).filter(w => w.length > 2);
        let bestMatch: { id: string; score: number } | null = null;
        for (const [realName, realId] of catByExactName) {
          const realWords = realName.split(/[\s&,/]+/).filter(w => w.length > 2);
          const overlap = aiWords.filter(w => realWords.some(rw => rw.includes(w) || w.includes(rw))).length;
          if (overlap > 0 && (!bestMatch || overlap > bestMatch.score)) {
            bestMatch = { id: realId, score: overlap };
          }
        }
        return bestMatch?.id || null;
      };

      const allocations = result.allocations
        .filter((a) => (a.category_id || a.category_name) && a.amount > 0)
        .map((a) => {
          // Always resolve by name first (AI IDs are unreliable)
          const resolvedId = a.category_name ? fuzzyResolve(a.category_name) : null;
          return {
            category_id: resolvedId || a.category_id || null,
            category_name: a.category_name,
            amount: a.amount,
          };
        });

      // Prepare savings goal allocations
      const savingsAllocations = (result.savings_goal_allocations || [])
        .filter((s) => s.goal_id && s.monthly_contribution >= 0)
        .map((s) => ({
          goal_id: s.goal_id,
          monthly_contribution: s.monthly_contribution,
        }));

      await applyAutoBudget(allocations, currentMonth, savingsAllocations.length > 0 ? savingsAllocations : undefined);
      onApplied?.();
      setOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply budget');
    } finally {
      setApplying(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return !!income && parseFloat(income) > 0;
    return true;
  };

  const handleNext = () => {
    if (step === 3) {
      handleGenerate();
    } else {
      setStep((s) => Math.min(s + 1, 4));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        {prominent ? (
          <button className="w-full glass-card rounded-xl p-6 text-left hover:border-[#1a7a6d4d] transition-colors group cursor-pointer border border-transparent">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#1a7a6d33] to-[#146b5f33] border border-[#1a7a6d4d] flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-[#1a7a6d]" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold group-hover:text-[#1a7a6d] transition-colors">
                  Let AI set up your budget in 60 seconds
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Answer a few questions and get a personalized budget based on the 50/30/20 rule
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-[#1a7a6d] transition-colors" />
            </div>
          </button>
        ) : (
          <Button size="sm" className="shimmer-btn-outline border-0 px-4 py-2 rounded-lg">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Auto Budget
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-background border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#1a7a6d]" />
            AI Auto Budget
          </DialogTitle>
        </DialogHeader>

        {/* Tier gate for free users */}
        {isFree ? (
          <div className="relative">
            <div className="blur-sm select-none pointer-events-none space-y-4 py-4">
              <div className="h-10 bg-muted/30 rounded-lg" />
              <div className="h-10 bg-muted/30 rounded-lg" />
              <div className="h-10 bg-muted/30 rounded-lg" />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg">
              <Lock className="w-8 h-8 text-[#1a7a6d] mb-3" />
              <p className="text-sm font-semibold mb-1">Unlock AI Auto Budget</p>
              <p className="text-xs text-muted-foreground mb-3">Upgrade to Plus for AI-powered budget generation</p>
              <Button size="sm" className="gradient-btn border-0" asChild>
                <a href="/settings">
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  Upgrade to Plus
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-2">
              {STEPS.map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    i < step ? 'bg-[#1a7a6d] text-white' :
                    i === step ? 'bg-[#1a7a6d33] text-[#1a7a6d] border border-[#1a7a6d80]' :
                    'bg-muted/30 text-muted-foreground'
                  }`}>
                    {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`w-6 h-px transition-colors ${i < step ? 'bg-[#1a7a6d]' : 'bg-border'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step 0: Income */}
            {step === 0 && (
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-[#1a7a6d]" />
                  <h3 className="text-sm font-semibold">What&apos;s your monthly take-home income?</h3>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auto-income">Monthly Income</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                    <Input
                      id="auto-income"
                      type="number"
                      min="0"
                      step="100"
                      placeholder="5,000"
                      value={income}
                      onChange={(e) => setIncome(e.target.value)}
                      className="pl-7 text-lg h-12"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">After taxes — the amount deposited into your account</p>
                </div>
              </div>
            )}

            {/* Step 1: Fixed Expenses */}
            {step === 1 && (
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-3 mb-2">
                  <Home className="w-5 h-5 text-[#1a7a6d]" />
                  <h3 className="text-sm font-semibold">What are your fixed monthly costs?</h3>
                </div>
                <p className="text-xs text-muted-foreground">All fields are optional — skip what doesn&apos;t apply</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="auto-rent" className="text-xs">Rent / Mortgage</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input id="auto-rent" type="number" min="0" step="50" placeholder="0" value={rent} onChange={(e) => setRent(e.target.value)} className="pl-7" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="auto-util" className="text-xs">Utilities</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input id="auto-util" type="number" min="0" step="10" placeholder="0" value={utilities} onChange={(e) => setUtilities(e.target.value)} className="pl-7" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="auto-ins" className="text-xs">Insurance</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input id="auto-ins" type="number" min="0" step="10" placeholder="0" value={insurance} onChange={(e) => setInsurance(e.target.value)} className="pl-7" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="auto-car" className="text-xs">Car Payment</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input id="auto-car" type="number" min="0" step="50" placeholder="0" value={carPayment} onChange={(e) => setCarPayment(e.target.value)} className="pl-7" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="auto-other" className="text-xs">Other Fixed Costs</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input id="auto-other" type="number" min="0" step="10" placeholder="0" value={otherFixed} onChange={(e) => setOtherFixed(e.target.value)} className="pl-7" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Savings Goals */}
            {step === 2 && (
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-3 mb-2">
                  <PiggyBank className="w-5 h-5 text-[#1a7a6d]" />
                  <h3 className="text-sm font-semibold">Savings & Goals</h3>
                </div>

                {/* Emergency fund status */}
                <div className="space-y-2">
                  <Label className="text-xs">Do you have an emergency fund?</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setEmergencyFundStatus('yes')}
                      className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        emergencyFundStatus === 'yes'
                          ? 'border-[#1a7a6d80] bg-[#1a7a6d1a] text-[#1a7a6d]'
                          : 'border-border bg-muted/10 text-muted-foreground hover:bg-muted/20'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmergencyFundStatus('building')}
                      className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        emergencyFundStatus === 'building'
                          ? 'border-[#1a7a6d80] bg-[#1a7a6d1a] text-[#1a7a6d]'
                          : 'border-border bg-muted/10 text-muted-foreground hover:bg-muted/20'
                      }`}
                    >
                      Building one
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmergencyFundStatus('no')}
                      className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        emergencyFundStatus === 'no'
                          ? 'border-[#1a7a6d80] bg-[#1a7a6d1a] text-[#1a7a6d]'
                          : 'border-border bg-muted/10 text-muted-foreground hover:bg-muted/20'
                      }`}
                    >
                      No
                    </button>
                  </div>
                  {emergencyFundStatus === 'no' && (
                    <p className="text-xs text-muted-foreground">We&apos;ll prioritize building 3-6 months of expenses</p>
                  )}
                </div>

                {/* Savings goals */}
                <div className="space-y-2">
                  <Label className="text-xs">Are you saving for anything big? (select all that apply)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SAVINGS_GOAL_OPTIONS.map((goal) => {
                      const Icon = goal.icon;
                      const isSelected = savingsGoals.includes(goal.value);
                      return (
                        <button
                          key={goal.value}
                          type="button"
                          onClick={() => {
                            setSavingsGoals((prev) =>
                              isSelected
                                ? prev.filter((g) => g !== goal.value)
                                : [...prev, goal.value]
                            );
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            isSelected
                              ? 'border-[#1a7a6d80] bg-[#1a7a6d1a] text-[#1a7a6d]'
                              : 'border-border bg-muted/10 text-muted-foreground hover:bg-muted/20'
                          }`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{goal.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {savingsGoals.includes('other') && (
                    <Input
                      placeholder="What are you saving for?"
                      value={otherSavingsGoal}
                      onChange={(e) => setOtherSavingsGoal(e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>

                {/* Current savings contribution */}
                <div className="space-y-2">
                  <Label htmlFor="current-savings" className="text-xs">
                    Current monthly savings/investments? (optional)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      id="current-savings"
                      type="number"
                      min="0"
                      step="10"
                      placeholder="0"
                      value={currentSavingsContribution}
                      onChange={(e) => setCurrentSavingsContribution(e.target.value)}
                      className="pl-7"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Already contributing to 401k, IRA, or savings outside Thallo
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Financial Context */}
            {step === 3 && (
              <div className="space-y-5 py-2">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-5 h-5 text-[#1a7a6d]" />
                  <h3 className="text-sm font-semibold">A few more details</h3>
                </div>

                {/* Debts toggle */}
                <div className="space-y-2">
                  <Label className="text-xs">Do you have debts you&apos;re paying off?</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setHasDebts(true)}
                      className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        hasDebts
                          ? 'border-[#1a7a6d80] bg-[#1a7a6d1a] text-[#1a7a6d]'
                          : 'border-border bg-muted/10 text-muted-foreground hover:bg-muted/20'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasDebts(false)}
                      className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        !hasDebts
                          ? 'border-[#1a7a6d80] bg-[#1a7a6d1a] text-[#1a7a6d]'
                          : 'border-border bg-muted/10 text-muted-foreground hover:bg-muted/20'
                      }`}
                    >
                      No
                    </button>
                  </div>
                  {hasDebts && (
                    <p className="text-xs text-muted-foreground">We&apos;ll factor in your tracked debts automatically</p>
                  )}
                </div>

                {/* Savings priority */}
                <div className="space-y-2">
                  <Label className="text-xs">Savings priority</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {PRIORITY_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSavingsPriority(opt.value)}
                          className={`p-3 rounded-lg border text-center transition-colors ${
                            savingsPriority === opt.value
                              ? 'border-[#1a7a6d80] bg-[#1a7a6d1a]'
                              : 'border-border bg-muted/10 hover:bg-muted/20'
                          }`}
                        >
                          <Icon className={`w-5 h-5 mx-auto mb-1.5 ${
                            savingsPriority === opt.value ? 'text-[#1a7a6d]' : 'text-muted-foreground'
                          }`} />
                          <p className={`text-xs font-medium ${
                            savingsPriority === opt.value ? 'text-[#1a7a6d]' : ''
                          }`}>{opt.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Lifestyle notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="auto-notes" className="text-xs">Anything else? (optional)</Label>
                  <Input
                    id="auto-notes"
                    placeholder="e.g. Single, no kids, love cooking at home"
                    value={lifestyleNotes}
                    onChange={(e) => setLifestyleNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Results */}
            {step === 4 && (
              <div className="space-y-4 py-2 w-full min-w-0 overflow-hidden">
                {rateLimitMessage ? (
                  <div className="text-center py-8">
                    <Gauge className="w-8 h-8 text-teal-400 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">{rateLimitMessage}</p>
                    <Button size="sm" className="gradient-btn border-0" asChild>
                      <a href="/settings">
                        <Sparkles className="w-4 h-4 mr-1.5" />
                        Upgrade to Pro
                      </a>
                    </Button>
                  </div>
                ) : loading ? (
                  <div className="text-center py-10">
                    <Loader2 className="w-8 h-8 text-[#1a7a6d] animate-spin mx-auto mb-3" />
                    <p className="text-sm font-medium">Crafting your budget...</p>
                    <p className="text-xs text-muted-foreground mt-1">Analyzing your finances and building allocations</p>
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
                    <div className="space-y-2 w-full min-w-0">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Budget Breakdown</h4>
                      <div className="flex gap-0.5 h-4 rounded-full overflow-hidden w-full">
                        <div
                          className="bg-blue-500 rounded-l-full transition-all min-w-[2px]"
                          style={{ width: `${result.summary.needs_pct}%` }}
                          title={`Needs: ${result.summary.needs_pct}%`}
                        />
                        <div
                          className="bg-[#1a7a6d] transition-all min-w-[2px]"
                          style={{ width: `${result.summary.wants_pct}%` }}
                          title={`Wants: ${result.summary.wants_pct}%`}
                        />
                        <div
                          className="bg-[#6db555] rounded-r-full transition-all min-w-[2px]"
                          style={{ width: `${result.summary.savings_debt_pct}%` }}
                          title={`Savings & Debt: ${result.summary.savings_debt_pct}%`}
                        />
                      </div>
                      <div className="flex flex-wrap justify-between gap-y-1 text-xs">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                          Needs {result.summary.needs_pct}%
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#1a7a6d] shrink-0" />
                          Wants {result.summary.wants_pct}%
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#6db555] shrink-0" />
                          Save {result.summary.savings_debt_pct}%
                        </span>
                      </div>
                    </div>

                    {/* Allocations List */}
                    <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                      {result.allocations
                        .filter((a) => a.amount > 0)
                        .sort((a, b) => b.amount - a.amount)
                        .map((alloc, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{alloc.category_name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{alloc.reasoning}</p>
                            </div>
                            <p className="text-sm font-semibold ml-3 flex-shrink-0">{formatCurrency(alloc.amount)}</p>
                          </div>
                        ))}

                      {/* Savings Goal Allocations */}
                      {result.savings_goal_allocations && result.savings_goal_allocations.length > 0 && (
                        <>
                          <div className="flex items-center gap-2 pt-2 pb-1">
                            <PiggyBank className="w-3.5 h-3.5 text-[#6db555]" />
                            <p className="text-xs font-semibold text-[#6db555] uppercase tracking-wide">Savings Goals</p>
                          </div>
                          {result.savings_goal_allocations.map((sg, idx) => (
                            <div key={`sg-${idx}`} className="flex items-center justify-between p-2.5 rounded-lg bg-[#6db555]/5 border border-[#6db555]/20">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{sg.goal_name}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{sg.reasoning}</p>
                              </div>
                              <p className="text-sm font-semibold ml-3 flex-shrink-0 text-[#6db555]">{formatCurrency(sg.monthly_contribution)}/mo</p>
                            </div>
                          ))}
                        </>
                      )}
                    </div>

                    {/* Notes */}
                    {result.notes && (
                      <p className="text-xs text-muted-foreground italic border-t border-border pt-3 break-words">
                        {result.notes}
                      </p>
                    )}

                    <p className="text-[11px] text-muted-foreground/60">
                      These are starting points — adjust as needed after applying.
                    </p>
                  </>
                ) : null}
              </div>
            )}

            {/* Remaining uses */}
            {!isUnlimited && totalLimit > 0 && step < 4 && (
              <p className="text-xs text-muted-foreground/70 text-center">
                {remainingUses} of {totalLimit} generations remaining this month
              </p>
            )}

            {/* Navigation */}
            <div className="flex gap-2 pt-2 border-t border-border">
              {step > 0 && step < 4 && (
                <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              {step < 4 && (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || (step === 3 && !isUnlimited && remainingUses <= 0)}
                  className="flex-1 gradient-btn border-0"
                >
                  {step === 3 ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Budget
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
              {step === 4 && result && !loading && (
                <>
                  {!isDemo && (
                    <>
                      <Button
                        variant="outline"
                        onClick={handleGenerate}
                        disabled={applying}
                        className="flex-1"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Regenerate
                      </Button>
                      <Button
                        onClick={handleApply}
                        disabled={applying}
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
                            Apply Budget
                          </>
                        )}
                      </Button>
                    </>
                  )}
                  {isDemo && (
                    <Button
                      variant="outline"
                      onClick={() => setStep(0)}
                      className="flex-1"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Try Different Inputs
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Disclaimer */}
            <p className="text-[10px] text-muted-foreground/50 text-center">
              For informational purposes only. Not financial advice.
            </p>

            {/* Demo Mode CTA */}
            {isDemo && result && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-[#1a7a6d1a] to-[#146b5f1a] border border-[#1a7a6d4d]">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-[#1a7a6d] mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold mb-1">Get Your Personalized Budget</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      This is a demo using sample data. Sign up to generate a custom budget based on YOUR actual income, expenses, and goals.
                    </p>
                    <Button size="sm" className="gradient-btn border-0" asChild>
                      <a href="/signup">
                        Sign Up Free
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
