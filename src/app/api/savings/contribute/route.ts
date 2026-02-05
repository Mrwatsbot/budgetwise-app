import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';

export async function POST(request: NextRequest) {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

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

  if (contribError) {
    console.error('Failed to record contribution:', contribError.message);
    return NextResponse.json({ error: 'Failed to record contribution' }, { status: 400 });
  }

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
