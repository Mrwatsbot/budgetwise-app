import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(user.id, 30);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
    );
  }

  const body = await request.json();
  const { savings_goal_id, amount, date } = body;

  if (!savings_goal_id || typeof savings_goal_id !== 'string') {
    return NextResponse.json({ error: 'savings_goal_id is required' }, { status: 400 });
  }

  const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
  }

  // Cap max contribution to prevent abuse
  if (parsedAmount > 1_000_000) {
    return NextResponse.json({ error: 'Amount exceeds maximum' }, { status: 400 });
  }

  const contributionDate = date || new Date().toISOString().split('T')[0];

  // Verify the goal exists and belongs to the user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: goal, error: goalError } = await (supabase.from as any)('savings_goals')
    .select('id, current_amount, is_active')
    .eq('id', savings_goal_id)
    .eq('user_id', user.id)
    .single();

  if (goalError || !goal) {
    return NextResponse.json({ error: 'Savings goal not found' }, { status: 404 });
  }
  if (!goal.is_active) {
    return NextResponse.json({ error: 'Savings goal is inactive' }, { status: 400 });
  }

  // Insert contribution
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: contribError } = await (supabase.from as any)('savings_contributions')
    .insert({
      savings_goal_id,
      user_id: user.id,
      amount: parsedAmount,
      date: contributionDate,
    });

  if (contribError) return NextResponse.json({ error: contribError.message }, { status: 400 });

  // Atomic update: increment current_amount to prevent race conditions
  const newAmount = (goal.current_amount || 0) + parsedAmount;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from as any)('savings_goals')
    .update({ current_amount: newAmount, updated_at: new Date().toISOString() })
    .eq('id', savings_goal_id)
    .eq('user_id', user.id)
    // Optimistic concurrency: only update if current_amount hasn't changed
    .eq('current_amount', goal.current_amount);

  // Return updated goal
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updatedGoal } = await (supabase.from as any)('savings_goals')
    .select('*')
    .eq('id', savings_goal_id)
    .eq('user_id', user.id)
    .single();

  return NextResponse.json(updatedGoal);
}
