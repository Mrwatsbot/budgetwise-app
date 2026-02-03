import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';

export async function POST(request: NextRequest) {
  const guard = await apiGuard(60);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  try {
    const body = await request.json();
    const { transaction_id } = body;

    if (!transaction_id) {
      return NextResponse.json(
        { error: 'transaction_id is required' },
        { status: 400 }
      );
    }

    // Get the most recent history entry for this transaction
    const { data: historyEntry, error: historyError } = await (supabase
      .from('transaction_history') as any)
      .select('*')
      .eq('transaction_id', transaction_id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (historyError || !historyEntry) {
      return NextResponse.json(
        { error: 'No history found for this transaction' },
        { status: 404 }
      );
    }

    const { action, previous_data } = historyEntry;

    // Handle undo based on action type
    if (action === 'delete') {
      // Re-create the deleted transaction
      const { data: restoredTransaction, error: restoreError } = await (supabase
        .from('transactions') as any)
        .insert([previous_data])
        .select()
        .single();

      if (restoreError) {
        console.error('Restore error:', restoreError);
        return NextResponse.json(
          { error: 'Failed to restore transaction' },
          { status: 500 }
        );
      }

      // Delete the history entry that was just used
      await (supabase
        .from('transaction_history') as any)
        .delete()
        .eq('id', historyEntry.id);

      return NextResponse.json({
        success: true,
        action: 'restored',
        transaction: restoredTransaction,
      });
    } else if (action === 'update') {
      // Restore the previous state
      const { data: restoredTransaction, error: restoreError } = await (supabase
        .from('transactions') as any)
        .update(previous_data)
        .eq('id', transaction_id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (restoreError) {
        console.error('Restore error:', restoreError);
        return NextResponse.json(
          { error: 'Failed to restore transaction' },
          { status: 500 }
        );
      }

      // Delete the history entry that was just used
      await (supabase
        .from('transaction_history') as any)
        .delete()
        .eq('id', historyEntry.id);

      return NextResponse.json({
        success: true,
        action: 'reverted',
        transaction: restoredTransaction,
      });
    } else {
      return NextResponse.json(
        { error: 'Cannot undo create action' },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    console.error('Undo error:', error);
    return NextResponse.json(
      { error: 'Failed to undo transaction' },
      { status: 500 }
    );
  }
}
