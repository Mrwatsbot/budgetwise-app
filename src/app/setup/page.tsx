import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SetupWizard } from './setup-wizard';

export default async function SetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user has completed setup
  // Setup is complete when user has: accounts + income + budgets
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase.from as any;
  const [accountsRes, profileRes, budgetsRes] = await Promise.all([
    db('accounts').select('id').eq('user_id', user.id).limit(1),
    db('profiles').select('monthly_income').eq('id', user.id).single(),
    db('budgets').select('id').eq('user_id', user.id).limit(1),
  ]);

  const hasAccounts = accountsRes.data && accountsRes.data.length > 0;
  const hasIncome = profileRes.data && profileRes.data.monthly_income > 0;
  const hasBudgets = budgetsRes.data && budgetsRes.data.length > 0;

  // If setup is complete, redirect to dashboard
  if (hasAccounts && hasIncome && hasBudgets) {
    redirect('/dashboard');
  }

  return <SetupWizard userId={user.id} />;
}
