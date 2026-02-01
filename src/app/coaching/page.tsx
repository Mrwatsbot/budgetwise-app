'use client';

import { useDashboard } from '@/lib/hooks/use-data';
import { AppShell } from '@/components/layout/app-shell';
import { CoachingContent } from '@/components/pages/coaching-content';

export default function CoachingPage() {
  const { data } = useDashboard();

  return (
    <AppShell user={data?.user}>
      <CoachingContent />
    </AppShell>
  );
}
