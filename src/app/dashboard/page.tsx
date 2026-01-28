import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, TrendingDown, DollarSign, PiggyBank } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user has accounts, redirect to onboarding if not
  const { data: accountsData } = await supabase
    .from('accounts')
    .select('id, name, type, balance')
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (!accountsData || accountsData.length === 0) {
    redirect('/onboarding');
  }
  
  // TypeScript now knows accounts is non-empty
  const accounts = accountsData as { id: string; name: string; type: string; balance: number }[];

  // Fetch real transaction data
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: transactionsData } = await supabase
    .from('transactions')
    .select(`
      id,
      amount,
      payee_clean,
      payee_original,
      date,
      category:categories(id, name, icon, color)
    `)
    .eq('user_id', user.id)
    .gte('date', startOfMonth.toISOString().split('T')[0])
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  type TransactionRow = {
    id: string;
    amount: number;
    payee_clean: string | null;
    payee_original: string | null;
    date: string;
    category: { id: string; name: string; icon: string | null; color: string | null } | null;
  };
  const transactions = (transactionsData || []) as TransactionRow[];

  // Calculate totals
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const monthlyIncome = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpenses = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Format recent transactions for display
  const recentTransactions = transactions.slice(0, 5).map(t => {
    const date = new Date(t.date + 'T00:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (date.toDateString() === today.toDateString()) dateStr = 'Today';
    if (date.toDateString() === yesterday.toDateString()) dateStr = 'Yesterday';

    return {
      id: t.id,
      payee: t.payee_clean || t.payee_original || 'Unknown',
      amount: t.amount,
      category: t.category?.name || 'Uncategorized',
      date: dateStr,
    };
  });

  // Fetch real budgets
  const currentMonthStr = startOfMonth.toISOString().split('T')[0];
  const { data: budgetsData } = await supabase
    .from('budgets')
    .select(`
      id,
      budgeted,
      category:categories(id, name, icon, color)
    `)
    .eq('user_id', user.id)
    .eq('month', currentMonthStr);

  // Calculate spent per category from transactions
  const spentByCategory: Record<string, number> = {};
  transactions.filter(t => t.amount < 0).forEach(t => {
    if (t.category?.id) {
      spentByCategory[t.category.id] = (spentByCategory[t.category.id] || 0) + Math.abs(t.amount);
    }
  });

  // Format budgets for display
  type BudgetRow = {
    id: string;
    budgeted: number;
    category: { id: string; name: string; icon: string | null; color: string | null } | null;
  };
  const budgets = ((budgetsData || []) as BudgetRow[]).map(b => ({
    name: b.category?.name || 'Unknown',
    icon: b.category?.icon || '📦',
    budgeted: b.budgeted,
    spent: spentByCategory[b.category?.id || ''] || 0,
    color: b.category?.color || '#a855f7',
  })).slice(0, 4); // Show top 4 on dashboard

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const userProfile = {
    email: user.email,
    full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
  };

  return (
    <AppShell user={userProfile}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {userProfile.full_name}!</p>
          </div>
          <Button className="gradient-btn border-0 text-white" asChild>
            <a href="/transactions">
              <Plus className="mr-2 h-4 w-4" />
              Add Transaction
            </a>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalBalance.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Across {accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Income (This Month)</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">+${monthlyIncome.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">{currentMonth}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Expenses (This Month)</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">-${monthlyExpenses.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">{currentMonth}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Budget Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Overview</CardTitle>
              <CardDescription>Your spending vs budget this month</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {budgets.length > 0 ? budgets.map((budget) => {
                const percentage = (budget.spent / budget.budgeted) * 100;
                const isOver = percentage > 100;
                return (
                  <div key={budget.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{budget.icon}</span>
                        <span className="font-medium">{budget.name}</span>
                      </div>
                      <span className={isOver ? 'text-red-500' : ''}>
                        ${budget.spent.toFixed(2)} / ${budget.budgeted}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(percentage, 100)}%`,
                          backgroundColor: isOver ? '#ef4444' : budget.color,
                        }}
                      />
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-3">No budgets set yet</p>
                  <Button variant="outline" asChild>
                    <a href="/budgets">Set Up Budgets</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest activity</CardDescription>
            </CardHeader>
            <CardContent>
              {recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-medium">{transaction.payee}</span>
                        <span className="text-xs text-muted-foreground">
                          {transaction.category} • {transaction.date}
                        </span>
                      </div>
                      <span className={transaction.amount > 0 ? 'text-green-600 font-medium' : 'font-medium'}>
                        {transaction.amount > 0 ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No transactions yet this month
                </p>
              )}
              <Button variant="outline" className="w-full mt-4" asChild>
                <a href="/transactions">View All Transactions</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
