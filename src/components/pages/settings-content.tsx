'use client';

import { useState, useEffect } from 'react';
import { useSettings, updateSettings, addAccount, updateAccount, deleteAccount } from '@/lib/hooks/use-data';
import { useTour } from '@/components/tour/tour-provider';
import { resetTour } from '@/components/tour/tour-steps';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  User,
  DollarSign,
  CreditCard,
  Crown,
  Key,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Save,
  Wallet,
  PiggyBank,
  Banknote,
  TrendingUp,
  Check,
  X,
  Download,
  Info,
  Filter,
  Calendar,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PlaidConnectSection } from '@/components/plaid/plaid-connect-section';
import { getUserTier } from '@/lib/ai/rate-limiter';
import { ExportDialog } from '@/components/export/export-dialog';
import { FinancialDisclaimer } from '@/components/financial-disclaimer';

// ============================================================
// ACCOUNT TYPE HELPERS
// ============================================================

const accountTypeConfig: Record<string, { label: string; icon: typeof Wallet }> = {
  checking: { label: 'Checking', icon: Wallet },
  savings: { label: 'Savings', icon: PiggyBank },
  credit_card: { label: 'Credit Card', icon: CreditCard },
  cash: { label: 'Cash', icon: Banknote },
  investment: { label: 'Investment', icon: TrendingUp },
};

// ============================================================
// PROFILE SECTION
// ============================================================

function ProfileSection({ profile, onSave }: { profile: Record<string, unknown> | null; onSave: () => void }) {
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name as string);
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({ full_name: fullName });
      toast.success('Profile updated');
      onSave();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-[#1a7a6d]" />
          <CardTitle>Profile</CardTitle>
        </div>
        <CardDescription>Your personal information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="full-name">Full Name</Label>
          <Input
            id="full-name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={(profile?.email as string) || ''}
            disabled
            className="opacity-60"
          />
          <p className="text-xs text-muted-foreground">Email cannot be changed</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || fullName === (profile?.full_name as string)}
          className="gradient-btn border-0"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Profile
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================
// INCOME SECTION
// ============================================================

