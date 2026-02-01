'use client';

import { useSettings } from '@/lib/hooks/use-data';
import { AppShell } from '@/components/layout/app-shell';
import { SettingsContent } from '@/components/pages/settings-content';

export default function SettingsPage() {
  const { profile } = useSettings();

  return (
    <AppShell user={profile ? { email: profile.email, full_name: profile.full_name } : undefined}>
      <SettingsContent />
    </AppShell>
  );
}
