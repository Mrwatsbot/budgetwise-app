import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { verifyCategoryExists, validateTransactionDate } from '@/lib/ownership';

export async function POST(request: NextRequest) {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  try {
    const body = await request.json();
    const { category_id, amount, note, date } = body;

    // Validate inputs
    if (!category_id || amount === undefined || amount === null || amount === 0) {
      return NextResponse.json(
        { error: 'category_id and non-zero amount are required' },
        { status: 400 }
      );
    }

    const txAmount = Number(amount);
    if (isNaN(txAmount) || !isFinite(txAmount) || Math.abs(txAmount) > 1000000) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Verify category exists
    const categoryExists = await verifyCategoryExists(supabase, category_id);
    if (!categoryExists) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // Validate date if provided
    if (date) {
      const dateCheck = validateTransactionDate(date);
      if (!dateCheck.valid) {
        return NextResponse.json({ error: dateCheck.error }, { status: 400 });
      }
    }

    // Get user's first account (or create default if none exists)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: accounts } = await (supabase.from as any)('accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at')
      .limit(1);

    let accountId = accounts?.[0]?.id;

    // If no account exists, create a default "Cash" account
    if (!accountId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newAccount, error: accountError } = await (supabase.from as any)('accounts')
        .insert({
          user_id: user.id,
          name: 'Cash',
          type: 'checking',
          balance: 0,
          is_active: true,
        })
        .select('id')
        .single();

      if (accountError) throw accountError;
      accountId = newAccount.id;
    }

    // Create the transaction
    // Positive amount from client = expense (stored as negative)
    // Negative amount from client = refund/correction (stored as positive)
    const isRefund = amount < 0;
    const payee = note || (isRefund ? 'Correction/Refund' : 'Manual Entry');
    const transactionDate = date || new Date().toISOString().split('T')[0];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: transaction, error } = await (supabase.from as any)('transactions')
      .insert({
        user_id: user.id,
        account_id: accountId,
        category_id,
        amount: isRefund ? Math.abs(amount) : -Math.abs(amount),
        payee_original: payee,
        payee_clean: payee,
        date: transactionDate,
        memo: note || null,
        is_cleared: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, transaction });
  } catch (error: any) {
    console.error('Quick transaction error:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
