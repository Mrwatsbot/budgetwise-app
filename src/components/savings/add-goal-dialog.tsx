'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
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
import { addSavingsGoal } from '@/lib/hooks/use-data';

const GOAL_TYPES = [
  { value: 'emergency', label: 'Emergency Fund' },
  { value: 'general', label: 'General Savings' },
  { value: 'retirement_401k', label: '401(k)/403(b)' },
  { value: 'ira', label: 'IRA' },
  { value: 'hsa', label: 'Health Savings' },
  { value: 'education_529', label: '529 Plan' },
  { value: 'brokerage', label: 'Investments' },
  { value: 'custom', label: 'Custom Goal' },
];

interface AddGoalDialogProps {
  onRefresh?: () => void;
}

export function AddGoalDialog({ onRefresh }: AddGoalDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [type, setType] = useState('general');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');

  const resetForm = () => {
    setName('');
    setType('general');
    setTargetAmount('');
    setCurrentAmount('');
    setMonthlyContribution('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
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

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="gradient-btn border-0">
          <Plus className="mr-2 h-4 w-4" />
          Add Goal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-background border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Savings Goal</DialogTitle>
          <DialogDescription>Set up a new savings or investment goal to track your progress.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="goal-name">Name</Label>
            <Input
              id="goal-name"
              placeholder="e.g. Emergency Fund, Roth IRA, Vacation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Goal Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
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
            <p className="text-xs text-muted-foreground">Leave empty for ongoing goals</p>
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
      </DialogContent>
    </Dialog>
  );
}
