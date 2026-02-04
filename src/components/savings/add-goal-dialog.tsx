'use client';

import { useState } from 'react';
import { Plus, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { addSavingsGoal } from '@/lib/hooks/use-data';

const GOAL_TYPES = [
  { value: 'emergency', label: 'Emergency Fund' },
  { value: 'general', label: 'General Savings' },
  { value: 'custom', label: 'Custom Goal' },
];

const INVESTMENT_TYPES = [
  { value: 'retirement_401k', label: '401(k)/403(b)' },
  { value: 'ira', label: 'IRA' },
  { value: 'hsa', label: 'Health Savings' },
  { value: 'education_529', label: '529 Plan' },
  { value: 'brokerage', label: 'Brokerage/Investments' },
];

interface AddGoalDialogProps {
  onRefresh?: () => void;
  section?: 'goal' | 'investment';
}

export function AddGoalDialog({ onRefresh, section = 'goal' }: AddGoalDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'goal' | 'investment'>(section);

  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');

  const resetForm = () => {
    setName('');
    setType('');
    setTargetAmount('');
    setCurrentAmount('');
    setMonthlyContribution('');
    setError('');
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) {
      // Reset to section-specific defaults when opening
      setActiveTab(section);
      setType('');
    } else {
      resetForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!type) {
      setError('Type is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await addSavingsGoal({
        name: name.trim(),
        type,
        target_amount: targetAmount ? parseFloat(targetAmount) : null,
        current_amount: currentAmount ? parseFloat(currentAmount) : 0,
        monthly_contribution: monthlyContribution ? parseFloat(monthlyContribution) : 0,
      });

      resetForm();
      setOpen(false);
      onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add goal');
    } finally {
      setLoading(false);
    }
  };

  const isInvestment = activeTab === 'investment';
  const buttonText = section === 'investment' ? 'Add Account' : 'Add Goal';
  const dialogTitle = isInvestment ? 'Add Investment Account' : 'Add Savings Goal';
  const dialogDesc = isInvestment 
    ? 'Track your retirement accounts, HSA, or other investments.'
    : 'Set up a new savings goal with a target to track your progress.';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gradient-btn border-0">
          <Plus className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-background border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDesc}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'goal' | 'investment'); setType(''); }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="goal" className="text-xs">
              <Target className="w-3 h-3 mr-1" />
              Savings Goal
            </TabsTrigger>
            <TabsTrigger value="investment" className="text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              Investment
            </TabsTrigger>
          </TabsList>

          <TabsContent value="goal" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{error}</div>
              )}

              <div className="space-y-2">
                <Label htmlFor="goal-name">Name</Label>
                <Input
                  id="goal-name"
                  placeholder="e.g. Emergency Fund, Vacation, New Car"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Goal Type</Label>
                <Select value={type} onValueChange={setType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_TYPES.map((gt) => (
                      <SelectItem key={gt.value} value={gt.value}>
                        {gt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target-amount">Target Amount</Label>
                <Input
                  id="target-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="$0.00"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Optional: Set a target to track progress</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="current-amount">Current Balance</Label>
                  <Input
                    id="current-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="$0.00"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly-contribution">Monthly Contribution</Label>
                  <Input
                    id="monthly-contribution"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="$0.00"
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1 gradient-btn border-0">
                  {loading ? 'Adding...' : 'Add Goal'}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="investment" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{error}</div>
              )}

              <div className="space-y-2">
                <Label htmlFor="inv-name">Account Name</Label>
                <Input
                  id="inv-name"
                  placeholder="e.g. Roth IRA, 401(k), HSA"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Account Type</Label>
                <Select value={type} onValueChange={setType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    {INVESTMENT_TYPES.map((it) => (
                      <SelectItem key={it.value} value={it.value}>
                        {it.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="inv-current">Current Balance</Label>
                  <Input
                    id="inv-current"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="$0.00"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv-monthly">Monthly Contribution</Label>
                  <Input
                    id="inv-monthly"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="$0.00"
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(e.target.value)}
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                💡 Investment accounts don't need a target amount — they're tracked by balance and growth.
              </p>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1 gradient-btn border-0">
                  {loading ? 'Adding...' : 'Add Account'}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
