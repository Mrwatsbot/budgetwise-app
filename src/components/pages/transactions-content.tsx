'use client';

import { useState } from 'react';
import { useTransactions, usePlaidStatus } from '@/lib/hooks/use-data';
import { usePageTour } from '@/components/tour/use-page-tour';
import { AddTransactionDialog } from '@/components/transactions/add-transaction-dialog';
import { ScanReceiptDialog } from '@/components/transactions/scan-receipt-dialog';
import { ImportStatementDialog } from '@/components/transactions/import-statement-dialog';
import { TransactionList } from '@/components/transactions/transaction-list';
import { SpendingCalendar } from '@/components/transactions/spending-calendar';
import { ListLoading } from '@/components/layout/page-loading';
import { InsightsPanel } from '@/components/ai/insights-panel';
import { Button } from '@/components/ui/button';
import { List, CalendarDays, Download, AlertTriangle, Plus } from 'lucide-react';
import { ExportDialog } from '@/components/export/export-dialog';

type ViewMode = 'list' | 'calendar';

export function TransactionsContent() {
  usePageTour(); // Auto-start tour on first visit
  const { transactions, categories, accounts, user, isLoading, refresh } = useTransactions();
  const { connections: plaidConnections } = usePlaidStatus();
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const hasAccounts = accounts && accounts.length > 0;
  
  // Check for broken Plaid connections
  const brokenConnections = plaidConnections.filter((conn: any) => 
    conn.status !== 'active' && conn.issue?.type === 'error'
  );

  return (
    <div className="space-y-6">
      {isLoading ? (
        <ListLoading />
      ) : (
        <>
          {/* Plaid Connection Warning */}
          {brokenConnections.length > 0 && (
            <div className="glass-card rounded-xl p-4 bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    ⚠️ {brokenConnections[0].institution_name} sync paused. Transactions may be missing.
                  </p>
                  <a
                    href="/settings/accounts"
                    className="text-xs text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Reconnect or Add Manually
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-display font-bold">Transactions</h1>
                <p className="text-muted-foreground">
                  {transactions?.length || 0} transactions
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Export Button */}
                <ExportDialog 
                  mode="transactions" 
                  trigger={
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                  }
                />
                {/* View Toggle — always fits */}
                <div data-tour="transaction-calendar" className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
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
              categories={categories || []}
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
