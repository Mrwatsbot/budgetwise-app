'use client';

import { useMemo, useState } from 'react';
import { BudgetCard } from './budget-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Target, Pencil, Palmtree, Car, Home, GraduationCap, Heart, Plane, Gift, Sparkles, Trash2, Trophy } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { toast } from 'sonner';
import { deleteSavingsGoal, updateSavingsGoal } from '@/lib/hooks/use-data';
import { BUDGET_GROUPS, GROUP_ORDER, classifyCategory, type BudgetGroupKey } from '@/lib/budget-groups';

interface CategoryBudget {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  budgetId: string | null;
  budgeted: number;
  spent: number;
}

interface SavingsGoalItem {
  id: string;
  name: string;
  type: string;
  monthly_contribution: number;
  current_amount: number;
  target_amount: number | null;
  recent_contributions?: { id: string; amount: number; date: string }[];
}

interface BudgetGridProps {
  categoryBudgets: CategoryBudget[];
  userId: string;
  currentMonth: string;
  onRefresh?: () => void;
  savingsGoals?: SavingsGoalItem[];
}

function getSavingsIcon(name: string, type: string) {
  const n = name.toLowerCase();
  if (n.includes('vacation') || n.includes('trip') || n.includes('beach')) return Palmtree;
  if (n.includes('car') || n.includes('auto') || n.includes('vehicle')) return Car;
  if (n.includes('house') || n.includes('home') || n.includes('down payment') || n.includes('mortgage')) return Home;
  if (n.includes('education') || n.includes('college') || n.includes('school') || n.includes('529')) return GraduationCap;
  if (n.includes('wedding') || n.includes('ring')) return Heart;
  if (n.includes('travel') || n.includes('flight')) return Plane;
  if (n.includes('gift') || n.includes('christmas') || n.includes('birthday')) return Gift;
  if (type === 'emergency') return Sparkles;
  return Target;
}

