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

  const { debt_id, amount, date, is_extra, balance_after, is_paid_off } = await request.json();

  // Log payment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: paymentError } = await (supabase.from as any)('debt_payments').insert({
    user_id: user.id,
    debt_id,
    amount,
    date,
    is_extra,
    balance_after,
  });

  if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 400 });

  // Update debt balance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase.from as any)('debts')
    .update({
      current_balance: balance_after,
      is_paid_off: is_paid_off || false,
      paid_off_date: is_paid_off ? date : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', debt_id)
    .eq('user_id', user.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
