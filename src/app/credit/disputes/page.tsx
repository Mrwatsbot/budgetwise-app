'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { DisputesContent } from '@/components/pages/disputes-content';

function DisputesLoading() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-zinc-800 rounded w-1/3" />
        <div className="h-24 bg-zinc-800 rounded-xl" />
        <div className="h-24 bg-zinc-800 rounded-xl" />
      </div>
    </div>
  );
}

export default function DisputesPage() {
  return (
    <AppShell>
      <Suspense fallback={<DisputesLoading />}>
        <DisputesContent />
      </Suspense>
    </AppShell>
  );
}
