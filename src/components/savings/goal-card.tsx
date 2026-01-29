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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Plus, Pencil, Trash2, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { SAVINGS_GOAL_TYPE_META, type SavingsGoal, type SavingsGoalType } from '@/types/database';

interface GoalCardProps {
  goal: SavingsGoal;
  onMutate?: () => void;
}

const GOAL_TYPES = Object.entries(SAVINGS_GOAL_TYPE_META) as [SavingsGoalType, { icon: string; label: string }][];

export function GoalCard({ goal, onMutate }: GoalCardProps) {
  const [contributionOpen, setContributionOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [contributionLoading, setContributionLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionDate, setContributionDate] = useState(new Date().toISOString().split('T')[0]);

  const [editData, setEditData] = useState({
    name: goal.name,
    type: goal.type,
    targetAmount: goal.target_amount?.toString() || '',
    monthlyContribution: goal.monthly_contribution?.toString() || '0',
  });

  const meta = SAVINGS_GOAL_TYPE_META[goal.type] || SAVINGS_GOAL_TYPE_META.custom;
  const hasTarget = goal.target_amount !== null && goal.target_amount > 0;
  const percentage = hasTarget ? Math.min((goal.current_amount / goal.target_amount!) * 100, 100) : 0;
  const isComplete = hasTarget && goal.current_amount >= goal.target_amount!;

  // Gradient color based on goal type
  const getProgressColor = () => {
    switch (goal.type) {
      case 'emergency': return '#ef4444';
      case 'retirement_401k': return '#8b5cf6';
      case 'ira': return '#3b82f6';
      case 'hsa': return '#10b981';
      case 'education_529': return '#f59e0b';
      case 'brokerage': return '#6366f1';
      default: return '#a855f7';
    }
  };

  const handleAddContribution = async () => {
    const amount = parseFloat(contributionAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setContributionLoading(true);
    try {
      const supabase = createClient() as any;

      // Insert contribution
      const { error: contribError } = await supabase.from('savings_contributions').insert({
        user_id: goal.user_id,
        savings_goal_id: goal.id,
        amount,
        date: contributionDate,
      });

      if (contribError) throw contribError;

      // Update goal's current_amount
      const { error: updateError } = await supabase
        .from('savings_goals')
        .update({ current_amount: goal.current_amount + amount })
        .eq('id', goal.id);

      if (updateError) throw updateError;

      toast.success(`$${amount.toFixed(2)} added to ${goal.name}!`);
      setContributionOpen(false);
      setContributionAmount('');
      setContributionDate(new Date().toISOString().split('T')[0]);
      onMutate?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add contribution');
    } finally {
      setContributionLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editData.name.trim()) {
      toast.error('Please enter a goal name');
      return;
    }

    setEditLoading(true);
    try {
      const supabase = createClient() as any;

      const targetAmount = editData.targetAmount ? parseFloat(editData.targetAmount) : null;
      const monthlyContribution = editData.monthlyContribution ? parseFloat(editData.monthlyContribution) : 0;

      const { error } = await supabase
        .from('savings_goals')
        .update({
          name: editData.name.trim(),
          type: editData.type,
          target_amount: targetAmount,
          monthly_contribution: monthlyContribution,
        })
        .eq('id', goal.id);

      if (error) throw error;

      toast.success('Goal updated!');
      setEditOpen(false);
      onMutate?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update goal');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const supabase = createClient() as any;

      const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', goal.id);

      if (error) throw error;

      toast.success('Goal deleted');
      onMutate?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete goal');
    } finally {
      setDeleteLoading(false);
    }
  };

  const progressColor = getProgressColor();

  return (
    <>
      <div className="glass-card rounded-xl p-5 transition-all hover:border-purple-500/30">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
              style={{ backgroundColor: `${progressColor}20` }}
            >
              {meta.icon}
            </div>
            <div>
              <h3 className="font-medium leading-tight">{goal.name}</h3>
              <p className="text-xs text-muted-foreground">{meta.label}</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border-border">
              <DropdownMenuItem onClick={() => {
                setEditData({
                  name: goal.name,
                  type: goal.type,
                  targetAmount: goal.target_amount?.toString() || '',
                  monthlyContribution: goal.monthly_contribution?.toString() || '0',
                });
                setEditOpen(true);
              }}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Goal
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-red-400 focus:text-red-400"
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete Goal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Current Amount (big number) */}
        <div className="mb-3">
          <p className="text-2xl font-bold">${goal.current_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          {hasTarget && (
            <p className="text-sm text-muted-foreground">
              of ${goal.target_amount!.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · {percentage.toFixed(0)}%
            </p>
          )}
        </div>

        {/* Progress Bar */}
        {hasTarget && (
          <div className="mb-3">
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: isComplete ? '#10b981' : progressColor,
                }}
              />
            </div>
          </div>
        )}

        {/* Monthly Contribution Badge */}
        {goal.monthly_contribution > 0 && (
          <div className="mb-4">
            <span
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ backgroundColor: `${progressColor}15`, color: progressColor }}
            >
              ${goal.monthly_contribution.toFixed(2)}/mo
            </span>
          </div>
        )}

        {/* Add Contribution Button */}
        <Button
          size="sm"
          variant="outline"
          className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          onClick={() => setContributionOpen(true)}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add Contribution
        </Button>
      </div>

      {/* Contribution Dialog */}
      <Dialog open={contributionOpen} onOpenChange={setContributionOpen}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle>Add Contribution</DialogTitle>
            <DialogDescription>
              Add funds to {goal.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="contrib-amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="contrib-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-7"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contrib-date">Date</Label>
              <Input
                id="contrib-date"
                type="date"
                value={contributionDate}
                onChange={(e) => setContributionDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContributionOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddContribution}
              disabled={contributionLoading}
              className="gradient-btn border-0 text-white"
            >
              {contributionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Goal Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Edit Goal</DialogTitle>
              <DialogDescription>
                Update your savings goal details.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Goal Name</Label>
                <Input
                  id="edit-name"
                  value={editData.name}
                  onChange={(e) => setEditData(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select
                  value={editData.type}
                  onValueChange={(value) => setEditData(f => ({ ...f, type: value as SavingsGoalType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
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
              <div className="grid gap-2">
                <Label htmlFor="edit-target">Target Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="edit-target"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="pl-7"
                    value={editData.targetAmount}
                    onChange={(e) => setEditData(f => ({ ...f, targetAmount: e.target.value }))}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Leave empty for ongoing goals</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-monthly">Monthly Contribution</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="edit-monthly"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="pl-7"
                    value={editData.monthlyContribution}
                    onChange={(e) => setEditData(f => ({ ...f, monthlyContribution: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editLoading} className="gradient-btn border-0 text-white">
                {editLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
