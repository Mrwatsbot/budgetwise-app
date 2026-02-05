import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { verifyCategoryExists } from '@/lib/ownership';

interface SplitItem {
  category_id: string;
  amount: number;
  notes?: string;
}

interface ParentTransaction {
  id: string;
  user_id: string;
  account_id: string;
  amount: number;
  payee_original: string | null;
  payee_clean: string | null;
  memo: string | null;
  date: string;
  is_cleared: boolean;
  is_reconciled: boolean;
  is_split: boolean;
}

export async function POST(request: NextRequest) {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  try {
    const body = await request.json();
    const { transaction_id, splits } = body as {
      transaction_id: string;
      splits: SplitItem[];
    };

    // Validate input
    if (!transaction_id || !splits || !Array.isArray(splits) || splits.length < 2) {
      return NextResponse.json(
        { error: 'transaction_id and at least 2 splits are required' },
        { status: 400 }
      );
    }

    // Fetch the parent transaction
    const { data: parentTransaction, error: fetchError } = await (supabase as any)
      .from('transactions')
      .select('id, user_id, account_id, amount, payee_original, payee_clean, memo, date, is_cleared, is_reconciled, is_split')
      .eq('id', transaction_id)
      .eq('user_id', user.id)
      .single() as { data: ParentTransaction | null; error: any };

    if (fetchError || !parentTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Check if already split
    if (parentTransaction.is_split) {
      return NextResponse.json(
        { error: 'Transaction is already split' },
        { status: 400 }
      );
    }

    // Validate all split category_ids exist
    for (const split of splits) {
      if (!split.category_id) {
        return NextResponse.json({ error: 'Each split must have a category_id' }, { status: 400 });
      }
      if (split.amount === undefined || split.amount <= 0) {
        return NextResponse.json({ error: 'Each split must have a positive amount' }, { status: 400 });
      }
      const categoryExists = await verifyCategoryExists(supabase, split.category_id);
      if (!categoryExists) {
        return NextResponse.json({ error: `Invalid category: ${split.category_id}` }, { status: 400 });
      }
    }

    // Validate split amounts sum equals original transaction amount
    const totalSplitAmount = splits.reduce((sum, split) => sum + split.amount, 0);
    const originalAmount = Math.abs(parentTransaction.amount);
    
    // Allow small rounding errors (1 cent)
    if (Math.abs(totalSplitAmount - originalAmount) > 0.01) {
      return NextResponse.json(
        { error: `Split amounts ($${totalSplitAmount.toFixed(2)}) must equal transaction amount ($${originalAmount.toFixed(2)})` },
        { status: 400 }
      );
    }

    // Create child transactions
    const childTransactions = splits.map((split) => ({
      user_id: user.id,
      account_id: parentTransaction.account_id,
      category_id: split.category_id,
      amount: parentTransaction.amount < 0 ? -Math.abs(split.amount) : Math.abs(split.amount),
      payee_original: parentTransaction.payee_original,
      payee_clean: parentTransaction.payee_clean,
      memo: split.notes || parentTransaction.memo,
      date: parentTransaction.date,
      is_cleared: parentTransaction.is_cleared,
      is_reconciled: parentTransaction.is_reconciled,
      parent_transaction_id: transaction_id,
      ai_categorized: false,
    }));

    const { error: insertError } = await (supabase as any)
      .from('transactions')
      .insert(childTransactions);

    if (insertError) {
      throw insertError;
    }

    // Mark parent as split
    const { error: updateError } = await (supabase as any)
      .from('transactions')
      .update({ is_split: true })
      .eq('id', transaction_id)
      .eq('user_id', user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction split successfully',
    });
  } catch (error: any) {
    console.error('Split transaction error:', error);
    return NextResponse.json(
      { error: 'Failed to split transaction' },
      { status: 500 }
    );
  }
}