function IncomeSection({ profile, onSave }: { profile: Record<string, unknown> | null; onSave: () => void }) {
  const [income, setIncome] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.monthly_income) {
      setIncome(String(profile.monthly_income));
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const monthlyValue = parseFloat(income) || 0;
      if (monthlyValue < 0) {
        toast.error('Income must be a positive number');
        return;
      }
      await updateSettings({ monthly_income: monthlyValue });
      toast.success('Income updated');
      onSave();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update income');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-[#7aba5c]" />
          <CardTitle>Monthly Income</CardTitle>
        </div>
        <CardDescription>Your monthly take-home pay after taxes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="monthly-income">Monthly Income</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
            <Input
              id="monthly-income"
              type="number"
              min="0"
              step="0.01"
              value={income}
              onChange={e => setIncome(e.target.value)}
              placeholder="0.00"
              className="pl-7"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pay-frequency">Pay Frequency</Label>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger id="pay-frequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="biweekly">Biweekly</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {frequency === 'monthly' && 'Enter your total monthly take-home pay'}
            {frequency === 'biweekly' && 'Enter your monthly equivalent (biweekly × 26 ÷ 12)'}
            {frequency === 'weekly' && 'Enter your monthly equivalent (weekly × 52 ÷ 12)'}
          </p>
        </div>
        <div className="flex items-start gap-2 rounded-lg bg-[#1a7a6d1a] border border-[#1a7a6d33] p-3">
          <Info className="h-4 w-4 text-[#1a7a6d] mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            This helps AI coaching, budgeting, and your Financial Health Score work better.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || income === String(profile?.monthly_income || '')}
          className="gradient-btn border-0"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Income
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================
// PAY SCHEDULE SECTION
// ============================================================

function PayScheduleSection({ profile, onSave }: { profile: Record<string, unknown> | null; onSave: () => void }) {
  const [payFrequency, setPayFrequency] = useState('monthly');
  const [nextPayDate, setNextPayDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.pay_frequency) setPayFrequency(profile.pay_frequency as string);
    if (profile?.next_pay_date) setNextPayDate(profile.next_pay_date as string);
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({ 
        pay_frequency: payFrequency,
        next_pay_date: nextPayDate || null,
      });
      toast.success('Pay schedule updated');
      onSave();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update pay schedule');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = 
    payFrequency !== (profile?.pay_frequency || 'monthly') ||
    nextPayDate !== (profile?.next_pay_date || '');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-[#1a7a6d]" />
          <CardTitle>Pay Schedule</CardTitle>
        </div>
        <CardDescription>When and how often you get paid</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pay-frequency">Pay Frequency</Label>
          <Select value={payFrequency} onValueChange={setPayFrequency}>
            <SelectTrigger id="pay-frequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="biweekly">Bi-weekly (every 2 weeks)</SelectItem>
              <SelectItem value="semimonthly">Semi-monthly (twice per month)</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {payFrequency !== 'monthly' && (
          <div className="space-y-2">
            <Label htmlFor="next-pay-date">Next Pay Date</Label>
            <Input
              id="next-pay-date"
              type="date"
              value={nextPayDate}
              onChange={e => setNextPayDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This helps us show which bills are covered by each paycheck
            </p>
          </div>
        )}

        {payFrequency !== 'monthly' && (
          <div className="flex items-start gap-2 rounded-lg bg-[#1a7a6d1a] border border-[#1a7a6d33] p-3">
            <Info className="h-4 w-4 text-[#1a7a6d] mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              We&apos;ll show a paycheck planner on your budgets page to help allocate expenses across paychecks.
            </p>
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="gradient-btn border-0"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Pay Schedule
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================
// ACCOUNTS SECTION
// ============================================================

interface AccountItem {
  id: string;
  name: string;
  type: string;
  balance: number;
  is_active: boolean;
}

function AccountsSection({ accounts, onRefresh }: { accounts: AccountItem[]; onRefresh: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBalance, setEditBalance] = useState('');
  const [editName, setEditName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: '', type: 'checking', balance: '' });
  const [submitting, setSubmitting] = useState(false);

  const suggestedNames: Record<string, string> = {
    checking: 'Main Checking',
    savings: 'Savings',
    credit_card: 'Credit Card',
    cash: 'Cash',
    investment: 'Investment',
  };

  const handleStartEdit = (account: AccountItem) => {
    setEditingId(account.id);
    setEditBalance(String(account.balance));
    setEditName(account.name);
  };

  const handleSaveEdit = async (id: string) => {
    setSubmitting(true);
    try {
      await updateAccount({ id, name: editName, balance: parseFloat(editBalance) || 0 });
      toast.success('Account updated');
      setEditingId(null);
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSubmitting(true);
    try {
      await deleteAccount(id);
      toast.success('Account removed');
      setDeleteConfirm(null);
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccount.name && !suggestedNames[newAccount.type]) {
      toast.error('Please enter an account name');
      return;
    }
    setSubmitting(true);
    try {
      await addAccount({
        name: newAccount.name || suggestedNames[newAccount.type],
        type: newAccount.type,
        balance: parseFloat(newAccount.balance) || 0,
      });
      toast.success('Account added');
      setAddOpen(false);
      setNewAccount({ name: '', type: 'checking', balance: '' });
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-400" />
            <CardTitle>Accounts</CardTitle>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Account</DialogTitle>
                <DialogDescription>Add a new financial account to track</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <Select
                    value={newAccount.type}
                    onValueChange={v => setNewAccount(a => ({
                      ...a,
                      type: v,
                      name: a.name || suggestedNames[v] || '',
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(accountTypeConfig).map(([value, { label }]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input
                    value={newAccount.name}
                    onChange={e => setNewAccount(a => ({ ...a, name: e.target.value }))}
                    placeholder={suggestedNames[newAccount.type] || 'Account name'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Balance</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={newAccount.balance}
                      onChange={e => setNewAccount(a => ({ ...a, balance: e.target.value }))}
                      placeholder="0.00"
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={handleAddAccount} disabled={submitting} className="gradient-btn border-0">
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Add Account
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>Manage your financial accounts</CardDescription>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <div className="text-center py-6">
            <Wallet className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">No accounts yet</p>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Account
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map(account => {
              const config = accountTypeConfig[account.type] || accountTypeConfig.checking;
              const Icon = config.icon;
              const isEditing = editingId === account.id;

              return (
                <div
                  key={account.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-secondary/30 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {isEditing ? (
                    <div className="flex-1 flex flex-col sm:flex-row gap-2">
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="h-8 text-sm"
                        placeholder="Account name"
                      />
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={editBalance}
                          onChange={e => setEditBalance(e.target.value)}
                          className="h-8 text-sm pl-6 w-32"
                        />
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSaveEdit(account.id)}
                          disabled={submitting}
                          className="h-8 w-8 p-0"
                        >
                          <Check className="h-4 w-4 text-[#7aba5c]" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{account.name}</p>
                        <p className="text-xs text-muted-foreground">{config.label}</p>
                      </div>
                      <span className="font-semibold text-sm tabular-nums">
                        ${account.balance.toFixed(2)}
                      </span>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStartEdit(account)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Dialog
                          open={deleteConfirm === account.id}
                          onOpenChange={open => !open && setDeleteConfirm(null)}
                        >
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteConfirm(account.id)}
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete Account</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to remove &quot;{account.name}&quot;? This will hide the account but won&apos;t delete your transaction history.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleDelete(account.id)}
                                disabled={submitting}
                              >
                                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                Delete
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// CATEGORY RULES SECTION
// ============================================================

interface CategoryRule {
  id: string;
  payee_pattern: string;
  match_type: string;
  created_at: string;
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
}

function CategoryRulesSection() {
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/category-rules');
      if (!response.ok) throw new Error('Failed to fetch rules');
      const data = await response.json();
      setRules(data.rules || []);
    } catch (error) {
      toast.error('Failed to load category rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const response = await fetch(`/api/category-rules?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete rule');
      toast.success('Rule deleted');
      await fetchRules();
    } catch (error) {
      toast.error('Failed to delete rule');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-[#1a7a6d]" />
          <CardTitle>Category Rules</CardTitle>
        </div>
        <CardDescription>
          Auto-categorization rules for transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-6">
            <Filter className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">No rules yet</p>
            <p className="text-xs text-muted-foreground">
              Change a transaction&apos;s category to create your first rule
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-secondary/30 transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: `${rule.category.color}20`,
                  }}
                >
                  <div style={{ color: rule.category.color }}>
                    {/* Icon placeholder - could use getCategoryIcon here */}
                    <Filter className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {rule.payee_pattern}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    → {rule.category.name}
                    <span className="ml-2 opacity-60">
                      ({rule.match_type === 'exact' ? 'Exact match' : 'Contains'})
                    </span>
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(rule.id)}
                  disabled={deleting === rule.id}
                  className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                >
                  {deleting === rule.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// SUBSCRIPTION SECTION
// ============================================================

const tierConfig = {
  free: {
    label: 'Free',
    color: 'bg-gray-500/20 text-gray-400',
    features: ['Manual transactions', 'Basic budgets', '3 AI insights/day', 'Financial Health Score'],
  },
  plus: {
    label: 'Plus',
    color: 'bg-[#1a7a6d33] text-[#1a7a6d]',
    features: ['Everything in Free', '15 AI insights/day', 'AI Coaching', 'Auto-Budget', 'Receipt scanning'],
  },
  pro: {
    label: 'Pro',
    color: 'bg-teal-500/20 text-teal-400',
    features: ['Everything in Plus', 'Unlimited AI', 'Priority support', 'Data export', 'Advanced analytics'],
  },
};

function SubscriptionSection({ profile }: { profile: Record<string, unknown> | null }) {
  const tier = (profile?.subscription_tier as string) || 'free';
  const status = (profile?.subscription_status as string) || 'active';
  const config = tierConfig[tier as keyof typeof tierConfig] || tierConfig.free;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-teal-400" />
          <CardTitle>Subscription</CardTitle>
        </div>
        <CardDescription>Your current plan and features</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Badge className={cn('text-sm px-3 py-1', config.color)}>
            {config.label}
          </Badge>
          {status === 'active' && (
            <Badge variant="outline" className="text-[#7aba5c] border-[#7aba5c]/30">Active</Badge>
          )}
          {status === 'canceled' && (
            <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">Canceled</Badge>
          )}
          {status === 'past_due' && (
            <Badge variant="outline" className="text-red-400 border-red-400/30">Past Due</Badge>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {Object.entries(tierConfig).map(([key, tc]) => (
            <div
              key={key}
              className={cn(
                'rounded-lg border p-4 space-y-3',
                key === tier ? 'border-[#1a7a6d80] bg-[#1a7a6d0d]' : 'border-border'
              )}
            >
              <div className="flex items-center justify-between">
                <Badge className={cn('text-xs', tc.color)}>{tc.label}</Badge>
                {key === tier && (
                  <span className="text-xs text-[#1a7a6d] font-medium">Current</span>
                )}
              </div>
              <ul className="space-y-1.5">
                {tc.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 mt-0.5 text-[#7aba5c] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {tier === 'free' && (
          <Button className="gradient-btn border-0 w-full sm:w-auto">
            <Crown className="mr-2 h-4 w-4" />
            Upgrade to Plus
          </Button>
        )}
        {tier !== 'free' && (
          <Button variant="outline" className="w-full sm:w-auto">
            Manage Subscription
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// AI / BYOK SECTION
// ============================================================

function AIKeySection({ profile, onSave }: { profile: Record<string, unknown> | null; onSave: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const hasKey = !!(profile?.openrouter_api_key);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({ openrouter_api_key: apiKey });
      toast.success('API key saved');
      setApiKey('');
      onSave();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save API key');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await updateSettings({ openrouter_api_key: null });
      toast.success('API key removed');
      onSave();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear API key');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-[#22a090]" />
          <CardTitle>AI / Bring Your Own Key</CardTitle>
        </div>
        <CardDescription>Bring your own OpenRouter API key for unlimited AI features</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasKey && (
          <div className="flex items-center gap-2 rounded-lg bg-[#6db555]/10 border border-[#6db555]/20 p-3">
            <Check className="h-4 w-4 text-[#7aba5c] shrink-0" />
            <p className="text-sm text-[#7aba5c]">
              API key set: {profile?.openrouter_api_key as string}
            </p>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="api-key">{hasKey ? 'Replace API Key' : 'OpenRouter API Key'}</Label>
          <Input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-or-v1-..."
          />
          <p className="text-xs text-muted-foreground">
            Get your key at{' '}
            <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-[#1a7a6d] hover:underline">
              openrouter.ai/keys
            </a>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={saving || !apiKey}
            className="gradient-btn border-0"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Key
          </Button>
          {hasKey && (
            <Button variant="outline" onClick={handleClear} disabled={saving}>
              <X className="mr-2 h-4 w-4" />
              Clear Key
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// DANGER ZONE
// ============================================================

function DangerZone() {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const response = await fetch('/api/settings/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      // Success - show message and redirect
      toast.success('Account deleted successfully');
      
      // Sign out and redirect to home
      // Use window.location for a full page reload to clear all state
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error) {
      console.error('Delete account error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete account');
      setDeleting(false);
    }
  };

  return (
    <Card className="border-red-500/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <CardTitle className="text-red-400">Danger Zone</CardTitle>
        </div>
        <CardDescription>Irreversible actions — proceed with caution</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <ExportDialog 
            mode="full" 
            trigger={
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </Button>
            }
          />

          <Dialog open={deleteOpen} onOpenChange={(open) => {
            setDeleteOpen(open);
            if (!open) setConfirmText('');
          }}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Your Account</DialogTitle>
                <DialogDescription>
                  This will permanently delete your account and all associated data. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 space-y-2">
                  <p className="text-sm font-medium text-red-400">
                    The following will be permanently deleted:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                    <li>• All transactions and financial data</li>
                    <li>• All budgets and spending plans</li>
                    <li>• Savings goals and progress</li>
                    <li>• Debt tracking and payment history</li>
                    <li>• Connected bank accounts (Plaid)</li>
                    <li>• Financial Health Score history</li>
                    <li>• AI usage and insights</li>
                    <li>• Your profile and settings</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delete-confirm">Type &quot;DELETE&quot; to confirm</Label>
                  <Input
                    id="delete-confirm"
                    value={confirmText}
                    onChange={e => setConfirmText(e.target.value)}
                    placeholder="DELETE"
                    autoComplete="off"
                    disabled={deleting}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => { 
                    setDeleteOpen(false); 
                    setConfirmText(''); 
                  }}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={confirmText !== 'DELETE' || deleting}
                  onClick={handleDeleteAccount}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Permanently Delete
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// TOUR SECTION
// ============================================================

function TourSection() {
  const { startTour } = useTour();
  const [resetting, setResetting] = useState(false);

  const handleRestartMainTour = () => {
    resetTour('main');
    startTour('main');
    toast.success('Tour restarted! Follow the guide to learn about Thallo.');
  };

  const handleResetAllTours = async () => {
    setResetting(true);
    resetTour(); // Reset all tours
    toast.success('All tours reset! They will appear again when you visit each page.');
    setTimeout(() => setResetting(false), 500);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-[#1a7a6d]" />
          <CardTitle>Guided Tours</CardTitle>
        </div>
        <CardDescription>Replay the onboarding tours anytime</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Button
            onClick={handleRestartMainTour}
            variant="outline"
            className="w-full justify-start"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Restart Main Tour
          </Button>
          <p className="text-xs text-muted-foreground">
            Replay the full product tour from the dashboard
          </p>
        </div>

        <Separator />

        <div className="space-y-2">
          <Button
            onClick={handleResetAllTours}
            variant="outline"
            className="w-full justify-start"
            disabled={resetting}
          >
            {resetting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-2 h-4 w-4" />
            )}
            Reset All Tours
          </Button>
          <p className="text-xs text-muted-foreground">
            Clear all tour progress — tours will auto-start when you visit each page
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// LOADING STATE
// ============================================================

function SettingsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="h-4 w-48 bg-muted rounded animate-pulse mt-2" />
      </div>
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-5 w-24 bg-muted rounded animate-pulse" />
              <div className="h-10 w-full bg-muted rounded animate-pulse" />
              <div className="h-10 w-32 bg-muted rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================
// MAIN SETTINGS CONTENT
// ============================================================

export function SettingsContent() {
  const { profile, accounts, isLoading, refresh } = useSettings();
  const userTier = (profile?.subscription_tier as 'free' | 'plus' | 'pro') || 'free';

  if (isLoading) return <SettingsLoading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <ProfileSection profile={profile} onSave={refresh} />
          <IncomeSection profile={profile} onSave={refresh} />
          <PayScheduleSection profile={profile} onSave={refresh} />
          <CategoryRulesSection />
          <AIKeySection profile={profile} onSave={refresh} />
        </div>
        <div className="space-y-6">
          <AccountsSection accounts={accounts} onRefresh={refresh} />
          <PlaidConnectSection userTier={userTier} />
          <TourSection />
          <SubscriptionSection profile={profile} />
          <DangerZone />
        </div>
      </div>

      {/* Financial Disclaimer */}
      <FinancialDisclaimer />
    </div>
  );
}
