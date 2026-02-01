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

  const { savings_goal_id, amount, date } = await request.json();

  if (!savings_goal_id || !amount) {
    return NextResponse.json({ error: 'savings_goal_id and amount are required' }, { status: 400 });
  }

  // Insert contribution
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: contribError } = await (supabase.from as any)('savings_contributions')
    .insert({
      savings_goal_id,
      user_id: user.id,
      amount: parseFloat(amount),
      date: date || new Date().toISOString().split('T')[0],
    });

  if (contribError) return NextResponse.json({ error: contribError.message }, { status: 400 });

  // Get current goal to update amount
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: goal } = await (supabase.from as any)('savings_goals')
    .select('current_amount')
    .eq('id', savings_goal_id)
    .eq('user_id', user.id)
    .single();

  if (goal) {
    const newAmount = (goal.current_amount || 0) + parseFloat(amount);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)('savings_goals')
      .update({ current_amount: newAmount })
      .eq('id', savings_goal_id)
      .eq('user_id', user.id);
  }

  // Return updated goal
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updatedGoal } = await (supabase.from as any)('savings_goals')
    .select('*')
    .eq('id', savings_goal_id)
    .eq('user_id', user.id)
    .single();

  return NextResponse.json(updatedGoal);
}
