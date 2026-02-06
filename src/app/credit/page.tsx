'use client';

import { AppShell } from '@/components/layout/app-shell';
import { CreditDashboardContent } from '@/components/pages/credit-dashboard-content';

export default function CreditPage() {
  return (
    <AppShell>
      <CreditDashboardContent />
    </AppShell>
  );
}
