'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, PlusCircle, MinusCircle } from 'lucide-react';
import { revalidateAll } from '@/lib/hooks/use-data';

interface ManualSpendDialogProps {
  categoryId: string;
  categoryName: string;
  onSuccess?: () => void;
}

type SpendMode = 'add' | 'reduce';

export function ManualSpendDialog({ categoryId, categoryName, onSuccess }: ManualSpendDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<SpendMode>('add');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const spendAmount = parseFloat(amount);
    if (isNaN(spendAmount) || spendAmount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    // For reductions, send negative amount
    const finalAmount = mode === 'reduce' ? -spendAmount : spendAmount;

    setSaving(true);
    try {
      const res = await fetch('/api/transactions/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: categoryId,
          amount: finalAmount,
          note: note.trim() || (mode === 'reduce' ? 'Correction/refund' : undefined),
          date,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save');
      }

      toast.success(mode === 'add' ? 'Spend logged' : 'Spend reduced');
      setOpen(false);
      setAmount('');
      setNote('');
      setMode('add');
      setDate(new Date().toISOString().split('T')[0]);
      // Revalidate ALL caches — dashboard, budgets, transactions, score
      revalidateAll();
      onSuccess?.();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to save';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title={`Log spend for ${categoryName}`}
      >
        <PlusCircle className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{mode === 'add' ? 'Log Spend' : 'Reduce Spend'}: {categoryName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Add / Reduce toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('add')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  mode === 'add'
                    ? 'border-[#1a7a6d80] bg-[#1a7a6d1a] text-[#1a7a6d]'
                    : 'border-border bg-muted/10 text-muted-foreground hover:bg-muted/20'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                Add
              </button>
              <button
                type="button"
                onClick={() => setMode('reduce')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  mode === 'reduce'
                    ? 'border-[#7aba5c80] bg-[#7aba5c1a] text-[#7aba5c]'
                    : 'border-border bg-muted/10 text-muted-foreground hover:bg-muted/20'
                }`}
              >
                <MinusCircle className="w-4 h-4" />
                Reduce
              </button>
            </div>

            <div>
              <label className="text-sm font-medium">Amount</label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {mode === 'reduce' ? '-$' : '$'}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={mode === 'reduce' ? 'pl-9' : 'pl-7'}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              {mode === 'reduce' && (
                <p className="text-xs text-muted-foreground mt-1">This will reduce the spent amount for this category</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Note (Optional)</label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1.5 resize-none"
                placeholder={mode === 'reduce' ? 'e.g. Refund, correction, wrong category' : 'What did you spend on?'}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className={`flex-1 ${mode === 'reduce' ? 'bg-[#7aba5c] hover:bg-[#5a9a3f]' : ''}`}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : mode === 'reduce' ? (
                  'Reduce Spend'
                ) : (
                  'Save Spend'
                )}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
