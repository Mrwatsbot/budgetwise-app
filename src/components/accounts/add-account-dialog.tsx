'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Plus, Loader2, Wallet, CreditCard, PiggyBank, Briefcase, Banknote } from 'lucide-react';
import { toast } from 'sonner';

const accountTypes = [
  { value: 'checking', label: 'Checking', icon: Wallet },
  { value: 'savings', label: 'Savings', icon: PiggyBank },
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'investment', label: 'Investment', icon: Briefcase },
];

interface AddAccountDialogProps {
  userId: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function AddAccountDialog({ userId, onSuccess, trigger }: AddAccountDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'checking',
    balance: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          balance: formData.balance ? parseFloat(formData.balance) : 0,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create account');
      }

      toast.success('Account created!');
      setOpen(false);
      setFormData({ name: '', type: 'checking', balance: '' });
      router.refresh();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Account</DialogTitle>
            <DialogDescription>
              Add a new account to track your money.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Account Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Account Name</Label>
              <Input
                id="name"
                placeholder="e.g., My Checking Account"
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            {/* Account Type */}
            <div className="grid gap-2">
              <Label>Account Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData(f => ({ ...f, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        <span>{type.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Starting Balance */}
            <div className="grid gap-2">
              <Label htmlFor="balance">Current Balance</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7"
                  value={formData.balance}
                  onChange={(e) => setFormData(f => ({ ...f, balance: e.target.value }))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your current account balance
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
