'use client';

import { useState, useEffect } from 'react';
import { getCategoryIcon } from '@/lib/category-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Plus, GripVertical, ArrowDownUp } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { toast } from 'sonner';
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

interface CategoryBudget {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  budgetId: string | null;
  budgeted: number;
  spent: number;
}

interface BudgetListCompactProps {
  categoryBudgets: CategoryBudget[];
  userId: string;
  currentMonth: string;
  onRefresh?: () => void;
}

export function BudgetListCompact({ categoryBudgets, userId, currentMonth, onRefresh }: BudgetListCompactProps) {
  const [editingBudget, setEditingBudget] = useState<CategoryBudget | null>(null);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [showUnset, setShowUnset] = useState(false);
  const { setIsDragging } = useDragState();

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 250, // Hold for 250ms to start drag
        tolerance: 5, // Allow small movement during hold
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

    return (
      <div ref={setNodeRef} style={style} className="relative pb-1">
        {/* Entire row is draggable — hold anywhere to drag */}
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
          {/* Grip indicator */}
          <GripVertical className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />

          {/* Icon + Name */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Icon className="w-5 h-5 flex-shrink-0" style={{ color: budget.categoryColor || '#1a7a6d' }} />
            <span className="font-medium text-sm truncate">{budget.categoryName}</span>
          </div>

          {/* Spent / Budget */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
              <span className={`text-sm font-semibold ${isOver ? 'text-red-400' : ''}`}>
                $<AnimatedNumber value={budget.spent} format="integer" />
              </span>
              <span className="text-xs text-muted-foreground"> / $<AnimatedNumber value={budget.budgeted} format="integer" /></span>
            </div>

            {/* Edit button — prevent drag when clicking */}
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

          {/* Progress bar (full width below) — time-aware */}
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
    const percentage = budget.budgeted > 0 ? (budget.spent / budget.budgeted) * 100 : 0;
    const isOver = percentage > 100;

    return (
      <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
        {/* Icon + Name */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon className="w-5 h-5 flex-shrink-0" style={{ color: budget.categoryColor || '#1a7a6d' }} />
          <span className="font-medium text-sm truncate">{budget.categoryName}</span>
        </div>

        {/* Spent / Budget */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <span className={`text-sm font-semibold ${isOver ? 'text-red-400' : ''}`}>
              $<AnimatedNumber value={budget.spent} format="integer" />
            </span>
            <span className="text-xs text-muted-foreground"> / $<AnimatedNumber value={budget.budgeted} format="integer" /></span>
          </div>

          {/* Edit button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0"
            onClick={() => handleEdit(budget)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Progress bar (full width below) — time-aware */}
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

  return (
    <>
      <div className="space-y-4">
        {/* Active Budgets — Sortable */}
        {sortedBudgets.length > 0 && (
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
                <div className="space-y-1 relative overflow-hidden">
                  {sortedBudgets.map((budget) => (
                    <SortableBudgetRow key={budget.categoryId} budget={budget} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* Unset Categories */}
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
              <div className="space-y-1 relative pt-2">
                {unbudgetedCategories.map((budget) => (
                  <div key={budget.categoryId} className="relative pb-1 opacity-60 hover:opacity-100 transition-opacity">
                    <BudgetRow budget={budget} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
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
    </>
  );
}
