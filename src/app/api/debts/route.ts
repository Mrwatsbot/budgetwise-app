import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';

export async function GET() {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: debts } = await (supabase.from as any)('debts')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('is_paid_off', { ascending: true })
    .order('apr', { ascending: false });

  const debtIds = (debts || []).map((d: { id: string }) => d.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: payments } = debtIds.length > 0
    ? await (supabase.from as any)('debt_payments')
        .select('*')
        .in('debt_id', debtIds)
        .order('date', { ascending: false })
        .limit(50)
    : { data: [] };

  const debtsWithPayments = (debts || []).map((debt: { id: string }) => ({
    ...debt,
    recent_payments: (payments || [])
      .filter((p: { debt_id: string }) => p.debt_id === debt.id)
      .slice(0, 5),
  }));

  return NextResponse.json(debtsWithPayments);
}

const VALID_DEBT_TYPES = [
  'credit_card', 'cc_paid_monthly', 'mortgage', 'heloc', 'auto', 'student',
  'personal', 'medical', 'business', 'payday', 'bnpl', 'zero_pct', 'secured', 'other',
];

export async function POST(request: NextRequest) {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  const body = await request.json();

  // Whitelist allowed fields to prevent mass assignment
  const { name, type, original_balance, current_balance, apr, minimum_payment,
          monthly_payment, due_day, in_collections, notes, origination_date, term_months } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!type || !VALID_DEBT_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Valid debt type is required' }, { status: 400 });
  }
  if (current_balance === undefined || typeof current_balance !== 'number' || isNaN(current_balance) || !isFinite(current_balance)) {
    return NextResponse.json({ error: 'Current balance must be a valid number' }, { status: 400 });
  }
  if (current_balance < 0 || current_balance > 10000000) {
    return NextResponse.json({ error: 'Current balance out of range' }, { status: 400 });
  }
  if (apr !== undefined && apr !== null && (typeof apr !== 'number' || isNaN(apr) || apr < 0 || apr > 100)) {
    return NextResponse.json({ error: 'APR must be between 0 and 100' }, { status: 400 });
  }
  if (minimum_payment !== undefined && minimum_payment !== null && (typeof minimum_payment !== 'number' || isNaN(minimum_payment) || minimum_payment < 0 || minimum_payment > 100000)) {
    return NextResponse.json({ error: 'Minimum payment out of range' }, { status: 400 });
  }
  if (monthly_payment !== undefined && monthly_payment !== null && (typeof monthly_payment !== 'number' || isNaN(monthly_payment) || monthly_payment < 0 || monthly_payment > 100000)) {
    return NextResponse.json({ error: 'Monthly payment out of range' }, { status: 400 });
  }
  if (due_day !== undefined && due_day !== null && (typeof due_day !== 'number' || due_day < 1 || due_day > 31)) {
    return NextResponse.json({ error: 'Due day must be between 1 and 31' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insert: Record<string, any> = {
    user_id: user.id,
    name: name.trim(),
    type,
    current_balance,
    original_balance: original_balance ?? current_balance,
    apr: typeof apr === 'number' ? Math.max(0, apr) : 0,
    minimum_payment: typeof minimum_payment === 'number' ? Math.max(0, minimum_payment) : 0,
    monthly_payment: typeof monthly_payment === 'number' ? Math.max(0, monthly_payment) : 0,
    in_collections: in_collections === true,
  };
  if (due_day !== undefined && due_day !== null) insert.due_day = due_day;
  if (notes && typeof notes === 'string') insert.notes = notes.trim();
  if (origination_date) insert.origination_date = origination_date;
  if (typeof term_months === 'number' && term_months > 0) insert.term_months = term_months;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from as any)('debts')
    .insert(insert)
    .select()
    .single();

  if (error) {
    console.error('Failed to create debt:', error.message);
    return NextResponse.json({ error: 'Failed to create debt' }, { status: 400 });
  }
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  const body = await request.json();
  const { id, name, type, original_balance, current_balance, apr, minimum_payment,
          monthly_payment, due_day, in_collections, notes, origination_date, term_months } = body;

  if (!id) {
    return NextResponse.json({ error: 'Debt ID is required' }, { status: 400 });
  }
  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
  }
  if (type !== undefined && !VALID_DEBT_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid debt type' }, { status: 400 });
  }
  if (due_day !== undefined && due_day !== null && (typeof due_day !== 'number' || due_day < 1 || due_day > 31)) {
    return NextResponse.json({ error: 'Due day must be between 1 and 31' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {};
  if (name !== undefined) update.name = name.trim();
  if (type !== undefined) update.type = type;
  if (current_balance !== undefined) update.current_balance = Math.max(0, current_balance);
  if (original_balance !== undefined) update.original_balance = original_balance;
  if (apr !== undefined) update.apr = Math.max(0, apr);
  if (minimum_payment !== undefined) update.minimum_payment = Math.max(0, minimum_payment);
  if (monthly_payment !== undefined) update.monthly_payment = Math.max(0, monthly_payment);
  if (due_day !== undefined) update.due_day = due_day;
  if (in_collections !== undefined) update.in_collections = in_collections === true;
  if (notes !== undefined) update.notes = typeof notes === 'string' ? notes.trim() : null;
  if (origination_date !== undefined) update.origination_date = origination_date || null;
  if (term_months !== undefined) update.term_months = term_months && term_months > 0 ? term_months : null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from as any)('debts')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update debt:', error.message);
    return NextResponse.json({ error: 'Failed to update debt' }, { status: 400 });
  }
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  const { id } = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from as any)('debts').delete().eq('id', id).eq('user_id', user.id);
  return NextResponse.json({ success: true });
}
