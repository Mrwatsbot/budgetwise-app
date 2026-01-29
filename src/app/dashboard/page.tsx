'use client';

import { useUser } from '@/hooks/use-user';
import { useDashboard } from '@/hooks/use-dashboard';
import { AppShell } from '@/components/layout/app-shell';
import { DashboardSkeleton } from '@/components/ui/page-skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function DashboardPage() {
  const { userProfile, isLoading: userLoading } = useUser();
  const {
    accounts,
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    recentTransactions,
    budgets,
    currentMonth,
    isLoading: dataLoading,
  } = useDashboard();

  const isLoading = userLoading || dataLoading;

  if (isLoading || !accounts || totalBalance === undefined) {
    return (
      <AppShell user={{ email: '', full_name: '' }}>
        <DashboardSkeleton />
      </AppShell>
    );
  }

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
              <div className="text-2xl font-bold text-green-600">+${monthlyIncome!.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">{currentMonth}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Expenses (This Month)</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">-${monthlyExpenses!.toFixed(2)}</div>
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
              {budgets && budgets.length > 0 ? budgets.map((budget) => {
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
              {recentTransactions && recentTransactions.length > 0 ? (
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
