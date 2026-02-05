'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThalloLogo } from '@/components/ui/thallo-logo';
import {
  Target,
  Wallet,
  CreditCard,
  PiggyBank,
  Banknote,
  ArrowRight,
  ArrowLeft,
  Loader2,
  DollarSign,
  Sparkles,
  Trophy,
  Check,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SetupWizardProps {
  userId: string;
  preview?: boolean;
}

const QUICK_PICK_AMOUNTS = [3000, 4000, 5000, 6000, 8000];

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking', icon: Wallet },
  { value: 'savings', label: 'Savings', icon: PiggyBank },
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { value: 'cash', label: 'Cash', icon: Banknote },
];

/** Fallback 50/30/20 template when AI is unavailable */
function generateTemplateBudget(income: number) {
  return [
    { category_name: 'Housing', amount: Math.round(income * 0.28) },
    { category_name: 'Food & Dining', amount: Math.round(income * 0.12) },
    { category_name: 'Transportation', amount: Math.round(income * 0.10) },
    { category_name: 'Utilities', amount: Math.round(income * 0.05) },
    { category_name: 'Entertainment', amount: Math.round(income * 0.05) },
    { category_name: 'Shopping', amount: Math.round(income * 0.05) },
    { category_name: 'Health & Wellness', amount: Math.round(income * 0.05) },
    { category_name: 'Subscriptions', amount: Math.round(income * 0.03) },
    { category_name: 'Personal Care', amount: Math.round(income * 0.02) },
    { category_name: 'Savings', amount: Math.round(income * 0.15) },
    { category_name: 'Other', amount: Math.round(income * 0.10) },
  ];
}

