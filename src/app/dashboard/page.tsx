'use client';

import { useDashboard } from '@/lib/hooks/use-data';
import { AppShell } from '@/components/layout/app-shell';
import { DashboardContent } from '@/components/pages/dashboard-content';

export default function DashboardPage() {
  const { data } = useDashboard();

  return (
    <AppShell user={data?.user}>
      <DashboardContent />
    </AppShell>
  );
}
