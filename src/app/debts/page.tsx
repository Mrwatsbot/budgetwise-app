'use client';

import { AppShell } from '@/components/layout/app-shell';
import { DebtsContent } from '@/components/pages/debts-content';

export default function DebtsPage() {
  return (
    <AppShell>
      <DebtsContent />
    </AppShell>
  );
}