export function SetupWizard({ userId, preview = false }: SetupWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 2: Income
  const [monthlyIncome, setMonthlyIncome] = useState('');

  // Step 3: Account
  const [accountType, setAccountType] = useState('checking');
  const [accountBalance, setAccountBalance] = useState('');

  // Step 4: AI Budget
  const [budgets, setBudgets] = useState<any[]>([]);
  const [generatingBudget, setGeneratingBudget] = useState(false);

  // Step 4: AI cost tracking
  const [aiCost, setAiCost] = useState<{ model: string; tokens_input: number; tokens_output: number; estimated_cost_usd: number } | null>(null);

  // Step 5: Score
  const [score, setScore] = useState<any>(null);
  const [animatedScore, setAnimatedScore] = useState(0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!preview) {
        // Reset existing data so wizard writes fresh
        setLoading(true);
        try {
          await fetch('/api/setup/reset', { method: 'POST' });
        } catch {
          // Non-blocking — if reset fails, wizard still continues
        }
        setLoading(false);
      }
      setStep(2);
    } else if (step === 2) {
      // Save income
      if (!monthlyIncome || parseFloat(monthlyIncome) <= 0) {
        toast.error('Please enter your monthly income');
        return;
      }
      if (preview) {
        setStep(3);
        return;
      }
      setLoading(true);
      try {
        const response = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ monthly_income: parseFloat(monthlyIncome) }),
        });
        if (!response.ok) throw new Error('Failed to save income');
        setStep(3);
      } catch (error) {
        toast.error('Failed to save income');
      } finally {
        setLoading(false);
      }
    } else if (step === 3) {
      // Create account
      if (!accountBalance || parseFloat(accountBalance) < 0) {
        toast.error('Please enter your account balance');
        return;
      }
      setLoading(true);
      
      if (preview) {
        // Preview mode — show mock budget data, skip writes
        setStep(4);
        setGeneratingBudget(true);
        const income = parseFloat(monthlyIncome);
        setTimeout(() => {
          setBudgets([
            { category_name: 'Housing', amount: Math.round(income * 0.30) },
            { category_name: 'Food & Dining', amount: Math.round(income * 0.10) },
            { category_name: 'Transportation', amount: Math.round(income * 0.08) },
            { category_name: 'Entertainment', amount: Math.round(income * 0.05) },
            { category_name: 'Subscriptions', amount: Math.round(income * 0.03) },
            { category_name: 'Shopping', amount: Math.round(income * 0.06) },
            { category_name: 'Health', amount: Math.round(income * 0.04) },
            { category_name: 'Savings', amount: Math.round(income * 0.15) },
            { category_name: 'Other', amount: Math.round(income * 0.05) },
          ]);
          setGeneratingBudget(false);
          setLoading(false);
        }, 1500);
        return;
      }
      
      try {
        const accountNames: Record<string, string> = {
          checking: 'Main Checking',
          savings: 'Savings',
          credit_card: 'Credit Card',
          cash: 'Cash',
        };
        
        const response = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: accountNames[accountType],
            type: accountType,
            balance: parseFloat(accountBalance),
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create account');
        }
        
        // Move to AI Budget step and generate budget
        setStep(4);
        setGeneratingBudget(true);
        
        const income = parseFloat(monthlyIncome);
        
        // Try AI budget first, fall back to template if it fails (rate limit, free tier, etc.)
        try {
          const budgetResponse = await fetch('/api/ai/auto-budget', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ monthly_income: income }),
          });
          
          if (!budgetResponse.ok) throw new Error('AI budget unavailable');
          const budgetData = await budgetResponse.json();
          
          const allocations = budgetData.result?.allocations || budgetData.allocations || [];
          if (allocations.length > 0) {
            setBudgets(allocations);
            if (budgetData.usage) {
              setAiCost(budgetData.usage);
            }
          } else {
            throw new Error('Empty allocations');
          }
        } catch {
          // Fallback: template budget based on 50/30/20 rule
          setBudgets(generateTemplateBudget(income));
        }
        
        setGeneratingBudget(false);
        
      } catch (error: any) {
        toast.error(error.message || 'Failed to create account');
        setLoading(false);
      }
    } else if (step === 4) {
      // Save budgets
      setLoading(true);
      
      const animateScore = (target: number) => {
        let current = 0;
        const duration = 2000;
        const increment = target / (duration / 16);
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            setAnimatedScore(target);
            clearInterval(timer);
          } else {
            setAnimatedScore(Math.floor(current));
          }
        }, 16);
      };
      
      if (preview) {
        setStep(5);
        setScore({ score: 420, level: 2 });
        animateScore(420);
        setLoading(false);
        return;
      }
      
      try {
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        // Save budgets — try but don't block on failure
        try {
          const response = await fetch('/api/ai/auto-budget', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              allocations: budgets,
              month,
            }),
          });
          const saveResult = await response.json();
          console.log('Budget save result:', saveResult);
        } catch (e) {
          console.warn('Budget save failed, continuing:', e);
        }
        
        // Move to score reveal
        setStep(5);
        
        // Fetch score — try but show default if it fails
        try {
          const scoreResponse = await fetch('/api/score');
          if (scoreResponse.ok) {
            const scoreData = await scoreResponse.json();
            setScore(scoreData);
            animateScore(scoreData.score || 420);
          } else {
            throw new Error('Score fetch failed');
          }
        } catch {
          // Show a reasonable default score
          setScore({ score: 350, level: 2 });
          animateScore(350);
        }
        
      } catch (error: any) {
        toast.error(error.message || 'Failed to complete setup');
        // Still advance to score with default
        setStep(5);
        setScore({ score: 350, level: 2 });
        animateScore(350);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1 && step < 4) {
      setStep(step - 1);
    }
  };

  const handleQuickPick = (amount: number) => {
    setMonthlyIncome(amount.toString());
  };

  const handleFinish = () => {
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-radial pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-2xl">
        {/* Progress bar */}
        {step < 5 && (
          <div className="mb-8">
            <div className="h-1.5 bg-secondary/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#1a7a6d] to-[#2aaa9a]"
                initial={{ width: '0%' }}
                animate={{ width: `${(step / 5) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Step {step} of 5
            </p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card rounded-2xl p-8 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-6 rounded-xl gradient-btn flex items-center justify-center">
                <ThalloLogo size="md" />
              </div>
              
              <h1 className="text-3xl font-bold mb-3">Welcome to Thallo</h1>
              <p className="text-lg text-muted-foreground mb-8">
                Let's get your financial health score in about 60 seconds
              </p>

              <div className="space-y-3 mb-8 text-left max-w-md mx-auto">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <DollarSign className="h-5 w-5 text-[#1a7a6d]" />
                  <span>Your monthly income</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Wallet className="h-5 w-5 text-[#1a7a6d]" />
                  <span>Your account balance</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Sparkles className="h-5 w-5 text-[#1a7a6d]" />
                  <span>A quick budget (AI does this)</span>
                </div>
              </div>

              <Button
                onClick={handleNext}
                size="lg"
                className="gradient-btn border-0 w-full max-w-xs"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Let's Go
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* Step 2: Monthly Income */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card rounded-2xl p-8"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-[#1a7a6d33] to-[#146b5f33] border border-[#1a7a6d4d] flex items-center justify-center">
                  <DollarSign className="h-8 w-8 text-[#1a7a6d]" />
                </div>
                <h2 className="text-2xl font-bold mb-2">How much do you make per month?</h2>
                <p className="text-muted-foreground">
                  Don't overthink it — a rough number works great.
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-6">
                <div>
                  <Label htmlFor="income" className="text-base mb-3 block">Monthly Income</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="income"
                      type="number"
                      step="100"
                      placeholder="4,500"
                      value={monthlyIncome}
                      onChange={(e) => setMonthlyIncome(e.target.value)}
                      className="pl-12 h-14 text-lg bg-secondary/50 border-border"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-3">Quick pick:</p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PICK_AMOUNTS.map((amount) => (
                      <Button
                        key={amount}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickPick(amount)}
                        className={cn(
                          'border-border hover:bg-secondary',
                          monthlyIncome === amount.toString() && 'border-[#1a7a6d] bg-[#1a7a6d1a]'
                        )}
                      >
                        {formatCurrency(amount)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="bg-secondary/30 border border-border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground flex items-start gap-2">
                    <Target className="h-4 w-4 mt-0.5 flex-shrink-0 text-[#1a7a6d]" />
                    <span>
                      This is your take-home pay (after taxes). Check your last bank deposit if unsure.
                    </span>
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={loading}
                    className="border-border hover:bg-secondary"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={loading || !monthlyIncome}
                    className="flex-1 gradient-btn border-0"
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Account Setup */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card rounded-2xl p-8"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-[#1a7a6d33] to-[#146b5f33] border border-[#1a7a6d4d] flex items-center justify-center">
                  <Wallet className="h-8 w-8 text-[#1a7a6d]" />
                </div>
                <h2 className="text-2xl font-bold mb-2">What's in your main account?</h2>
                <p className="text-muted-foreground">
                  Just your primary checking account is fine for now.
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-6">
                <div>
                  <Label className="text-base mb-3 block">Account type:</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {ACCOUNT_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setAccountType(type.value)}
                        className={cn(
                          'flex items-center gap-3 p-4 rounded-xl border transition-all text-left',
                          'hover:border-[#1a7a6d80] hover:bg-[#1a7a6d0d]',
                          accountType === type.value
                            ? 'border-[#1a7a6d80] bg-[#1a7a6d1a]'
                            : 'border-border bg-secondary/30'
                        )}
                      >
                        <type.icon className="h-5 w-5 text-[#1a7a6d]" />
                        <span className="font-medium">{type.label}</span>
                        {accountType === type.value && (
                          <Check className="h-4 w-4 ml-auto text-[#1a7a6d]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="balance" className="text-base mb-3 block">Current balance:</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="balance"
                      type="number"
                      step="0.01"
                      placeholder="2,340"
                      value={accountBalance}
                      onChange={(e) => setAccountBalance(e.target.value)}
                      className="pl-12 h-14 text-lg bg-secondary/50 border-border"
                    />
                  </div>
                </div>

                <div className="bg-secondary/30 border border-border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground flex items-start gap-2">
                    <Target className="h-4 w-4 mt-0.5 flex-shrink-0 text-[#1a7a6d]" />
                    <span>
                      Open your bank app and check — it takes 5 seconds.
                    </span>
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={loading}
                    className="border-border hover:bg-secondary"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={loading || !accountBalance}
                    className="flex-1 gradient-btn border-0"
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: AI Budget Magic */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card rounded-2xl p-8"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-[#1a7a6d33] to-[#146b5f33] border border-[#1a7a6d4d] flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-[#1a7a6d]" />
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  {generatingBudget ? 'Creating your personalized budget...' : 'Your Budget is Ready!'}
                </h2>
                {!generatingBudget && (
                  <p className="text-muted-foreground">
                    Based on {formatCurrency(parseFloat(monthlyIncome))}/month income, here's what Thallo recommends:
                  </p>
                )}
              </div>

              <div className="max-w-md mx-auto">
                {generatingBudget ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#1a7a6d]" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 mb-6">
                      {budgets.map((budget, index) => (
                        <motion.div
                          key={budget.category_name || budget.category || index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border"
                        >
                          <span className="font-medium">{budget.category_name || budget.category}</span>
                          <div className="text-right">
                            <span className="font-bold text-[#1a7a6d]">
                              {formatCurrency(budget.amount)}
                            </span>
                            <span className="text-sm text-muted-foreground ml-2">
                              ({Math.round((budget.amount / parseFloat(monthlyIncome)) * 100)}%)
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <div className="bg-secondary/30 border border-border rounded-lg p-4 mb-6">
                      <p className="text-sm text-muted-foreground text-center">
                        These are starting points — you can adjust everything later.
                      </p>
                      {aiCost && (
                        <p className="text-xs text-muted-foreground/60 text-center mt-2 font-mono">
                          {aiCost.model} · {aiCost.tokens_input} in / {aiCost.tokens_output} out · ${aiCost.estimated_cost_usd.toFixed(6)}
                        </p>
                      )}
                    </div>

                    <Button
                      onClick={handleNext}
                      disabled={loading}
                      size="lg"
                      className="w-full gradient-btn border-0"
                    >
                      {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                      Looks Good
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 5: Score Reveal */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-2xl p-8 text-center"
            >
              <h2 className="text-2xl font-bold mb-8">Your Financial Health Score</h2>

              <div className="relative w-48 h-48 mx-auto mb-6">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-secondary/30"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="url(#scoreGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    initial={{ strokeDashoffset: 251.2 }}
                    animate={{ strokeDashoffset: 251.2 - (251.2 * (animatedScore / 1000)) }}
                    strokeDasharray="251.2"
                    transition={{ duration: 2, ease: 'easeOut' }}
                  />
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1a7a6d" />
                      <stop offset="100%" stopColor="#2aaa9a" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.div
                    key={animatedScore}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-5xl font-bold text-[#1a7a6d]"
                  >
                    {animatedScore}
                  </motion.div>
                  <div className="text-sm text-muted-foreground">out of 1,000</div>
                </div>
              </div>

              <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a7a6d1a] border border-[#1a7a6d4d]">
                  <Trophy className="h-4 w-4 text-[#1a7a6d]" />
                  <span className="text-sm font-medium">Level {score?.level || 2} · Getting Started</span>
                </div>
              </div>

              <div className="max-w-md mx-auto mb-8">
                <p className="text-muted-foreground mb-4">Your score will grow as you:</p>
                <div className="space-y-2 text-left">
                  {[
                    'Track your spending',
                    'Stick to your budget',
                    'Pay down debts',
                    'Build savings',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-6 h-6 rounded-full bg-secondary/30 flex items-center justify-center">
                        <TrendingUp className="h-3 w-3 text-[#1a7a6d]" />
                      </div>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-secondary/30 border border-border rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 justify-center text-sm">
                  <Target className="h-4 w-4 text-[#1a7a6d]" />
                  <span className="font-medium">Next milestone: 500</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Track 10 transactions to unlock
                </p>
              </div>

              <Button
                onClick={handleFinish}
                size="lg"
                className="w-full max-w-xs gradient-btn border-0"
              >
                Go to My Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
