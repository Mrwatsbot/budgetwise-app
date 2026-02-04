'use client';

import { useDebts } from '@/lib/hooks/use-data';
import { AddDebtDialog } from '@/components/debts/add-debt-dialog';
import { ScanStatementDialog } from '@/components/debts/scan-statement-dialog';
import { DebtList } from '@/components/debts/debt-list';
import { PayoffPlan } from '@/components/debts/payoff-plan';
import { ListLoading } from '@/components/layout/page-loading';
import { InsightsPanel } from '@/components/ai/insights-panel';

export function DebtsContent() {
  const { debts, isLoading } = useDebts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Debts</h1>
          <p className="text-muted-foreground">Track and crush your debts</p>
        </div>
        <div className="flex gap-2">
          <ScanStatementDialog />
          <AddDebtDialog />
        </div>
      </div>

      {/* Content */}
      {isLoading ? <ListLoading /> : <DebtList debts={debts} />}

      {/* Smart Payoff Plan */}
      <PayoffPlan debts={debts} />

      {/* AI Insights */}
      <InsightsPanel page="debts" />
    </div>
  );
}
