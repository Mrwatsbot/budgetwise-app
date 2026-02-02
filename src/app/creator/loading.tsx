'use client';

import { AppShell } from '@/components/layout/app-shell';
import { DashboardLoading } from '@/components/layout/page-loading';

export default function CreatorLoading() {
  return (
    <AppShell>
      <DashboardLoading />
    </AppShell>
  );
}
