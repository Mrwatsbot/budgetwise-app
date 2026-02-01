'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Plus, Loader2 } from 'lucide-react';
import { getCategoryIcon } from '@/lib/category-icons';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  icon: string;
  type: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
}

interface AddTransactionDialogProps {
  categories: Category[];
  accounts: Account[];
  userId: string;
  onRefresh?: () => void;
}

export function AddTransactionDialog({ categories, accounts, userId, onRefresh }: AddTransactionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    amount: '',
    payee: '',
    categoryId: '',
    accountId: accounts[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    memo: '',
    type: 'expense' as 'expense' | 'income',
  });

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');
  const activeCategories = formData.type === 'expense' ? expenseCategories : incomeCategories;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      
      // Calculate amount (negative for expenses, positive for income)
      const amount = formData.type === 'expense' 
        ? -Math.abs(parseFloat(formData.amount))
        : Math.abs(parseFloat(formData.amount));

      const { error } = await supabase.from('transactions').insert({
        user_id: userId,
        account_id: formData.accountId,
        category_id: formData.categoryId || null,
        amount,
        payee_original: formData.payee,
        payee_clean: formData.payee,
        date: formData.date,
        memo: formData.memo || null,
        is_cleared: true,
      } as any);

      if (error) throw error;

      toast.success('Transaction added!');
      setOpen(false);
      setFormData({
        amount: '',
        payee: '',
        categoryId: '',
        accountId: accounts[0]?.id || '',
        date: new Date().toISOString().split('T')[0],
        memo: '',
        type: 'expense',
      });
      if (onRefresh) {
        onRefresh();
      } else {
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>
              Enter the details of your transaction.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Type Toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={formData.type === 'expense' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setFormData(f => ({ ...f, type: 'expense', categoryId: '' }))}
              >
                Expense
              </Button>
              <Button
                type="button"
                variant={formData.type === 'income' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setFormData(f => ({ ...f, type: 'income', categoryId: '' }))}
              >
                Income
              </Button>
            </div>

            {/* Amount */}
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-7"
                  value={formData.amount}
                  onChange={(e) => setFormData(f => ({ ...f, amount: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Payee / Source */}
            <div className="grid gap-2">
              <Label htmlFor="payee">
                {formData.type === 'expense' ? 'Payee / Description' : 'Source'}
              </Label>
              <Input
                id="payee"
                placeholder={formData.type === 'expense' ? 'e.g., Grocery Store' : 'e.g., Employer, Freelance Client'}
                value={formData.payee}
                onChange={(e) => setFormData(f => ({ ...f, payee: e.target.value }))}
                required
              />
            </div>

            {/* Category */}
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData(f => ({ ...f, categoryId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {activeCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        {(() => {
                          const Icon = getCategoryIcon(cat.icon, cat.name);
                          return <Icon className="w-4 h-4 text-muted-foreground" />;
                        })()}
                        <span>{cat.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Account */}
            {accounts.length > 1 && (
              <div className="grid gap-2">
                <Label>Account</Label>
                <Select
                  value={formData.accountId}
                  onValueChange={(value) => setFormData(f => ({ ...f, accountId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date */}
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(f => ({ ...f, date: e.target.value }))}
                required
              />
            </div>

            {/* Memo (optional) */}
            <div className="grid gap-2">
              <Label htmlFor="memo">Notes (optional)</Label>
              <Input
                id="memo"
                placeholder="Add a note..."
                value={formData.memo}
                onChange={(e) => setFormData(f => ({ ...f, memo: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Transaction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
