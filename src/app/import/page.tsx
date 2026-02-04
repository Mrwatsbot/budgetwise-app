import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { ImportContent } from '@/components/pages/import-content';

export default async function ImportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile for AppShell
  const { data: profile } = await (supabase.from as any)('profiles')
    .select('email, full_name')
    .eq('id', user.id)
    .single();

  return (
    <AppShell
      user={profile ? { email: profile.email, full_name: profile.full_name } : undefined}
    >
      <ImportContent />
    </AppShell>
  );
}
