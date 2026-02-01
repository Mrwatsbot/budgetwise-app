import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingForm } from './onboarding-form';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user already has accounts
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);

  // If user already has accounts, redirect to dashboard
  if (accounts && accounts.length > 0) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-radial pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to Thallo!</h1>
          <p className="text-muted-foreground">
            Let's set up your first account to get started.
          </p>
        </div>

        <OnboardingForm userId={user.id} />
      </div>
    </div>
  );
}
