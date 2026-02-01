'use client';

import { useScore } from '@/lib/hooks/use-data';
import { AppShell } from '@/components/layout/app-shell';
import { ScoreContent } from '@/components/pages/score-content';

export default function ScorePage() {
  const { user } = useScore();

  return (
    <AppShell user={user}>
      <ScoreContent />
    </AppShell>
  );
}
