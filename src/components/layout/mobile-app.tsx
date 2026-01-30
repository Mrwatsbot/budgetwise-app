'use client';

import { useUser } from '@/hooks/use-user';
import { useDashboard } from '@/hooks/use-dashboard';
import { useTransactions } from '@/hooks/use-transactions';
import { useBudgets } from '@/hooks/use-budgets';
import { useSavings } from '@/hooks/use-savings';
import { MobileTabShell } from './mobile-tab-shell';
import { W2Dashboard } from '@/components/dashboard/w2-dashboard';
import { CreatorDashboard } from '@/components/dashboard/creator-dashboard';
import { TransactionList } from '@/components/transactions/transaction-list';
import { AddTransactionDialog } from '@/components/transactions/add-transaction-dialog';
import { BudgetGrid } from '@/components/budgets/budget-grid';
import { GoalCard } from '@/components/savings/goal-card';
import { AddGoalDialog } from '@/components/savings/add-goal-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { StaggerContainer, StaggerItem } from '@/components/ui/stagger-children';
import { LayoutDashboard, Receipt, PiggyBank, Landmark, Settings, Briefcase, Palette, Loader2, Target, TrendingUp, Calendar, Hash } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { IncomeType, Profile } from '@/types/database';

// ============================
// Dashboard Tab Content
// ============================
function DashboardTab({ userProfile }: { userProfile: Profile }) {
  const {
    accounts,
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    recentTransactions,
    budgets,
    currentMonth,
    isLoading,
  } = useDashboard();

  if (isLoading || !accounts || totalBalance === undefined) {
    return <TabLoading label="Loading dashboard..." />;
  }

  const DashboardComponent = userProfile.income_type === 'creator'
    ? CreatorDashboard
    : W2Dashboard;

  return (
    <DashboardComponent
      userProfile={userProfile}
      accounts={accounts}
      totalBalance={totalBalance}
      monthlyIncome={monthlyIncome!}
      monthlyExpenses={monthlyExpenses!}
      recentTransactions={recentTransactions || []}
      budgets={budgets || []}
      currentMonth={currentMonth || ''}
    />
  );
}

// ============================
// Transactions Tab Content
// ============================
function TransactionsTab() {
  const { user } = useUser();
  const {
    categories,
    accounts,
    transactions,
    isLoading,
    mutate,
  } = useTransactions();

  if (isLoading || !categories || !accounts || !transactions) {
    return <TabLoading label="Loading transactions..." />;
  }

  const hasAccounts = accounts.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">
            {transactions.length} transactions
          </p>
        </div>
        {hasAccounts && user ? (
          <AddTransactionDialog
            categories={categories}
            accounts={accounts}
            userId={user.id}
            onMutate={() => mutate()}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Create an account first
          </p>
        )}
      </div>
      <TransactionList
        transactions={transactions as any}
        showAccount={accounts.length > 1}
        onMutate={() => mutate()}
      />
    </div>
  );
}

// ============================
// Budgets Tab Content
// ============================
function BudgetsTab() {
  const { user } = useUser();
  const {
    categoryBudgets,
    totalBudgeted,
    totalSpent,
    currentMonthStr,
    monthName,
    isLoading,
    mutate,
  } = useBudgets();

  if (isLoading || !categoryBudgets || totalBudgeted === undefined || totalSpent === undefined) {
    return <TabLoading label="Loading budgets..." />;
  }

  const remaining = totalBudgeted - totalSpent;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Budgets</h1>
          <p className="text-muted-foreground">{monthName}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Budgeted</p>
            <p className="text-lg font-bold">
              <AnimatedNumber value={totalBudgeted} format="integer" prefix="$" />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Spent</p>
            <p className="text-lg font-bold text-red-500">
              <AnimatedNumber value={totalSpent} format="integer" prefix="$" />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className={cn('text-lg font-bold', remaining >= 0 ? 'text-green-500' : 'text-red-500')}>
              <AnimatedNumber value={remaining} format="integer" prefix="$" />
            </p>
          </CardContent>
        </Card>
      </div>

      <BudgetGrid
        categoryBudgets={categoryBudgets}
        currentMonth={currentMonthStr!}
        userId={user?.id || ''}
        onMutate={() => mutate()}
      />
    </div>
  );
}

