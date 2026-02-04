'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { addDebt } from '@/lib/hooks/use-data';
import { DEBT_TYPE_LABELS, type DebtType } from '@/types/database';

const DEBT_TYPES: { value: DebtType; label: string }[] = Object.entries(DEBT_TYPE_LABELS).map(
  ([value, label]) => ({ value: value as DebtType, label })
);

export function AddDebtDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [type, setType] = useState<DebtType>('credit_card');
  const [originalBalance, setOriginalBalance] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [apr, setApr] = useState('');
  const [minimumPayment, setMinimumPayment] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [inCollections, setInCollections] = useState(false);
  const [originationDate, setOriginationDate] = useState('');
  const [termMonths, setTermMonths] = useState('');

  const resetForm = () => {
    setName('');
    setType('credit_card');
    setOriginalBalance('');
    setCurrentBalance('');
    setApr('');
    setMinimumPayment('');
    setMonthlyPayment('');
    setDueDay('');
    setInCollections(false);
    setOriginationDate('');
    setTermMonths('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentBalance) {
      setError('Name and current balance are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await addDebt({
        name: name.trim(),
        type,
        original_balance: originalBalance ? parseFloat(originalBalance) : null,
        current_balance: parseFloat(currentBalance),
        apr: apr ? parseFloat(apr) : 0,
        minimum_payment: minimumPayment ? parseFloat(minimumPayment) : 0,
        monthly_payment: monthlyPayment ? parseFloat(monthlyPayment) : 0,
        due_day: dueDay ? parseInt(dueDay) : null,
        in_collections: inCollections,
        origination_date: originationDate || null,
        term_months: termMonths ? parseInt(termMonths) : null,
      });

      resetForm();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add debt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button data-tour="add-debt" className="gradient-btn border-0">
          <Plus className="mr-2 h-4 w-4" />
          Add Debt
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-background border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a Debt</DialogTitle>
          <DialogDescription>Track a debt to monitor your payoff progress and improve your score.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="debt-name">Name</Label>
            <Input
              id="debt-name"
              placeholder="e.g. Chase Visa, Car Payment, Student Loan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Debt Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as DebtType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEBT_TYPES.map((dt) => (
                  <SelectItem key={dt.value} value={dt.value}>
                    {dt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="original-balance">Original Balance</Label>
              <Input
                id="original-balance"
                type="number"
                step="0.01"
                min="0"
                placeholder="$0.00"
                value={originalBalance}
                onChange={(e) => setOriginalBalance(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current-balance">Current Balance *</Label>
              <Input
                id="current-balance"
                type="number"
                step="0.01"
                min="0"
                placeholder="$0.00"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apr">APR (%)</Label>
            <Input
              id="apr"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="0.00"
              value={apr}
              onChange={(e) => setApr(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="min-payment">Minimum Payment</Label>
              <Input
                id="min-payment"
                type="number"
                step="0.01"
                min="0"
                placeholder="$0.00"
                value={minimumPayment}
                onChange={(e) => setMinimumPayment(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly-payment">You Actually Pay</Label>
              <Input
                id="monthly-payment"
                type="number"
                step="0.01"
                min="0"
                placeholder="$0.00"
                value={monthlyPayment}
                onChange={(e) => setMonthlyPayment(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due-day">Due Day of Month</Label>
            <Input
              id="due-day"
              type="number"
              min="1"
              max="31"
              placeholder="15"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
            />
          </div>

          {/* Amortization fields - only for amortizing debts */}
          {['mortgage', 'heloc', 'auto', 'student', 'personal', 'business', 'secured'].includes(type) && (
            <>
              <div className="space-y-2">
                <Label htmlFor="origination-date">Origination Date (optional)</Label>
                <Input
                  id="origination-date"
                  type="date"
                  value={originationDate}
                  onChange={(e) => setOriginationDate(e.target.value)}
                  placeholder="When was this loan taken out?"
                />
                <p className="text-xs text-muted-foreground">
                  Track how far ahead or behind schedule you are
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="term-months">Loan Term (optional)</Label>
                <Input
                  id="term-months"
                  type="number"
                  min="1"
                  placeholder="e.g. 60"
                  value={termMonths}
                  onChange={(e) => setTermMonths(e.target.value)}
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  {[36, 48, 60, 72, 120, 180, 240, 360].map((months) => (
                    <button
                      key={months}
                      type="button"
                      onClick={() => setTermMonths(String(months))}
                      className="text-xs px-2 py-1 rounded bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      {months < 12 ? `${months}mo` : `${Math.floor(months / 12)}yr`}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="in-collections"
              checked={inCollections}
              onChange={(e) => setInCollections(e.target.checked)}
              className="rounded border-border"
            />
            <Label htmlFor="in-collections" className="text-sm font-normal cursor-pointer">
              This debt is in collections
            </Label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 gradient-btn border-0">
              {loading ? 'Adding...' : 'Add Debt'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
