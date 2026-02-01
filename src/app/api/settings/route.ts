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
      .select('id, full_name, email, monthly_income, subscription_tier, subscription_status, openrouter_api_key')
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

  // Mask the API key — only show last 4 chars
  const maskedKey = profile?.openrouter_api_key
    ? '••••••••' + profile.openrouter_api_key.slice(-4)
    : null;

  return NextResponse.json({
    profile: {
      ...profile,
      email: profile?.email || user.email,
      openrouter_api_key: maskedKey,
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
  const { full_name, monthly_income, openrouter_api_key } = body;

  // Build update object with only provided fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};

  if (full_name !== undefined) {
    updates.full_name = full_name;
  }

  if (monthly_income !== undefined) {
    const income = Number(monthly_income);
    if (isNaN(income) || income < 0) {
      return NextResponse.json({ error: 'Monthly income must be a non-negative number' }, { status: 400 });
    }
    updates.monthly_income = income;
  }

  if (openrouter_api_key !== undefined) {
    // Allow null/empty to clear the key
    updates.openrouter_api_key = openrouter_api_key || null;
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

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ 
    success: true,
    profile: {
      ...data,
      openrouter_api_key: data.openrouter_api_key
        ? '••••••••' + data.openrouter_api_key.slice(-4)
        : null,
    }
  });
}
