'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Pencil, Check, X, Loader2, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { getCategoryIcon } from '@/lib/category-icons';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getBudgetBarStyle } from '@/lib/bar-colors';
import { calculatePaceIndicator } from '@/lib/pace-helpers';

interface BudgetCardProps {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  budgetId: string | null;
  budgeted: number;
  spent: number;
  rollover?: boolean;
  rolloverAmount?: number;
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
  rollover = true,
  rolloverAmount = 0,
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
  const [rolloverEnabled, setRolloverEnabled] = useState(rollover);

  const IconComponent = getCategoryIcon(categoryIcon, categoryName);
  const totalAvailable = budgeted + rolloverAmount;
  const percentage = totalAvailable > 0 ? (spent / totalAvailable) * 100 : 0;
  const isOver = percentage > 100;
  const remaining = totalAvailable - spent;

  const handleSave = async () => {
    const newAmount = parseFloat(amount);
    if (isNaN(newAmount) || newAmount < 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      if (budgetId) {
        // Update existing budget
        if (newAmount === 0) {
          // Delete if set to 0
          const response = await fetch('/api/budgets', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ budgetId }),
          });
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to delete budget');
          }
        } else {
          const response = await fetch('/api/budgets', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              budgetId,
              budgeted: newAmount,
              rollover: rolloverEnabled,
            }),
          });
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to update budget');
          }
        }
      } else if (newAmount > 0) {
        // Create new budget
        const response = await fetch('/api/budgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category_id: categoryId,
            month: currentMonth,
            budgeted: newAmount,
            rollover: rolloverEnabled,
          }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create budget');
        }
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
              <div className="flex flex-col gap-0.5">
                {rolloverAmount !== 0 && (
                  <p className={`text-xs flex items-center gap-1 ${rolloverAmount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {rolloverAmount > 0 ? (
                      <>
                        <TrendingUp className="h-3 w-3" />
                        ${rolloverAmount.toFixed(2)} rollover
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-3 w-3" />
                        ${Math.abs(rolloverAmount).toFixed(2)} overspend
                      </>
                    )}
                  </p>
                )}
                <p className={`text-sm ${isOver ? 'text-red-400' : 'text-muted-foreground'}`}>
                  {isOver 
                    ? `$${Math.abs(remaining).toFixed(2)} over` 
                    : `$${remaining.toFixed(2)} left`}
                </p>
              </div>
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
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
            <Label htmlFor="rollover-toggle" className="text-sm cursor-pointer">
              Roll over unspent funds
            </Label>
            <Switch
              id="rollover-toggle"
              checked={rolloverEnabled}
              onCheckedChange={setRolloverEnabled}
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
              <span className="font-medium">
                {rolloverAmount !== 0 ? (
                  <span className="flex items-center gap-1">
                    ${budgeted.toFixed(2)}
                    <span className={rolloverAmount > 0 ? 'text-green-400' : 'text-red-400'}>
                      ({rolloverAmount > 0 ? '+' : ''}{rolloverAmount.toFixed(2)})
                    </span>
                  </span>
                ) : (
                  `$${budgeted.toFixed(2)}`
                )}
              </span>
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
          {(() => {
            const paceIndicator = calculatePaceIndicator(spent, budgeted, currentMonth);
            if (isOver) {
              return (
                <p className="text-xs text-red-400">
                  {percentage.toFixed(0)}% of budget used
                </p>
              );
            } else if (paceIndicator) {
              return (
                <p className={`text-xs ${paceIndicator.isOverPace ? 'text-orange-400' : 'text-[#7aba5c]'}`}>
                  {paceIndicator.text}
                </p>
              );
            }
            return null;
          })()}
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