// ============================
// Savings Tab Content
// ============================
function SavingsTab() {
  const { user } = useUser();
  const {
    goals,
    totalSaved,
    totalTarget,
    totalMonthlyContribution,
    isLoading,
    mutate,
  } = useSavings();

  if (isLoading || !goals || totalSaved === undefined) {
    return <TabLoading label="Loading savings..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Savings & Investments</h1>
        </div>
        <AddGoalDialog userId={user?.id || ''} onMutate={() => mutate()} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-4 w-4 mx-auto mb-1 text-[#e8922e]" />
            <p className="text-xs text-muted-foreground">Total Saved</p>
            <p className="text-lg font-bold">
              <AnimatedNumber value={totalSaved} format="integer" prefix="$" />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-400" />
            <p className="text-xs text-muted-foreground">Monthly</p>
            <p className="text-lg font-bold">
              <AnimatedNumber value={totalMonthlyContribution || 0} format="integer" prefix="$" />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-4 w-4 mx-auto mb-1 text-[#f0a030]" />
            <p className="text-xs text-muted-foreground">Target</p>
            <p className="text-lg font-bold">
              <AnimatedNumber value={totalTarget || 0} format="integer" prefix="$" />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Hash className="h-4 w-4 mx-auto mb-1 text-amber-400" />
            <p className="text-xs text-muted-foreground">Goals</p>
            <p className="text-lg font-bold">{goals.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Goals */}
      {goals.length > 0 ? (
        <StaggerContainer className="grid gap-4 sm:grid-cols-2">
          {goals.map((goal: any) => (
            <StaggerItem key={goal.id}>
              <GoalCard goal={goal} onMutate={() => mutate()} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-3">No savings goals yet</p>
            <AddGoalDialog userId={user?.id || ''} onMutate={() => mutate()} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================
// Settings Tab Content
// ============================
function SettingsTab({ userProfile }: { userProfile: Profile }) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);

  const currentIncomeType = userProfile.income_type || 'w2';

  const handleIncomeTypeChange = async (newType: IncomeType) => {
    setUpdating(true);
    try {
      const supabase = createClient();
      const updateData: Record<string, any> = { income_type: newType };
      const { error } = await (supabase
        .from('profiles')
        .update as any)(updateData)
        .eq('id', userProfile.id);

      if (error) throw error;

      toast.success(`Switched to ${newType === 'w2' ? 'W2' : 'Creator'} mode`);
      router.refresh();
    } catch (error: any) {
      toast.error('Failed to update: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      {/* Income Type Card */}
      <Card>
        <CardHeader>
          <CardTitle>Income Type</CardTitle>
          <CardDescription>
            Choose how your dashboard is tailored
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <button
              onClick={() => handleIncomeTypeChange('w2')}
              disabled={updating || currentIncomeType === 'w2'}
              className={cn(
                'flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
                'hover:border-[#e8922e80] hover:bg-[#e8922e0d] disabled:opacity-50 disabled:cursor-not-allowed',
                currentIncomeType === 'w2'
                  ? 'border-[#e8922e80] bg-[#e8922e1a]'
                  : 'border-border bg-secondary/30'
              )}
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#e8922e33] to-[#f0ad3033] border border-[#e8922e4d] flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-[#f0a030]" />
              </div>
              <div className="flex-1">
                <p className="font-medium">W2 / Salary</p>
                <p className="text-sm text-muted-foreground">Regular paycheck</p>
              </div>
              {currentIncomeType === 'w2' && (
                <div className="px-3 py-1 rounded-full bg-[#e8922e33] text-[#e8922e] text-xs font-medium">
                  Current
                </div>
              )}
            </button>

            <button
              onClick={() => handleIncomeTypeChange('creator')}
              disabled={updating || currentIncomeType === 'creator'}
              className={cn(
                'flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
                'hover:border-[#e8922e80] hover:bg-[#e8922e0d] disabled:opacity-50 disabled:cursor-not-allowed',
                currentIncomeType === 'creator'
                  ? 'border-[#e8922e80] bg-[#e8922e1a]'
                  : 'border-border bg-secondary/30'
              )}
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#e8922e33] to-[#f0ad3033] border border-[#e8922e4d] flex items-center justify-center">
                <Palette className="h-6 w-6 text-[#f0a030]" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Creator / Freelancer</p>
                <p className="text-sm text-muted-foreground">Variable income</p>
              </div>
              {currentIncomeType === 'creator' && (
                <div className="px-3 py-1 rounded-full bg-[#e8922e33] text-[#e8922e] text-xs font-medium">
                  Current
                </div>
              )}
            </button>
          </div>

          {updating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-sm text-muted-foreground">Email</Label>
            <p className="text-sm font-medium">{userProfile.email}</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Name</Label>
            <p className="text-sm font-medium">{userProfile.full_name || 'Not set'}</p>
          </div>
          <div className="pt-4">
            <Button variant="outline" className="text-red-400 hover:text-red-300" onClick={handleLogout}>
              Log Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================
// Loading Placeholder
// ============================
function TabLoading({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-[#e8922e] mb-3" />
      <p className="text-muted-foreground text-sm">{label}</p>
    </div>
  );
}

// ============================
// Main Mobile App Component
// ============================
export function MobileApp({ userProfile }: { userProfile: Profile }) {
  const tabs = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      content: <DashboardTab userProfile={userProfile} />,
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: Receipt,
      content: <TransactionsTab />,
    },
    {
      id: 'budgets',
      label: 'Budgets',
      icon: PiggyBank,
      content: <BudgetsTab />,
    },
    {
      id: 'savings',
      label: 'Savings',
      icon: Landmark,
      content: <SavingsTab />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      content: <SettingsTab userProfile={userProfile} />,
    },
  ];

  return <MobileTabShell tabs={tabs} />;
}
