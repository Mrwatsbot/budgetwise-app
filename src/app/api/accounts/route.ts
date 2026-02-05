import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';

export async function GET() {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: accounts, error } = await (supabase.from as any)('accounts')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch accounts:', error.message);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 400 });
  }
  return NextResponse.json(accounts || []);
}

export async function POST(request: NextRequest) {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  const body = await request.json();
  const { name, type, balance } = body;

  if (!name || !type) {
    return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
  }

  const accountBalance = Number(balance || 0);
  if (isNaN(accountBalance) || !isFinite(accountBalance)) {
    return NextResponse.json({ error: 'Invalid balance' }, { status: 400 });
  }
  if (Math.abs(accountBalance) > 100000000) {
    return NextResponse.json({ error: 'Balance out of range' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from as any)('accounts')
    .insert({
      user_id: user.id,
      name,
      type,
      balance: accountBalance,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create account:', error.message);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 400 });
  }
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  const body = await request.json();
  const { id, name, type, balance } = body;

  if (!id) {
    return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (type !== undefined) updates.type = type;
  if (balance !== undefined) {
    const accountBalance = Number(balance);
    if (isNaN(accountBalance) || !isFinite(accountBalance)) {
      return NextResponse.json({ error: 'Invalid balance' }, { status: 400 });
    }
    if (Math.abs(accountBalance) > 100000000) {
      return NextResponse.json({ error: 'Balance out of range' }, { status: 400 });
    }
    updates.balance = accountBalance;
  }
  updates.updated_at = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from as any)('accounts')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update account:', error.message);
    return NextResponse.json({ error: 'Failed to update account' }, { status: 400 });
  }
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
  }

  // Soft-delete: set is_active = false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from as any)('accounts')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to delete account:', error.message);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
