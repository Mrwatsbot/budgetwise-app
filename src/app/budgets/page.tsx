'use client';

import { useBudgets } from '@/lib/hooks/use-data';
import { AppShell } from '@/components/layout/app-shell';
import { BudgetsContent } from '@/components/pages/budgets-content';

export default function BudgetsPage() {
  const { user } = useBudgets();

  return (
    <AppShell user={user}>
      <BudgetsContent />
    </AppShell>
  );
}
