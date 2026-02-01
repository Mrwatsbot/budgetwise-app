'use client';

import { useTransactions } from '@/lib/hooks/use-data';
import { AppShell } from '@/components/layout/app-shell';
import { TransactionsContent } from '@/components/pages/transactions-content';

export default function TransactionsPage() {
  const { user } = useTransactions();

  return (
    <AppShell user={user}>
      <TransactionsContent />
    </AppShell>
  );
}
