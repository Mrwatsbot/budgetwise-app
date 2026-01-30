'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, CreditCard, PiggyBank, Banknote, Loader2, Check, Briefcase, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { IncomeType } from '@/types/database';

const incomeTypes = [
  { 
    value: 'w2' as IncomeType, 
    label: 'W2 / Salary', 
    icon: Briefcase, 
    description: 'Regular paycheck, predictable income' 
  },
  { 
    value: 'creator' as IncomeType, 
    label: 'Creator / Freelancer', 
    icon: Palette, 
    description: 'Variable income from multiple sources' 
  },
];

const accountTypes = [
  { value: 'checking', label: 'Checking', icon: Wallet, description: 'Your main spending account' },
  { value: 'savings', label: 'Savings', icon: PiggyBank, description: 'For your savings goals' },
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard, description: 'Track credit card spending' },
  { value: 'cash', label: 'Cash', icon: Banknote, description: 'Physical cash on hand' },
];

interface OnboardingFormV2Props {
  userId: string;
}

export function OnboardingFormV2({ userId }: OnboardingFormV2Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = income type, 2 = account type, 3 = account details
  
  const [formData, setFormData] = useState({
    incomeType: null as IncomeType | null,
    accountType: 'checking',
    accountName: '',
    accountBalance: '',
  });

  // Auto-suggest account name based on type
  const suggestedAccountNames: Record<string, string> = {
    checking: 'Main Checking',
    savings: 'Savings',
    credit_card: 'Credit Card',
    cash: 'Cash',
  };

  const handleIncomeTypeSelect = async (incomeType: IncomeType) => {
    // Save income type to profile immediately
    try {
      const supabase = createClient();
      const { error } = await (supabase
        .from('profiles')
        .update as any)({ income_type: incomeType })
        .eq('id', userId);

      if (error) throw error;

      setFormData(f => ({ ...f, incomeType }));
      setStep(2);
    } catch (error: any) {
      toast.error('Failed to save income type: ' + error.message);
    }
  };

  const handleAccountTypeSelect = (accountType: string) => {
    setFormData(f => ({
      ...f,
      accountType,
      accountName: f.accountName || suggestedAccountNames[accountType] || '',
    }));
    setStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      
      const { error } = await supabase.from('accounts').insert({
        user_id: userId,
        name: formData.accountName || suggestedAccountNames[formData.accountType],
        type: formData.accountType,
        balance: formData.accountBalance ? parseFloat(formData.accountBalance) : 0,
      } as any);

      if (error) throw error;

      toast.success('Account created! Redirecting to dashboard...');
      
      // Small delay for the toast to show
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 500);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-8">
      {/* Step 1: Income Type */}
      {step === 1 && (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-semibold">What best describes your income?</h2>
            <p className="text-muted-foreground text-sm mt-1">
              We'll tailor your dashboard to your income type
            </p>
          </div>

          <div className="grid gap-3">
            {incomeTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => handleIncomeTypeSelect(type.value)}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
                  'hover:border-[#e8922e80] hover:bg-[#e8922e0d]',
                  formData.incomeType === type.value 
                    ? 'border-[#e8922e80] bg-[#e8922e1a]' 
                    : 'border-border bg-secondary/30'
                )}
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#e8922e33] to-[#f0ad3033] border border-[#e8922e4d] flex items-center justify-center">
                  <type.icon className="h-6 w-6 text-[#f0a030]" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{type.label}</p>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Step 2: Account Type */}
      {step === 2 && (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-semibold">What type of account?</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Choose the type of account you want to track
            </p>
          </div>

          <div className="grid gap-3">
            {accountTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => handleAccountTypeSelect(type.value)}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
                  'hover:border-[#e8922e80] hover:bg-[#e8922e0d]',
                  formData.accountType === type.value 
                    ? 'border-[#e8922e80] bg-[#e8922e1a]' 
                    : 'border-border bg-secondary/30'
                )}
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#e8922e33] to-[#f0ad3033] border border-[#e8922e4d] flex items-center justify-center">
                  <type.icon className="h-6 w-6 text-[#f0a030]" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{type.label}</p>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </div>
                {formData.accountType === type.value && (
                  <Check className="h-5 w-5 text-[#e8922e]" />
                )}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setStep(1)}
              className="border-border hover:bg-secondary"
            >
              Back
            </Button>
          </div>
        </>
      )}

      {/* Step 3: Account Details */}
      {step === 3 && (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Account Details</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Enter your account details
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Account Name</Label>
              <Input
                id="name"
                placeholder={suggestedAccountNames[formData.accountType]}
                value={formData.accountName}
                onChange={(e) => setFormData(f => ({ ...f, accountName: e.target.value }))}
                className="bg-secondary/50 border-border"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="balance">Current Balance</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7 bg-secondary/50 border-border"
                  value={formData.accountBalance}
                  onChange={(e) => setFormData(f => ({ ...f, accountBalance: e.target.value }))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                What's your current balance? You can update this later.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setStep(2)}
                disabled={loading}
                className="border-border hover:bg-secondary"
              >
                Back
              </Button>
              <Button type="submit" className="flex-1 gradient-btn border-0" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account & Continue
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
