import { NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';

/**
 * POST /api/setup/reset
 * Clears all user data so the setup wizard can write fresh.
 */
export async function POST() {
  const guard = await apiGuard(5);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase.from as any;

  const errors: string[] = [];

  // Helper: try to delete from a table, swallow errors (table might not exist)
  const tryDelete = async (table: string, idCol = 'user_id') => {
    try {
      const { error } = await db(table).delete().eq(idCol, user.id);
      if (error) errors.push(`${table}: ${error.message}`);
    } catch (e: any) {
      errors.push(`${table}: ${e.message || 'unknown'}`);
    }
  };

  // Delete in safe order (transactions before accounts due to FK)
  await tryDelete('transactions');
  await tryDelete('budgets');
  await tryDelete('debts');
  await tryDelete('savings_goals');
  await tryDelete('score_history');
  await tryDelete('user_achievements');
  await tryDelete('streaks');
  await tryDelete('accounts');

  // Reset income to 0
  try {
    await db('profiles').update({ monthly_income: 0 }).eq('id', user.id);
  } catch (e: any) {
    errors.push(`profiles: ${e.message || 'unknown'}`);
  }

  return NextResponse.json({
    success: true,
    errors: errors.length > 0 ? errors : undefined,
  });
}
