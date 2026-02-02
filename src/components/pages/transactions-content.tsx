'use client';

import { useState } from 'react';
import { useTransactions } from '@/lib/hooks/use-data';
import { AddTransactionDialog } from '@/components/transactions/add-transaction-dialog';
import { ScanReceiptDialog } from '@/components/transactions/scan-receipt-dialog';
import { ImportStatementDialog } from '@/components/transactions/import-statement-dialog';
import { TransactionList } from '@/components/transactions/transaction-list';
import { SpendingCalendar } from '@/components/transactions/spending-calendar';
import { ListLoading } from '@/components/layout/page-loading';
import { InsightsPanel } from '@/components/ai/insights-panel';
import { Button } from '@/components/ui/button';
import { List, CalendarDays } from 'lucide-react';

type ViewMode = 'list' | 'calendar';

export function TransactionsContent() {
  const { transactions, categories, accounts, user, isLoading, refresh } = useTransactions();
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const hasAccounts = accounts && accounts.length > 0;

  return (
    <div className="space-y-6">
      {isLoading ? (
        <ListLoading />
      ) : (
        <>
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Transactions</h1>
                <p className="text-muted-foreground">
                  {transactions?.length || 0} transactions
                </p>
              </div>
              {/* View Toggle — always fits */}
              <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  onClick={() => setViewMode('calendar')}
                  aria-label="Calendar view"
                >
                  <CalendarDays className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* Action buttons — separate row on mobile */}
            <div className="flex items-center gap-2 flex-wrap">
              {hasAccounts ? (
                <>
                  <ImportStatementDialog
                    categories={categories || []}
                    onRefresh={refresh}
                  />
                  <ScanReceiptDialog
                    categories={categories || []}
                    accounts={accounts || []}
                    userId={user?.id || ''}
                    onRefresh={refresh}
                  />
                  <AddTransactionDialog
                    categories={categories || []}
                    accounts={accounts || []}
                    userId={user?.id || ''}
                    onRefresh={refresh}
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Create an account first to add transactions
                </p>
              )}
            </div>
          </div>

          {/* Content: List or Calendar */}
          {viewMode === 'list' ? (
            <TransactionList
              transactions={transactions || []}
              showAccount={!!(accounts && accounts.length > 1)}
              onRefresh={refresh}
            />
          ) : (
            <SpendingCalendar transactions={transactions || []} />
          )}

          {/* AI Insights */}
          <InsightsPanel page="transactions" />
        </>
      )}
    </div>
  );
}
