'use client';

import { useSavings } from '@/lib/hooks/use-data';
import { AppShell } from '@/components/layout/app-shell';
import { SavingsContent } from '@/components/pages/savings-content';

export default function SavingsPage() {
  const { user } = useSavings();

  return (
    <AppShell user={user}>
      <SavingsContent />
    </AppShell>
  );
}
