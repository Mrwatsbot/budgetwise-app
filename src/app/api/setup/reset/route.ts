import { NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';

/**
 * POST /api/setup/reset
 * Clears all user data so the setup wizard can write fresh.
 * Deletes: accounts, budgets, transactions, debts, savings_goals
 * Resets: monthly_income to 0
 */
export async function POST() {
  const guard = await apiGuard(5);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase.from as any;

  try {
    // Delete in dependency order (transactions reference accounts/categories)
    const results = await Promise.allSettled([
      db('transactions').delete().eq('user_id', user.id),
      db('budgets').delete().eq('user_id', user.id),
      db('debts').delete().eq('user_id', user.id),
      db('savings_goals').delete().eq('user_id', user.id),
      db('score_history').delete().eq('user_id', user.id),
      db('achievements').delete().eq('user_id', user.id),
      db('streaks').delete().eq('user_id', user.id),
    ]);

    // Delete accounts after transactions (FK dependency)
    await db('accounts').delete().eq('user_id', user.id);

    // Reset income to 0
    await db('profiles').update({ monthly_income: 0 }).eq('id', user.id);

    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => r.reason?.message || 'Unknown error');

    return NextResponse.json({
      success: true,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Setup reset error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reset data' },
      { status: 500 }
    );
  }
}
