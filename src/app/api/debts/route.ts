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

export async function POST(request: NextRequest) {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  const body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from as any)('debts')
    .insert({ ...body, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
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
