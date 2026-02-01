'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Check, X, Loader2, DollarSign } from 'lucide-react';
import { getCategoryIcon } from '@/lib/category-icons';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getBudgetBarStyle } from '@/lib/bar-colors';

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
  onRefresh?: () => void;
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
  onRefresh,
}: BudgetCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editingSpent, setEditingSpent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(budgeted.toString());
  const [spentAmount, setSpentAmount] = useState(spent.toString());

  const IconComponent = getCategoryIcon(categoryIcon, categoryName);
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
      if (onRefresh) {
        onRefresh();
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
    <div className="glass-card rounded-xl p-5 transition-all hover:border-[#1a7a6d4d]">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ 
              backgroundColor: categoryColor ? `${categoryColor}20` : 'rgba(26, 122, 109, 0.15)',
            }}
          >
            <IconComponent 
              className="w-5 h-5" 
              style={{ color: categoryColor || '#1a7a6d' }} 
            />
          </div>
          <div>
            <h3 className="font-medium">{categoryName}</h3>
            {budgeted > 0 && !editing && (
              <p className={`text-sm ${isOver ? 'text-red-400' : 'text-muted-foreground'}`}>
                {isOver 
                  ? `$${Math.abs(remaining).toFixed(2)} over` 
                  : `$${remaining.toFixed(2)} left`}
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
          {editingSpent ? (
            /* Edit Spent Amount */
            <div className="space-y-3 p-3 rounded-lg bg-secondary/30 border border-border">
              <p className="text-xs text-muted-foreground font-medium">Edit Spent Amount</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={spentAmount}
                  onChange={(e) => setSpentAmount(e.target.value)}
                  className="pl-7 bg-secondary/50 border-border"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 gradient-btn border-0"
                  onClick={async () => {
                    // For now, this just updates the local display
                    // You would need to add a spent amount field to your budgets table
                    // or implement transaction-based tracking
                    toast.info('Spent amount editing requires transaction management');
                    setEditingSpent(false);
                  }}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border"
                  onClick={() => {
                    setSpentAmount(spent.toString());
                    setEditingSpent(false);
                  }}
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Tip: Spent amounts auto-calculate from transactions
              </p>
            </div>
          ) : (
            <div className="flex justify-between text-sm items-center">
              <button
                onClick={() => setEditingSpent(true)}
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group"
              >
                <DollarSign className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                ${spent.toFixed(2)} spent
              </button>
              <span className="font-medium">${budgeted.toFixed(2)}</span>
            </div>
          )}
          <div className="h-2 rounded-full bg-border/10 overflow-hidden progress-bar-container">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(percentage, 100)}%`,
                ...getBudgetBarStyle(spent, budgeted),
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
            {spent > 0 ? `$${spent.toFixed(2)} spent this month` : 'No budget set'}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="border-[#1a7a6d4d] text-[#1a7a6d] hover:bg-[#1a7a6d1a]"
            onClick={() => setEditing(true)}
          >
            Set Budget
          </Button>
        </div>
      )}
    </div>
  );
}
