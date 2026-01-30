'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Pressable } from '@/components/ui/pressable';
import { Pencil, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BudgetCardProps {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  budgetId: string | null;
  budgeted: number;
  spent: number;
  userId: string;
  currentMonth: string;
  onMutate?: () => void;
}

export function BudgetCard({
  categoryId,
  categoryName,
  categoryIcon,
  categoryColor,
  budgetId,
  budgeted,
  spent,
  userId,
  currentMonth,
  onMutate,
}: BudgetCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(budgeted.toString());

  const percentage = budgeted > 0 ? (spent / budgeted) * 100 : 0;
  const isOver = percentage > 100;
  const remaining = budgeted - spent;

  const handleSave = async () => {
    const newAmount = parseFloat(amount);
    if (isNaN(newAmount) || newAmount < 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient() as any;

      if (budgetId) {
        // Update existing budget
        if (newAmount === 0) {
          // Delete if set to 0
          const { error } = await supabase
            .from('budgets')
            .delete()
            .eq('id', budgetId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('budgets')
            .update({ budgeted: newAmount })
            .eq('id', budgetId);
          if (error) throw error;
        }
      } else if (newAmount > 0) {
        // Create new budget
        const { error } = await supabase.from('budgets').insert({
          user_id: userId,
          category_id: categoryId,
          month: currentMonth,
          budgeted: newAmount,
        });
        if (error) throw error;
      }

      toast.success('Budget updated!');
      setEditing(false);
      if (onMutate) {
        onMutate();
      } else {
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update budget');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setAmount(budgeted.toString());
    setEditing(false);
  };

  return (
    <Pressable className="glass-card rounded-xl p-5 transition-all hover:border-[#e8922e33]">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
            style={{ 
              backgroundColor: categoryColor ? `${categoryColor}20` : 'rgba(168, 85, 247, 0.1)',
            }}
          >
            {categoryIcon || '📦'}
          </div>
          <div>
            <h3 className="font-medium">{categoryName}</h3>
            {budgeted > 0 && !editing && (
              <p className={`text-sm ${isOver ? 'text-red-400' : 'text-muted-foreground'}`}>
                {isOver 
                  ? <><AnimatedNumber value={Math.abs(remaining)} format="currency" /> over</> 
                  : <><AnimatedNumber value={remaining} format="currency" /> left</>}
              </p>
            )}
          </div>
        </div>

        {!editing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Edit Mode */}
      {editing ? (
        <div className="space-y-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-7 bg-secondary/50 border-border"
              placeholder="0.00"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 gradient-btn border-0"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-border"
              onClick={handleCancel}
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : budgeted > 0 ? (
        /* Budget Progress */
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              <AnimatedNumber value={spent} format="currency" /> spent
            </span>
            <span className="font-medium">
              <AnimatedNumber value={budgeted} format="currency" />
            </span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(percentage, 100)}%`,
                backgroundColor: isOver ? '#ef4444' : categoryColor || '#a855f7',
              }}
            />
          </div>
          {isOver && (
            <p className="text-xs text-red-400">
              {percentage.toFixed(0)}% of budget used
            </p>
          )}
        </div>
      ) : (
        /* No Budget Set */
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground mb-2">
            {spent > 0 ? <><AnimatedNumber value={spent} format="currency" /> spent this month</> : 'No budget set'}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="border-[#e8922e33] text-[#e8922e] hover:bg-[#e8922e1a]"
            onClick={() => setEditing(true)}
          >
            Set Budget
          </Button>
        </div>
      )}
    </Pressable>
  );
}
