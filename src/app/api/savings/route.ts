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

export async function POST(request: NextRequest) {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  const body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from as any)('savings_goals')
    .insert({ ...body, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  const { id, ...fields } = await request.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from as any)('savings_goals')
    .update(fields)
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
