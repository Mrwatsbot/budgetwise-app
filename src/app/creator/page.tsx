'use client';

import { AppShell } from '@/components/layout/app-shell';
import { CreatorDashboardContent } from '@/components/pages/creator-dashboard-content';

export default function CreatorDashboardPage() {
  return (
    <AppShell
      user={{ email: 'creator@example.com', full_name: 'Demo Creator' }}
    >
      <CreatorDashboardContent />
    </AppShell>
  );
}
