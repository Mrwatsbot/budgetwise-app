'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, CreditCard, PiggyBank, Banknote, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const accountTypes = [
  { value: 'checking', label: 'Checking', icon: Wallet, description: 'Your main spending account' },
  { value: 'savings', label: 'Savings', icon: PiggyBank, description: 'For your savings goals' },
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard, description: 'Track credit card spending' },
  { value: 'cash', label: 'Cash', icon: Banknote, description: 'Physical cash on hand' },
];

interface OnboardingFormProps {
  userId: string;
}

export function OnboardingForm({ userId }: OnboardingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    type: 'checking',
    name: '',
    balance: '',
  });

  // Auto-suggest account name based on type
  const suggestedNames: Record<string, string> = {
    checking: 'Main Checking',
    savings: 'Savings',
    credit_card: 'Credit Card',
    cash: 'Cash',
  };

  const handleTypeSelect = (type: string) => {
    setFormData(f => ({
      ...f,
      type,
      name: f.name || suggestedNames[type] || '',
    }));
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      
      const { error } = await supabase.from('accounts').insert({
        user_id: userId,
        name: formData.name || suggestedNames[formData.type],
        type: formData.type,
        balance: formData.balance ? parseFloat(formData.balance) : 0,
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
      <div className="mb-6">
        <h2 className="text-xl font-semibold">
          {step === 1 ? 'What type of account?' : 'Account Details'}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          {step === 1 
            ? 'Choose the type of account you want to track'
            : 'Enter your account details'
          }
        </p>
      </div>

      {step === 1 ? (
        <div className="grid gap-3">
          {accountTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => handleTypeSelect(type.value)}
              className={cn(
                'flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
                'hover:border-purple-500/50 hover:bg-purple-500/5',
                formData.type === type.value 
                  ? 'border-purple-500/50 bg-purple-500/10' 
                  : 'border-border bg-secondary/30'
              )}
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center">
                <type.icon className="h-6 w-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{type.label}</p>
                <p className="text-sm text-muted-foreground">{type.description}</p>
              </div>
              {formData.type === type.value && (
                <Check className="h-5 w-5 text-purple-400" />
              )}
            </button>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Account Name</Label>
            <Input
              id="name"
              placeholder={suggestedNames[formData.type]}
              value={formData.name}
              onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
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
                value={formData.balance}
                onChange={(e) => setFormData(f => ({ ...f, balance: e.target.value }))}
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
              onClick={() => setStep(1)}
              disabled={loading}
              className="border-border hover:bg-secondary"
            >
              Back
            </Button>
            <Button type="submit" className="flex-1 gradient-btn border-0 text-white" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account & Continue
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
