import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';

export async function GET() {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: goals } = await (supabase.from as any)('savings_goals')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at');

  const goalIds = (goals || []).map((g: { id: string }) => g.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contributions } = goalIds.length > 0
    ? await (supabase.from as any)('savings_contributions')
        .select('*')
        .in('savings_goal_id', goalIds)
        .order('date', { ascending: false })
        .limit(50)
    : { data: [] };

  const goalsWithContributions = (goals || []).map((goal: { id: string }) => ({
    ...goal,
    recent_contributions: (contributions || [])
      .filter((c: { savings_goal_id: string }) => c.savings_goal_id === goal.id)
      .slice(0, 5),
  }));

  return NextResponse.json({
    goals: goalsWithContributions,
    user: {
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
    },
  });
}

const VALID_SAVINGS_TYPES = [
  'emergency', 'general', 'retirement_401k', 'ira', 'hsa',
  'education_529', 'brokerage', 'custom',
];

export async function POST(request: NextRequest) {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  const body = await request.json();

  // Whitelist allowed fields to prevent mass assignment
  const { name, type, target_amount, monthly_contribution } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!type || !VALID_SAVINGS_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Valid savings type is required' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insert: Record<string, any> = {
    user_id: user.id,
    name: name.trim(),
    type,
    current_amount: 0, // Always start at 0 — contributions track actual savings
  };
  if (typeof target_amount === 'number' && target_amount > 0) insert.target_amount = target_amount;
  if (typeof monthly_contribution === 'number' && monthly_contribution >= 0) insert.monthly_contribution = monthly_contribution;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from as any)('savings_goals')
    .insert(insert)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  const body = await request.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // Whitelist allowed update fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined && typeof body.name === 'string') updates.name = body.name.trim();
  if (body.type !== undefined && VALID_SAVINGS_TYPES.includes(body.type)) updates.type = body.type;
  if (body.target_amount !== undefined) updates.target_amount = typeof body.target_amount === 'number' ? Math.max(0, body.target_amount) : null;
  if (body.monthly_contribution !== undefined && typeof body.monthly_contribution === 'number') updates.monthly_contribution = Math.max(0, body.monthly_contribution);
  if (body.is_active !== undefined && typeof body.is_active === 'boolean') updates.is_active = body.is_active;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from as any)('savings_goals')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
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
  await (supabase.from as any)('savings_goals').delete().eq('id', id).eq('user_id', user.id);
  return NextResponse.json({ success: true });
}
