import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';

export async function GET() {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  // Fetch profile and accounts in parallel
  const [profileRes, accountsRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from as any)('profiles')
      .select('id, full_name, email, monthly_income, subscription_tier, subscription_status, pay_frequency, next_pay_date')
      .eq('id', user.id)
      .single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from as any)('accounts')
      .select('id, name, type, balance, is_active, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
  ]);

  const profile = profileRes.data;
  const accounts = accountsRes.data || [];

  return NextResponse.json({
    profile: {
      ...profile,
      email: profile?.email || user.email,
      monthly_income: profile?.monthly_income || 0,
    },
    accounts,
  });
}

export async function PUT(request: NextRequest) {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  const body = await request.json();
  const { full_name, monthly_income, pay_frequency, next_pay_date } = body;

  // Build update object with only provided fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};

  if (full_name !== undefined) {
    if (full_name && full_name.length > 100) {
      return NextResponse.json({ error: 'Full name too long (max 100 characters)' }, { status: 400 });
    }
    updates.full_name = full_name;
  }

  if (monthly_income !== undefined) {
    const income = Number(monthly_income);
    if (isNaN(income) || income < 0) {
      return NextResponse.json({ error: 'Monthly income must be a non-negative number' }, { status: 400 });
    }
    updates.monthly_income = income;
  }

  if (pay_frequency !== undefined) {
    const validFrequencies = ['weekly', 'biweekly', 'semimonthly', 'monthly'];
    if (!validFrequencies.includes(pay_frequency)) {
      return NextResponse.json({ error: 'Invalid pay frequency' }, { status: 400 });
    }
    updates.pay_frequency = pay_frequency;
  }

  if (next_pay_date !== undefined) {
    // Allow null to clear the date
    updates.next_pay_date = next_pay_date || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from as any)('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update profile:', error.message);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 400 });
  }

  return NextResponse.json({ 
    success: true,
    profile: data,
  });
}
