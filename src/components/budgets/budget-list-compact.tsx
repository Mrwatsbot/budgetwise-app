'use client';

import { useState, useEffect, useMemo } from 'react';
import { getCategoryIcon } from '@/lib/category-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Plus, GripVertical, ArrowDownUp, Target, Palmtree, Car, Home, GraduationCap, Heart, Plane, Gift, Sparkles, Trash2, Trophy } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { toast } from 'sonner';
import { deleteSavingsGoal, updateSavingsGoal } from '@/lib/hooks/use-data';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { useDragState } from '@/lib/contexts/drag-context';
import { getBudgetBarStyle } from '@/lib/bar-colors';
import { BUDGET_GROUPS, GROUP_ORDER, classifyCategory, type BudgetGroupKey } from '@/lib/budget-groups';
import { calculatePaceIndicator } from '@/lib/pace-helpers';

interface CategoryBudget {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  budgetId: string | null;
  budgeted: number;
  spent: number;
  rollover?: boolean;
  rollover_amount?: number;
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

interface BudgetListCompactProps {
  categoryBudgets: CategoryBudget[];
  userId: string;
  currentMonth: string;
  onRefresh?: () => void;
  savingsGoals?: SavingsGoalItem[];
}

/** Map goal type/name to an icon */
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

export function BudgetListCompact({ categoryBudgets, userId, currentMonth, onRefresh, savingsGoals = [] }: BudgetListCompactProps) {
  const [editingBudget, setEditingBudget] = useState<CategoryBudget | null>(null);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [showUnset, setShowUnset] = useState(false);
  const { setIsDragging } = useDragState();

  // Savings goal dialog
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoalItem | null>(null);
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sort budgets by % spent (highest first) so attention-needed items are on top
  const budgetedCategories = categoryBudgets.filter(b => b.budgeted > 0);
  const unbudgetedCategories = categoryBudgets.filter(b => b.budgeted === 0);

  const [sortedBudgets, setSortedBudgets] = useState<CategoryBudget[]>([]);

  // Initialize sorted list on mount or when budgetedCategories changes
  useEffect(() => {
    const sorted = [...budgetedCategories].sort((a, b) => {
      const pctA = a.budgeted > 0 ? a.spent / a.budgeted : 0;
      const pctB = b.budgeted > 0 ? b.spent / b.budgeted : 0;
      return pctB - pctA;
    });
    setSortedBudgets(sorted);
  }, [categoryBudgets]);

  // Group budgeted items by needs/wants/savings
  const groupedBudgets = useMemo(() => {
    const groups: Record<BudgetGroupKey, CategoryBudget[]> = {
      needs: [],
      wants: [],
      savings: [],
    };
    for (const budget of sortedBudgets) {
      const group = classifyCategory(budget.categoryName);
      groups[group].push(budget);
    }
    return groups;
  }, [sortedBudgets]);

  // Group unbudgeted items too
  const groupedUnbudgeted = useMemo(() => {
    const groups: Record<BudgetGroupKey, CategoryBudget[]> = {
      needs: [],
      wants: [],
      savings: [],
    };
    for (const budget of unbudgetedCategories) {
      const group = classifyCategory(budget.categoryName);
      groups[group].push(budget);
    }
    return groups;
  }, [unbudgetedCategories]);

  // Compute savings goals monthly progress
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSortedBudgets((items) => {
      const oldIndex = items.findIndex((item) => item.categoryId === active.id);
      const newIndex = items.findIndex((item) => item.categoryId === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handleAutoSort = () => {
    const sorted = [...budgetedCategories].sort((a, b) => {
      const pctA = a.budgeted > 0 ? a.spent / a.budgeted : 0;
      const pctB = b.budgeted > 0 ? b.spent / b.budgeted : 0;
      return pctB - pctA;
    });
    setSortedBudgets(sorted);
  };

  const handleEdit = (budget: CategoryBudget) => {
    setEditingBudget(budget);
    setAmount(budget.budgeted > 0 ? budget.budgeted.toString() : '');
  };

  const handleSave = async () => {
    if (!editingBudget) return;
    const budgetAmount = parseFloat(amount);
    if (isNaN(budgetAmount) || budgetAmount < 0) {
      toast.error('Enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      const method = editingBudget.budgetId ? 'PUT' : 'POST';
      const res = await fetch('/api/budgets', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingBudget.budgetId,
          user_id: userId,
          category_id: editingBudget.categoryId,
          month: currentMonth,
          budgeted: budgetAmount,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Budget updated');
      setEditingBudget(null);
      onRefresh?.();
    } catch {
      toast.error('Failed to update budget');
    } finally {
      setSaving(false);
    }
  };

  // Savings goal handlers
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
    if (!goalName.trim()) {
      toast.error('Enter a name for your goal');
      return;
    }
    const monthlyAmt = parseFloat(goalAmount);
    if (isNaN(monthlyAmt) || monthlyAmt < 0) {
      toast.error('Enter a valid monthly amount');
      return;
    }
    const targetAmt = goalTarget ? parseFloat(goalTarget) : null;

    setSavingGoal(true);
    try {
      const method = editingGoal ? 'PUT' : 'POST';
      const body = editingGoal
        ? { id: editingGoal.id, name: goalName.trim(), monthly_contribution: monthlyAmt, target_amount: targetAmt, type: 'custom' }
        : { name: goalName.trim(), monthly_contribution: monthlyAmt, target_amount: targetAmt, type: 'custom' };

      const res = await fetch('/api/savings', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success(editingGoal ? 'Goal updated' : 'Savings goal added!');
      setShowAddGoal(false);
      onRefresh?.();
    } catch {
      toast.error('Failed to save goal');
    } finally {
      setSavingGoal(false);
    }
  };

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

  // Compute group subtotals (include savings goals in savings group)
  const groupTotals = useMemo(() => {
    const totals: Record<BudgetGroupKey, { budgeted: number; spent: number }> = {
      needs: { budgeted: 0, spent: 0 },
      wants: { budgeted: 0, spent: 0 },
      savings: { budgeted: 0, spent: 0 },
    };
    for (const budget of sortedBudgets) {
      const group = classifyCategory(budget.categoryName);
      totals[group].budgeted += budget.budgeted;
      totals[group].spent += budget.spent;
    }
    // Add savings goals to the savings group totals
    for (const goal of savingsWithProgress) {
      totals.savings.budgeted += goal.monthly_contribution;
      totals.savings.spent += goal.contributedThisMonth;
    }
    return totals;
  }, [sortedBudgets, savingsWithProgress]);

  const SortableBudgetRow = ({ budget }: { budget: CategoryBudget }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: budget.categoryId });
    const { isDragging: isAnyDragging } = useDragState();

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    const Icon = getCategoryIcon(budget.categoryIcon, budget.categoryName);
    const percentage = budget.budgeted > 0 ? (budget.spent / budget.budgeted) * 100 : 0;
    const isOver = percentage > 100;
    const paceIndicator = calculatePaceIndicator(budget.spent, budget.budgeted, currentMonth);

    return (
      <div ref={setNodeRef} style={style} className="relative pb-1">
        <div 
          {...attributes}
          {...listeners}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-grab active:cursor-grabbing ${
            isDragging 
              ? 'bg-[#1a7a6d33] shadow-lg scale-105 ring-2 ring-[#1a7a6d]/50' 
              : 'hover:bg-secondary/50'
          }`}
          style={{ touchAction: isAnyDragging ? 'none' : 'auto' }}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Icon className="w-5 h-5 flex-shrink-0" style={{ color: budget.categoryColor || '#1a7a6d' }} />
            <span className="font-medium text-sm truncate">{budget.categoryName}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
              <div className="flex flex-col items-end">
                <span className={`text-sm font-semibold ${isOver ? 'text-red-400' : ''}`}>
                  $<AnimatedNumber value={budget.spent} format="integer" />
                </span>
                <span className="text-xs text-muted-foreground">
                  {' / $'}<AnimatedNumber value={budget.budgeted} format="integer" />
                  {budget.rollover_amount !== 0 && budget.rollover_amount !== undefined && (
                    <span className={budget.rollover_amount > 0 ? 'text-green-400' : 'text-red-400'}>
                      {' ('}{budget.rollover_amount > 0 ? '+' : ''}{budget.rollover_amount.toFixed(0)})
                    </span>
                  )}
                </span>
                {!isOver && paceIndicator && (
                  <span className={`text-[10px] ${paceIndicator.isOverPace ? 'text-orange-400' : 'text-[#7aba5c]'}`}>
                    {paceIndicator.text}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(budget);
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="absolute left-3 right-3 bottom-0 h-1 bg-secondary/30 rounded-full overflow-hidden">
            <div
              className="h-full transition-all rounded-full"
              style={{
                width: `${Math.min(percentage, 100)}%`,
                ...getBudgetBarStyle(budget.spent, budget.budgeted),
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  const BudgetRow = ({ budget }: { budget: CategoryBudget }) => {
    const Icon = getCategoryIcon(budget.categoryIcon, budget.categoryName);
    const totalAvailable = budget.budgeted + (budget.rollover_amount || 0);
    const percentage = totalAvailable > 0 ? (budget.spent / totalAvailable) * 100 : 0;
    const isOver = percentage > 100;
    const paceIndicator = calculatePaceIndicator(budget.spent, budget.budgeted, currentMonth);

    return (
      <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-secondary/50 transition-colors relative">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon className="w-5 h-5 flex-shrink-0" style={{ color: budget.categoryColor || '#1a7a6d' }} />
          <span className="font-medium text-sm truncate">{budget.categoryName}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <div className="flex flex-col items-end">
              <span className={`text-sm font-semibold ${isOver ? 'text-red-400' : ''}`}>
                $<AnimatedNumber value={budget.spent} format="integer" />
              </span>
              <span className="text-xs text-muted-foreground">
                {' / $'}<AnimatedNumber value={budget.budgeted} format="integer" />
                {budget.rollover_amount !== 0 && budget.rollover_amount !== undefined && (
                  <span className={budget.rollover_amount > 0 ? 'text-green-400' : 'text-red-400'}>
                    {' ('}{budget.rollover_amount > 0 ? '+' : ''}{budget.rollover_amount.toFixed(0)})
                  </span>
                )}
              </span>
              {!isOver && paceIndicator && (
                <span className={`text-[10px] ${paceIndicator.isOverPace ? 'text-orange-400' : 'text-[#7aba5c]'}`}>
                  {paceIndicator.text}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0"
            onClick={() => handleEdit(budget)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="absolute left-3 right-3 bottom-0 h-1 bg-secondary/30 rounded-full overflow-hidden">
          <div
            className="h-full transition-all rounded-full"
            style={{
              width: `${Math.min(percentage, 100)}%`,
              ...getBudgetBarStyle(budget.spent, budget.budgeted),
            }}
          />
        </div>
      </div>
    );
  };

  /** Savings goal row (matches budget row style) */
  const SavingsGoalRow = ({ goal }: { goal: SavingsGoalItem & { contributedThisMonth: number } }) => {
    const GoalIcon = getSavingsIcon(goal.name, goal.type);
    const percentage = goal.monthly_contribution > 0 ? (goal.contributedThisMonth / goal.monthly_contribution) * 100 : 0;
    const overallPct = goal.target_amount && goal.target_amount > 0
      ? (goal.current_amount / goal.target_amount) * 100
      : null;
    const isGoalReached = goal.target_amount != null && goal.target_amount > 0 && goal.current_amount >= goal.target_amount;

    return (
      <div className={`flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-secondary/50 transition-colors relative ${isGoalReached ? 'ring-1 ring-[#6db555]/30 bg-[#6db555]/5' : ''}`}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
            {isGoalReached ? (
              <Trophy className="w-4 h-4 text-yellow-500" />
            ) : (
              <GoalIcon className="w-4 h-4" style={{ color: '#6db555' }} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-medium text-sm truncate block">{goal.name}</span>
            {isGoalReached ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#6db555] font-semibold">
                  🎉 Goal reached! ${goal.current_amount.toLocaleString()} saved
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleCompleteGoal(goal); }}
                  className="text-[10px] text-[#1a7a6d] underline hover:no-underline"
                >
                  Complete
                </button>
              </div>
            ) : overallPct !== null ? (
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground">
                  ${goal.current_amount.toLocaleString()} of ${goal.target_amount!.toLocaleString()} — {overallPct.toFixed(0)}%
                </span>
                <div className="h-[3px] rounded-full bg-secondary/30 overflow-hidden w-full max-w-[120px]">
                  <div
                    className="h-full rounded-full bg-[#6db555]/40"
                    style={{ width: `${Math.min(overallPct, 100)}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <span className={`text-sm font-semibold ${percentage >= 100 ? 'text-[#6db555]' : ''}`}>
              $<AnimatedNumber value={goal.contributedThisMonth} format="integer" />
            </span>
            <span className="text-xs text-muted-foreground"> / $<AnimatedNumber value={goal.monthly_contribution} format="integer" /></span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0"
            onClick={() => handleEditGoal(goal)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="absolute left-3 right-3 bottom-0 h-1 bg-secondary/30 rounded-full overflow-hidden">
          <div
            className="h-full transition-all rounded-full bg-gradient-to-r from-[#6db555] to-[#5a9a3c]"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    );
  };

  /** Render a group section box */
  const GroupSection = ({ groupKey, items, sortable = false }: { groupKey: BudgetGroupKey; items: CategoryBudget[]; sortable?: boolean }) => {
    const isSavings = groupKey === 'savings';
    const hasBudgetItems = items.length > 0;
    const hasSavingsGoals = isSavings && savingsWithProgress.length > 0;

    // Don't render empty groups (unless it's savings with goals, or unset mode)
    if (!hasBudgetItems && !hasSavingsGoals && sortable) return null;
    if (!hasBudgetItems && !isSavings) return null;

    const group = BUDGET_GROUPS[groupKey];
    const totals = groupTotals[groupKey];
    const isOverGroup = totals.spent > totals.budgeted && totals.budgeted > 0;

    return (
      <div
        className="rounded-xl p-3 pt-2.5 space-y-0.5 transition-colors"
        style={{
          background: group.bgColor,
          border: `1px solid ${group.borderColor}`,
        }}
      >
        {/* Group header */}
        <div className="flex items-center justify-between px-1 pb-1.5 mb-0.5">
          <div className="flex items-center gap-2">
            <group.icon className="w-4 h-4" style={{ color: group.color }} />
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: group.color }}>
                {group.label}
              </span>
              <span className="text-[10px] text-muted-foreground ml-2 hidden xs:inline">
                {group.sublabel}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {totals.budgeted > 0 && (
              <div className="text-right">
                <span className={`text-xs font-semibold ${isOverGroup ? 'text-red-400' : ''}`}>
                  ${Math.round(totals.spent).toLocaleString()}
                </span>
                <span className="text-[10px] text-muted-foreground"> / ${Math.round(totals.budgeted).toLocaleString()}</span>
              </div>
            )}
            {isSavings && sortable && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleAddGoal}
              >
                <Plus className="h-3.5 w-3.5" style={{ color: group.color }} />
              </Button>
            )}
          </div>
        </div>

        {/* Budget category items */}
        {sortable ? (
          items.map((budget) => (
            <SortableBudgetRow key={budget.categoryId} budget={budget} />
          ))
        ) : (
          items.map((budget) => (
            <div key={budget.categoryId} className="relative pb-1 opacity-60 hover:opacity-100 transition-opacity">
              <BudgetRow budget={budget} />
            </div>
          ))
        )}

        {/* Savings goal items (only in savings group) */}
        {isSavings && savingsWithProgress.map((goal) => (
          <SavingsGoalRow key={goal.id} goal={goal} />
        ))}

        {/* Empty state for savings */}
        {isSavings && !hasBudgetItems && !hasSavingsGoals && sortable && (
          <button
            onClick={handleAddGoal}
            className="w-full py-4 px-3 rounded-lg border border-dashed border-[#6db55540] hover:bg-[#6db55510] transition-colors text-center"
          >
            <Target className="w-5 h-5 mx-auto mb-1.5 text-[#6db555]" />
            <p className="text-sm font-medium text-[#6db555]">Add a savings goal</p>
            <p className="text-xs text-muted-foreground mt-0.5">Vacation, car, house, retirement...</p>
          </button>
        )}
      </div>
    );
  };

  // Check if we have any budgeted items or savings goals in any group
  const hasGroupedBudgets = GROUP_ORDER.some(g => groupedBudgets[g].length > 0) || savingsWithProgress.length > 0;

  return (
    <>
      <div className="space-y-4">
        {/* Active Budgets — Grouped & Sortable */}
        {hasGroupedBudgets && (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-3 mb-2">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Active Budgets <span className="text-xs font-normal">(drag to reorder)</span>
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAutoSort}
                className="h-7 gap-1.5 text-xs"
              >
                <ArrowDownUp className="h-3.5 w-3.5" />
                Sort by Spend %
              </Button>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            >
              <SortableContext
                items={sortedBudgets.map((b) => b.categoryId)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3 relative overflow-hidden">
                  {GROUP_ORDER.map((groupKey) => (
                    <GroupSection
                      key={groupKey}
                      groupKey={groupKey}
                      items={groupedBudgets[groupKey]}
                      sortable
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* Unset Categories — also grouped */}
        {unbudgetedCategories.length > 0 && (
          <div className="space-y-1">
            <button
              onClick={() => setShowUnset(!showUnset)}
              className="text-sm font-semibold text-muted-foreground px-3 flex items-center gap-2 hover:text-foreground transition-colors"
            >
              {budgetedCategories.length > 0 ? 'Add More Budgets' : 'Set Your First Budget'}
              <span className="text-xs">({unbudgetedCategories.length})</span>
              <Plus className={`h-4 w-4 transition-transform ${showUnset ? 'rotate-45' : ''}`} />
            </button>
            {showUnset && (
              <div className="space-y-3 pt-2">
                {GROUP_ORDER.map((groupKey) => (
                  <GroupSection
                    key={groupKey}
                    groupKey={groupKey}
                    items={groupedUnbudgeted[groupKey]}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Budget Dialog */}
      <Dialog open={!!editingBudget} onOpenChange={(open) => !open && setEditingBudget(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editingBudget?.budgeted ? 'Edit' : 'Set'} Budget: {editingBudget?.categoryName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium">Monthly Budget</label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
              </div>
            </div>
            {editingBudget && editingBudget.spent > 0 && (
              <p className="text-sm text-muted-foreground">
                Already spent ${editingBudget.spent.toFixed(2)} this month
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? 'Saving...' : 'Save Budget'}
              </Button>
              <Button variant="outline" onClick={() => setEditingBudget(null)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Savings Goal Dialog */}
      <Dialog open={showAddGoal} onOpenChange={(open) => { setShowAddGoal(open); if (!open) setConfirmDelete(false); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editingGoal ? 'Edit' : 'Add'} Savings Goal
            </DialogTitle>
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
              <Input
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="e.g., Vacation, New Car, House Down Payment"
                className="mt-1.5"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium">Monthly Contribution</label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={goalAmount}
                  onChange={(e) => setGoalAmount(e.target.value)}
                  className="pl-7"
                  placeholder="200.00"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">How much to set aside each month</p>
            </div>
            <div>
              <label className="text-sm font-medium">Target Amount <span className="text-muted-foreground font-normal">(optional)</span></label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  className="pl-7"
                  placeholder="5,000.00"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total you want to save (leave blank for ongoing)</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveGoal} disabled={savingGoal || deleting} className="flex-1">
                {savingGoal ? 'Saving...' : editingGoal ? 'Update Goal' : 'Add Goal'}
              </Button>
              <Button variant="outline" onClick={() => { setShowAddGoal(false); setConfirmDelete(false); }} disabled={savingGoal || deleting}>
                Cancel
              </Button>
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