export function BudgetGrid({ categoryBudgets, userId, currentMonth, onRefresh, savingsGoals = [] }: BudgetGridProps) {
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoalItem | null>(null);
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const budgetedCategories = categoryBudgets
    .filter(b => b.budgeted > 0)
    .sort((a, b) => {
      const pctA = a.budgeted > 0 ? a.spent / a.budgeted : 0;
      const pctB = b.budgeted > 0 ? b.spent / b.budgeted : 0;
      return pctB - pctA;
    });
  const unbudgetedCategories = categoryBudgets.filter(b => b.budgeted === 0);

  const groupedBudgets = useMemo(() => {
    const groups: Record<BudgetGroupKey, CategoryBudget[]> = { needs: [], wants: [], savings: [] };
    for (const budget of budgetedCategories) {
      groups[classifyCategory(budget.categoryName)].push(budget);
    }
    return groups;
  }, [budgetedCategories]);

  const groupedUnbudgeted = useMemo(() => {
    const groups: Record<BudgetGroupKey, CategoryBudget[]> = { needs: [], wants: [], savings: [] };
    for (const budget of unbudgetedCategories) {
      groups[classifyCategory(budget.categoryName)].push(budget);
    }
    return groups;
  }, [unbudgetedCategories]);

  const savingsWithProgress = useMemo(() => {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    return savingsGoals.map((goal) => {
      const contributed = (goal.recent_contributions || [])
        .filter((c) => c.date >= monthStr)
        .reduce((sum, c) => sum + c.amount, 0);
      return { ...goal, contributedThisMonth: contributed };
    });
  }, [savingsGoals]);

  const groupTotals = useMemo(() => {
    const totals: Record<BudgetGroupKey, { budgeted: number; spent: number }> = {
      needs: { budgeted: 0, spent: 0 },
      wants: { budgeted: 0, spent: 0 },
      savings: { budgeted: 0, spent: 0 },
    };
    for (const budget of budgetedCategories) {
      const group = classifyCategory(budget.categoryName);
      totals[group].budgeted += budget.budgeted;
      totals[group].spent += budget.spent;
    }
    for (const goal of savingsWithProgress) {
      totals.savings.budgeted += goal.monthly_contribution;
      totals.savings.spent += goal.contributedThisMonth;
    }
    return totals;
  }, [budgetedCategories, savingsWithProgress]);

  const hasGroupedBudgets = GROUP_ORDER.some(g => groupedBudgets[g].length > 0) || savingsWithProgress.length > 0;

  const handleDeleteGoal = async () => {
    if (!editingGoal) return;
    setDeleting(true);
    try {
      await deleteSavingsGoal(editingGoal.id);
      toast.success('Savings goal deleted');
      setShowAddGoal(false);
      setConfirmDelete(false);
      onRefresh?.();
    } catch {
      toast.error('Failed to delete goal');
    } finally {
      setDeleting(false);
    }
  };

  const handleCompleteGoal = async (goal: SavingsGoalItem) => {
    try {
      await updateSavingsGoal({ id: goal.id, is_active: false });
      toast.success('🎉 Goal completed! Congratulations!');
      onRefresh?.();
    } catch {
      toast.error('Failed to complete goal');
    }
  };

  const handleAddGoal = () => {
    setEditingGoal(null);
    setGoalName('');
    setGoalAmount('');
    setGoalTarget('');
    setShowAddGoal(true);
  };

  const handleEditGoal = (goal: SavingsGoalItem) => {
    setEditingGoal(goal);
    setGoalName(goal.name);
    setGoalAmount(goal.monthly_contribution > 0 ? goal.monthly_contribution.toString() : '');
    setGoalTarget(goal.target_amount ? goal.target_amount.toString() : '');
    setShowAddGoal(true);
  };

  const handleSaveGoal = async () => {
    if (!goalName.trim()) { toast.error('Enter a name'); return; }
    const monthlyAmt = parseFloat(goalAmount);
    if (isNaN(monthlyAmt) || monthlyAmt < 0) { toast.error('Enter a valid monthly amount'); return; }
    const targetAmt = goalTarget ? parseFloat(goalTarget) : null;

    setSavingGoal(true);
    try {
      const method = editingGoal ? 'PUT' : 'POST';
      const body = editingGoal
        ? { id: editingGoal.id, name: goalName.trim(), monthly_contribution: monthlyAmt, target_amount: targetAmt, type: 'custom' }
        : { name: goalName.trim(), monthly_contribution: monthlyAmt, target_amount: targetAmt, type: 'custom' };
      const res = await fetch('/api/savings', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Failed');
      toast.success(editingGoal ? 'Goal updated' : 'Savings goal added!');
      setShowAddGoal(false);
      onRefresh?.();
    } catch { toast.error('Failed to save goal'); }
    finally { setSavingGoal(false); }
  };

  const SavingsGoalCard = ({ goal }: { goal: SavingsGoalItem & { contributedThisMonth: number } }) => {
    const GoalIcon = getSavingsIcon(goal.name, goal.type);
    const pct = goal.monthly_contribution > 0 ? (goal.contributedThisMonth / goal.monthly_contribution) * 100 : 0;
    const overallPct = goal.target_amount && goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : null;
    const isGoalReached = goal.target_amount != null && goal.target_amount > 0 && goal.current_amount >= goal.target_amount;

    return (
      <div className={`glass-card rounded-xl p-4 space-y-3 ${isGoalReached ? 'ring-1 ring-[#6db555]/30 bg-[#6db555]/5' : ''}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isGoalReached ? 'bg-yellow-500/15' : 'bg-[#6db555]/15'}`}>
              {isGoalReached ? (
                <Trophy className="w-5 h-5 text-yellow-500" />
              ) : (
                <GoalIcon className="w-5 h-5 text-[#6db555]" />
              )}
            </div>
            <div>
              <p className="font-semibold text-sm">{goal.name}</p>
              {isGoalReached ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[#6db555] font-semibold">🎉 Goal reached!</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCompleteGoal(goal); }}
                    className="text-xs text-[#1a7a6d] underline hover:no-underline"
                  >
                    Complete
                  </button>
                </div>
              ) : overallPct !== null ? (
                <p className="text-xs text-muted-foreground">
                  ${goal.current_amount.toLocaleString()} of ${goal.target_amount!.toLocaleString()} — {overallPct.toFixed(0)}%
                </p>
              ) : null}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditGoal(goal)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Monthly contribution progress */}
        <div className="flex justify-between text-sm">
          <span className={pct >= 100 ? 'font-semibold text-[#6db555]' : 'font-semibold'}>
            $<AnimatedNumber value={goal.contributedThisMonth} format="integer" />
          </span>
          <span className="text-muted-foreground">/ ${goal.monthly_contribution.toLocaleString()} /mo</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary/30 overflow-hidden">
          <div
            className="h-full rounded-full transition-all bg-gradient-to-r from-[#6db555] to-[#5a9a3c]"
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>

        {/* Overall goal progress bar */}
        {overallPct !== null && !isGoalReached && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Overall progress</span>
              <span>{overallPct.toFixed(0)}%</span>
            </div>
            <div className="h-1 rounded-full bg-secondary/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#6db555]/40"
                style={{ width: `${Math.min(overallPct, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  const GroupSection = ({ groupKey, items, dimmed = false }: { groupKey: BudgetGroupKey; items: CategoryBudget[]; dimmed?: boolean }) => {
    const isSavings = groupKey === 'savings';
    const hasBudgetItems = items.length > 0;
    const hasSavingsGoals = isSavings && savingsWithProgress.length > 0;

    if (!hasBudgetItems && !hasSavingsGoals && !dimmed) return null;
    if (!hasBudgetItems && !isSavings && dimmed) return null;

    const group = BUDGET_GROUPS[groupKey];
    const totals = groupTotals[groupKey];
    const isOver = totals.spent > totals.budgeted && totals.budgeted > 0;

    return (
      <div
        className="rounded-xl p-4 transition-colors"
        style={{ background: group.bgColor, border: `1px solid ${group.borderColor}` }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">{group.icon}</span>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: group.color }}>{group.label}</h3>
              <p className="text-xs text-muted-foreground">{group.sublabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!dimmed && totals.budgeted > 0 && (
              <div className="text-right">
                <span className={`text-sm font-bold ${isOver ? 'text-red-400' : ''}`}>${Math.round(totals.spent).toLocaleString()}</span>
                <span className="text-xs text-muted-foreground"> / ${Math.round(totals.budgeted).toLocaleString()}</span>
              </div>
            )}
            {isSavings && !dimmed && (
              <Button variant="ghost" size="sm" onClick={handleAddGoal} className="h-7 gap-1 text-xs" style={{ color: group.color }}>
                <Plus className="h-3.5 w-3.5" /> Add Goal
              </Button>
            )}
          </div>
        </div>

        <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${dimmed ? 'opacity-60' : ''}`}>
          {items.map((budget) => (
            <BudgetCard key={budget.categoryId} {...budget} userId={userId} currentMonth={currentMonth} onRefresh={onRefresh} />
          ))}
          {isSavings && savingsWithProgress.map((goal) => (
            <SavingsGoalCard key={goal.id} goal={goal} />
          ))}
        </div>

        {isSavings && !hasBudgetItems && !hasSavingsGoals && !dimmed && (
          <button
            onClick={handleAddGoal}
            className="w-full py-6 px-3 rounded-lg border border-dashed border-[#6db55540] hover:bg-[#6db55510] transition-colors text-center"
          >
            <Target className="w-6 h-6 mx-auto mb-2 text-[#6db555]" />
            <p className="text-sm font-medium text-[#6db555]">Add a savings goal</p>
            <p className="text-xs text-muted-foreground mt-0.5">Vacation, car, house, retirement...</p>
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-8">
        {hasGroupedBudgets && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Active Budgets</h2>
            <div className="space-y-4">
              {GROUP_ORDER.map((groupKey) => (
                <GroupSection key={groupKey} groupKey={groupKey} items={groupedBudgets[groupKey]} />
              ))}
            </div>
          </div>
        )}

        {unbudgetedCategories.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
              {budgetedCategories.length > 0 ? 'Add More Budgets' : 'Set Your First Budget'}
            </h2>
            <div className="space-y-4">
              {GROUP_ORDER.map((groupKey) => (
                <GroupSection key={groupKey} groupKey={groupKey} items={groupedUnbudgeted[groupKey]} dimmed />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Savings Goal Dialog */}
      <Dialog open={showAddGoal} onOpenChange={(open) => { setShowAddGoal(open); if (!open) setConfirmDelete(false); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Edit' : 'Add'} Savings Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Goal reached celebration banner */}
            {editingGoal && editingGoal.target_amount != null && editingGoal.target_amount > 0 && editingGoal.current_amount >= editingGoal.target_amount && (
              <div className="rounded-lg bg-[#6db555]/10 border border-[#6db555]/30 p-3 text-center space-y-2">
                <p className="text-sm font-semibold text-[#6db555]">🎉 You reached your goal!</p>
                <p className="text-xs text-muted-foreground">
                  ${editingGoal.current_amount.toLocaleString()} of ${editingGoal.target_amount.toLocaleString()} saved
                </p>
                <Button
                  size="sm"
                  onClick={() => { handleCompleteGoal(editingGoal); setShowAddGoal(false); }}
                  className="bg-[#6db555] hover:bg-[#5a9a3c] text-white"
                >
                  <Trophy className="h-3.5 w-3.5 mr-1.5" />
                  Mark Complete
                </Button>
              </div>
            )}

            {/* Overall progress (edit mode only) */}
            {editingGoal && editingGoal.target_amount != null && editingGoal.target_amount > 0 && editingGoal.current_amount < editingGoal.target_amount && (
              <div className="rounded-lg bg-secondary/30 p-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-medium">
                    ${editingGoal.current_amount.toLocaleString()} / ${editingGoal.target_amount.toLocaleString()}
                    {' '}({((editingGoal.current_amount / editingGoal.target_amount) * 100).toFixed(0)}%)
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary/30 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#6db555]"
                    style={{ width: `${Math.min((editingGoal.current_amount / editingGoal.target_amount) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">What are you saving for?</label>
              <Input value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="e.g., Vacation, New Car, House" className="mt-1.5" autoFocus />
            </div>
            <div>
              <label className="text-sm font-medium">Monthly Contribution</label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input type="number" step="0.01" min="0" value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} className="pl-7" placeholder="200.00" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Target Amount <span className="text-muted-foreground font-normal">(optional)</span></label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input type="number" step="0.01" min="0" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} className="pl-7" placeholder="5,000.00" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveGoal} disabled={savingGoal || deleting} className="flex-1">
                {savingGoal ? 'Saving...' : editingGoal ? 'Update Goal' : 'Add Goal'}
              </Button>
              <Button variant="outline" onClick={() => { setShowAddGoal(false); setConfirmDelete(false); }} disabled={savingGoal || deleting}>Cancel</Button>
            </div>

            {/* Delete goal section */}
            {editingGoal && (
              <div className="pt-2 border-t border-border">
                {confirmDelete ? (
                  <div className="space-y-2">
                    <p className="text-sm text-red-400">Delete &ldquo;{editingGoal.name}&rdquo;? This can&apos;t be undone.</p>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteGoal}
                        disabled={deleting}
                        className="flex-1"
                      >
                        {deleting ? 'Deleting...' : 'Yes, Delete'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmDelete(false)}
                        disabled={deleting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete this goal
                  </button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
