import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(user.id, 30);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
    );
  }

  const body = await request.json();
  const { debt_id, amount, date, is_extra } = body;

  // Input validation
  if (!debt_id || typeof debt_id !== 'string') {
    return NextResponse.json({ error: 'debt_id is required' }, { status: 400 });
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Valid date (YYYY-MM-DD) is required' }, { status: 400 });
  }

  // Don't allow future dates more than 1 day ahead (timezone buffer)
  const paymentDate = new Date(date);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (paymentDate > tomorrow) {
    return NextResponse.json({ error: 'Payment date cannot be in the future' }, { status: 400 });
  }

  // Fetch current debt to calculate balance_after server-side
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: debt, error: debtError } = await (supabase.from as any)('debts')
    .select('id, current_balance, is_paid_off')
    .eq('id', debt_id)
    .eq('user_id', user.id)
    .single();

  if (debtError || !debt) {
    return NextResponse.json({ error: 'Debt not found' }, { status: 404 });
  }

  if (debt.is_paid_off) {
    return NextResponse.json({ error: 'This debt is already paid off' }, { status: 400 });
  }

  // Calculate balance after payment server-side (never trust client)
  const balanceAfter = Math.max(0, debt.current_balance - amount);
  const isPaidOff = balanceAfter === 0;

  // Log payment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: paymentError } = await (supabase.from as any)('debt_payments').insert({
    user_id: user.id,
    debt_id,
    amount,
    date,
    is_extra: is_extra === true,
    balance_after: balanceAfter,
  });

  if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 400 });

  // Update debt balance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase.from as any)('debts')
    .update({
      current_balance: balanceAfter,
      is_paid_off: isPaidOff,
      paid_off_date: isPaidOff ? date : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', debt_id)
    .eq('user_id', user.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
  return NextResponse.json({ success: true, balance_after: balanceAfter, is_paid_off: isPaidOff });
}
