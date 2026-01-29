'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SAVINGS_GOAL_TYPE_META, type SavingsGoalType } from '@/types/database';

interface AddGoalDialogProps {
  userId: string;
  onMutate?: () => void;
}

const GOAL_TYPES = Object.entries(SAVINGS_GOAL_TYPE_META) as [SavingsGoalType, { icon: string; label: string }][];

export function AddGoalDialog({ userId, onMutate }: AddGoalDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'general' as SavingsGoalType,
    targetAmount: '',
    currentAmount: '',
    monthlyContribution: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'general',
      targetAmount: '',
      currentAmount: '',
      monthlyContribution: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Please enter a goal name');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const targetAmount = formData.targetAmount ? parseFloat(formData.targetAmount) : null;
      const currentAmount = formData.currentAmount ? parseFloat(formData.currentAmount) : 0;
      const monthlyContribution = formData.monthlyContribution ? parseFloat(formData.monthlyContribution) : 0;

      const { error } = await supabase.from('savings_goals').insert({
        user_id: userId,
        name: formData.name.trim(),
        type: formData.type,
        target_amount: targetAmount,
        current_amount: currentAmount,
        monthly_contribution: monthlyContribution,
        is_active: true,
      } as any);

      if (error) throw error;

      toast.success('Savings goal created!');
      setOpen(false);
      resetForm();
      onMutate?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create goal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="gradient-btn border-0 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Add Goal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Savings Goal</DialogTitle>
            <DialogDescription>
              Set up a new savings or investment goal to track your progress.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="goal-name">Goal Name</Label>
              <Input
                id="goal-name"
                placeholder="e.g., Emergency Fund"
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            {/* Type */}
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData(f => ({ ...f, type: value as SavingsGoalType }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_TYPES.map(([value, { icon, label }]) => (
                    <SelectItem key={value} value={value}>
                      <span className="flex items-center gap-2">
                        <span>{icon}</span>
                        <span>{label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Amount */}
            <div className="grid gap-2">
              <Label htmlFor="target-amount">Target Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="target-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-7"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData(f => ({ ...f, targetAmount: e.target.value }))}
                />
              </div>
              <p className="text-xs text-muted-foreground">Leave empty for ongoing goals with no target</p>
            </div>

            {/* Current Amount */}
            <div className="grid gap-2">
              <Label htmlFor="current-amount">Current Balance</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="current-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-7"
                  value={formData.currentAmount}
                  onChange={(e) => setFormData(f => ({ ...f, currentAmount: e.target.value }))}
                />
              </div>
            </div>

            {/* Monthly Contribution */}
            <div className="grid gap-2">
              <Label htmlFor="monthly-contribution">Monthly Contribution</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="monthly-contribution"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-7"
                  value={formData.monthlyContribution}
                  onChange={(e) => setFormData(f => ({ ...f, monthlyContribution: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gradient-btn border-0 text-white">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Goal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
