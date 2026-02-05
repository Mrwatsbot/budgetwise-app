import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { logTransactionHistory } from '@/lib/transaction-history';
import { verifyAccountOwnership, verifyCategoryExists, validateTransactionDate } from '@/lib/ownership';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await apiGuard(60);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;
  const { id } = await params;

  const { data: transaction, error } = await supabase
    .from('transactions')
    .select('*, category:categories(*), account:accounts(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  return NextResponse.json({ transaction });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await apiGuard(60);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;
  const { id } = await params;

  try {
    const body = await request.json();

    // First, get the current transaction state for history
    const { data: currentTransaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !currentTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Whitelist allowed fields to prevent arbitrary field updates
    const allowedFields = ['amount', 'payee_clean', 'payee_original', 'category_id', 'date', 'memo', 'is_cleared', 'account_id'];
    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Validate foreign keys if being updated
    if (updates.account_id) {
      const accountOwned = await verifyAccountOwnership(supabase, updates.account_id, user.id);
      if (!accountOwned) {
        return NextResponse.json({ error: 'Account not found or access denied' }, { status: 403 });
      }
    }
    if (updates.category_id) {
      const categoryExists = await verifyCategoryExists(supabase, updates.category_id);
      if (!categoryExists) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      }
    }
    if (updates.date) {
      const dateCheck = validateTransactionDate(updates.date);
      if (!dateCheck.valid) {
        return NextResponse.json({ error: dateCheck.error }, { status: 400 });
      }
    }
    if (updates.amount !== undefined) {
      const amt = Number(updates.amount);
      if (isNaN(amt) || !isFinite(amt) || Math.abs(amt) > 1000000) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
      }
      updates.amount = amt;
    }

    // Log the previous state to history
    await logTransactionHistory(
      supabase,
      user.id,
      id,
      'update',
      currentTransaction
    );

    // Update the transaction with whitelisted fields only
    const { data: updatedTransaction, error: updateError } = await (supabase
      .from('transactions') as any)
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update transaction' },
        { status: 500 }
      );
    }

    return NextResponse.json({ transaction: updatedTransaction });
  } catch (error: unknown) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await apiGuard(60);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;
  const { id } = await params;

  try {
    // First, get the current transaction state for history
    const { data: currentTransaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !currentTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Log the previous state to history before deleting
    await logTransactionHistory(
      supabase,
      user.id,
      id,
      'delete',
      currentTransaction
    );

    // Delete the transaction
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete transaction' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
