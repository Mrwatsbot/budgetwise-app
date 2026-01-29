'use client';

import { useUser } from '@/hooks/use-user';
import { useTransactions } from '@/hooks/use-transactions';
import { AppShell } from '@/components/layout/app-shell';
import { TransactionsSkeleton } from '@/components/ui/page-skeleton';
import { AddTransactionDialog } from '@/components/transactions/add-transaction-dialog';
import { TransactionList } from '@/components/transactions/transaction-list';

export default function TransactionsPage() {
  const { user, userProfile, isLoading: userLoading } = useUser();
  const {
    categories,
    accounts,
    transactions,
    isLoading: dataLoading,
    mutate,
  } = useTransactions();

  const isLoading = userLoading || dataLoading;

  if (isLoading || !categories || !accounts || !transactions) {
    return (
      <AppShell user={{ email: '', full_name: '' }}>
        <TransactionsSkeleton />
      </AppShell>
    );
  }

  const hasAccounts = accounts.length > 0;

  return (
    <AppShell user={userProfile}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Transactions</h1>
            <p className="text-muted-foreground">
              {transactions.length} transactions
            </p>
          </div>
          {hasAccounts ? (
            <AddTransactionDialog
              categories={categories}
              accounts={accounts}
              userId={user!.id}
              onMutate={() => mutate()}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Create an account first to add transactions
            </p>
          )}
        </div>

        {/* Transaction List */}
        <TransactionList 
          transactions={transactions as any} 
          showAccount={accounts.length > 1}
          onMutate={() => mutate()}
        />
      </div>
    </AppShell>
  );
}
