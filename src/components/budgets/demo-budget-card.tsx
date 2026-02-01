'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getBudgetBarStyle } from '@/lib/bar-colors';
import { Pencil, Check, X } from 'lucide-react';
import { getCategoryIcon } from '@/lib/category-icons';
import { toast } from 'sonner';

interface DemoBudgetCardProps {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  budgeted: number;
  spent: number;
  onUpdate: (newAmount: number) => void;
}

export function DemoBudgetCard({
  categoryName,
  categoryIcon,
  categoryColor,
  budgeted,
  spent,
  onUpdate,
}: DemoBudgetCardProps) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(budgeted.toString());

  const percentage = budgeted > 0 ? (spent / budgeted) * 100 : 0;
  const isOver = percentage > 100;
  const remaining = budgeted - spent;

  const handleSave = () => {
    const newAmount = parseFloat(amount);
    if (isNaN(newAmount) || newAmount < 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    onUpdate(newAmount);
    toast.success('Budget updated!');
    setEditing(false);
  };

  const handleCancel = () => {
    setAmount(budgeted.toString());
    setEditing(false);
  };

  const IconComponent = getCategoryIcon(categoryIcon, categoryName);

  return (
    <div className="glass-card rounded-xl p-5 transition-all hover:border-[#1a7a6d4d]">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ 
              backgroundColor: categoryColor ? `${categoryColor}20` : 'rgba(168, 85, 247, 0.1)',
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
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-border"
              onClick={handleCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : budgeted > 0 ? (
        /* Budget Progress */
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">${spent.toFixed(2)} spent</span>
            <span className="font-medium">${budgeted.toFixed(2)}</span>
          </div>
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
