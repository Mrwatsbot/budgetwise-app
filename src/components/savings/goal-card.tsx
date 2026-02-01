'use client';

import { useState } from 'react';
import { MoreVertical, Plus, Trash2, Pencil, X, Check, Loader2, Shield, PiggyBank, BarChart3, TrendingUp, Heart, GraduationCap, LineChart, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { logSavingsContribution, deleteSavingsGoal, updateSavingsGoal } from '@/lib/hooks/use-data';

const TYPE_ICONS: Record<string, LucideIcon> = {
  emergency: Shield,
  general: PiggyBank,
  retirement_401k: BarChart3,
  ira: TrendingUp,
  hsa: Heart,
  education_529: GraduationCap,
  brokerage: LineChart,
  custom: Star,
};

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

interface SavingsGoal {
  id: string;
  name: string;
  type: string;
  target_amount: number | null;
  current_amount: number;
  monthly_contribution: number;
  recent_contributions?: {
    id: string;
    amount: number;
    date: string;
  }[];
}

interface GoalCardProps {
  goal: SavingsGoal;
  onRefresh?: () => void;
}

export function GoalCard({ goal, onRefresh }: GoalCardProps) {
  const [contributeOpen, setContributeOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [contribAmount, setContribAmount] = useState('');
  const [contribDate, setContribDate] = useState(new Date().toISOString().split('T')[0]);
  const [contribLoading, setContribLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit state
  const [editName, setEditName] = useState(goal.name);
  const [editType, setEditType] = useState(goal.type);
  const [editTarget, setEditTarget] = useState(goal.target_amount?.toString() || '');
  const [editMonthly, setEditMonthly] = useState(goal.monthly_contribution?.toString() || '0');
  const [editCurrent, setEditCurrent] = useState(goal.current_amount?.toString() || '0');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const GoalIcon = TYPE_ICONS[goal.type] || PiggyBank;
  const hasTarget = goal.target_amount && goal.target_amount > 0;
  const percentage = hasTarget
    ? Math.min(100, (goal.current_amount / goal.target_amount!) * 100)
    : 0;

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribAmount || parseFloat(contribAmount) <= 0) return;

    setContribLoading(true);
    try {
      await logSavingsContribution({
        savings_goal_id: goal.id,
        amount: parseFloat(contribAmount),
        date: contribDate,
      });
      setContribAmount('');
      setContribDate(new Date().toISOString().split('T')[0]);
      setContributeOpen(false);
      onRefresh?.();
    } catch {
      // Error handled by mutation
    } finally {
      setContribLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${goal.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteSavingsGoal(goal.id);
      onRefresh?.();
    } catch {
      setDeleting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      setEditError('Name is required');
      return;
    }
    setEditLoading(true);
    setEditError('');
    try {
      await updateSavingsGoal({
        id: goal.id,
        name: editName.trim(),
        type: editType,
        target_amount: editTarget ? parseFloat(editTarget) : null,
        monthly_contribution: editMonthly ? parseFloat(editMonthly) : 0,
        current_amount: editCurrent ? parseFloat(editCurrent) : 0,
      });
      setEditOpen(false);
      onRefresh?.();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setEditLoading(false);
    }
  };

  const openEdit = () => {
    setEditName(goal.name);
    setEditType(goal.type);
    setEditTarget(goal.target_amount?.toString() || '');
    setEditMonthly(goal.monthly_contribution?.toString() || '0');
    setEditCurrent(goal.current_amount?.toString() || '0');
    setEditError('');
    setEditOpen(true);
  };

  return (
    <>
      <div className="glass-card rounded-xl p-5 transition-all hover:border-[#1a7a6d4d]">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <GoalIcon className="w-5 h-5 text-[#1a7a6d]" />
            <h3 className="font-semibold truncate">{goal.name}</h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deleting ? 'Deleting...' : 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Current Amount */}
        <p className="text-2xl font-bold mb-2">
          ${goal.current_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>

        {/* Progress bar if target exists */}
        {hasTarget && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{percentage.toFixed(0)}% of goal</span>
              <span>${goal.target_amount!.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#6db555] to-emerald-400 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Monthly contribution badge */}
        {goal.monthly_contribution > 0 && (
          <Badge variant="secondary" className="text-xs mb-3">
            ${goal.monthly_contribution.toLocaleString('en-US', { minimumFractionDigits: 2 })}/mo
          </Badge>
        )}

        {/* Add Contribution button */}
        <Button
          size="sm"
          variant="outline"
          className="w-full border-[#6db555]/30 text-[#7aba5c] hover:bg-[#6db555]/10 mt-1"
          onClick={() => setContributeOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Contribution
        </Button>
      </div>

      {/* Contribute Dialog */}
      <Dialog open={contributeOpen} onOpenChange={setContributeOpen}>
        <DialogContent className="sm:max-w-sm bg-background border-border">
          <DialogHeader>
            <DialogTitle>Log Contribution</DialogTitle>
            <DialogDescription>Add a contribution to {goal.name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleContribute} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contrib-amount">Amount</Label>
              <Input
                id="contrib-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="$0.00"
                value={contribAmount}
                onChange={(e) => setContribAmount(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contrib-date">Date</Label>
              <Input
                id="contrib-date"
                type="date"
                value={contribDate}
                onChange={(e) => setContribDate(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setContributeOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={contribLoading} className="flex-1 gradient-btn border-0">
                {contribLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log It'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md bg-background border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
            <DialogDescription>Update your savings goal details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            {editError && (
              <div className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{editError}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Goal Type</Label>
              <Select value={editType} onValueChange={setEditType}>
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
              <Label htmlFor="edit-target">Target Amount</Label>
              <Input
                id="edit-target"
                type="number"
                step="0.01"
                min="0"
                placeholder="$0.00"
                value={editTarget}
                onChange={(e) => setEditTarget(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Leave empty for ongoing goals</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-current">Current Balance</Label>
                <Input
                  id="edit-current"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="$0.00"
                  value={editCurrent}
                  onChange={(e) => setEditCurrent(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-monthly">Monthly Contribution</Label>
                <Input
                  id="edit-monthly"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="$0.00"
                  value={editMonthly}
                  onChange={(e) => setEditMonthly(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={editLoading} className="flex-1 gradient-btn border-0">
                {editLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
