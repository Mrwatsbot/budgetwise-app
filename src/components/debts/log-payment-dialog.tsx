'use client';

import { useState } from 'react';
import { DollarSign, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { logDebtPayment } from '@/lib/hooks/use-data';
import type { Debt } from '@/types/database';

interface LogPaymentDialogProps {
  debt: Debt;
  trigger?: React.ReactNode;
}

export function LogPaymentDialog({ debt, trigger }: LogPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [amount, setAmount] = useState(debt.monthly_payment?.toString() || debt.minimum_payment?.toString() || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const isExtra = parseFloat(amount || '0') > (debt.minimum_payment || 0);
  const newBalance = Math.max(0, debt.current_balance - parseFloat(amount || '0'));
  const isPaidOff = newBalance === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError('Enter a valid payment amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await logDebtPayment({
        debt_id: debt.id,
        amount: parseFloat(amount),
        date,
        is_extra: isExtra,
        balance_after: newBalance,
        is_paid_off: isPaidOff,
      });

      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" className="gap-1">
            <DollarSign className="h-3 w-3" />
            Pay
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm bg-background border-border">
        <DialogHeader>
          <DialogTitle>Log Payment — {debt.name}</DialogTitle>
          <DialogDescription>
            Balance: ${debt.current_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="pay-amount">Payment Amount</Label>
            <Input
              id="pay-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={debt.current_balance}
              placeholder="$0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
            {isExtra && parseFloat(amount || '0') > 0 && (
              <p className="text-xs text-[#7aba5c] flex items-center gap-1">
                <Flame className="w-3 h-3 inline" /> Extra payment! ${(parseFloat(amount) - (debt.minimum_payment || 0)).toFixed(2)} above minimum
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pay-date">Date</Label>
            <Input
              id="pay-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="rounded-lg bg-secondary/50 p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current balance</span>
              <span>${debt.current_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment</span>
              <span className="text-[#7aba5c]">-${parseFloat(amount || '0').toFixed(2)}</span>
            </div>
            <div className="border-t border-border pt-1 flex justify-between font-medium">
              <span>New balance</span>
              <span className={isPaidOff ? 'text-[#7aba5c]' : ''}>
                {isPaidOff ? '$0.00 — PAID OFF!' : `$${newBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 gradient-btn border-0">
              {loading ? 'Logging...' : isPaidOff ? 'Pay Off!' : 'Log Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
