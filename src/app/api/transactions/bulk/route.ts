import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';

export async function POST(req: NextRequest) {
  const guard = await apiGuard(60);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  try {
    const body = await req.json();
    const { transactions } = body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ error: 'No transactions provided' }, { status: 400 });
    }

    // Get user's first active account (or create error if none exists)
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ 
        error: 'No active account found. Please create an account first.' 
      }, { status: 400 });
    }

    const accountId = (accounts[0] as { id: string }).id;

    // Prepare transactions for bulk insert
    const transactionsToInsert = transactions.map((t: { 
      date: string; 
      amount: number; 
      merchant: string; 
      category_id: string | null;
    }) => ({
      user_id: user.id,
      account_id: accountId,
      date: t.date,
      amount: t.amount,
      payee_original: t.merchant,
      payee_clean: t.merchant,
      category_id: t.category_id,
      notes: 'Imported from bank statement',
    }));

    // Bulk insert
    const { data, error } = await (supabase.from as any)('transactions')
      .insert(transactionsToInsert)
      .select('id');

    if (error) {
      console.error('Bulk insert error:', error);
      return NextResponse.json({ error: 'Failed to insert transactions' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      count: data?.length || 0 
    });
  } catch (error: any) {
    console.error('Bulk transaction error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to create transactions' 
    }, { status: 500 });
  }
}
