import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';

export async function GET(request: NextRequest) {
  const guard = await apiGuard(60);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  // Pagination params
  const url = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '100'), 1), 500);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);
  
  // Check for parent_transaction_id filter (for fetching split children)
  const parentId = url.searchParams.get('parent_transaction_id');

  let transactionsQuery = supabase.from('transactions')
    .select('id, amount, payee_clean, payee_original, date, memo, is_cleared, parent_transaction_id, is_split, category:categories(id, name, icon, color), account:accounts(id, name)')
    .eq('user_id', user.id);

  if (parentId) {
    // Fetch children of a specific parent (split transactions)
    transactionsQuery = transactionsQuery.eq('parent_transaction_id', parentId);
  } else {
    // Fetch top-level transactions only
    transactionsQuery = transactionsQuery.is('parent_transaction_id', null);
  }

  const transactionsRes = await transactionsQuery
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Only fetch categories/accounts if not fetching children
  if (parentId) {
    return NextResponse.json({
      transactions: transactionsRes.data || [],
      pagination: {
        offset,
        limit,
        hasMore: (transactionsRes.data || []).length === limit,
      },
    });
  }

  const [categoriesRes, accountsRes] = await Promise.all([
    supabase.from('categories').select('id, name, icon, type, color').order('sort_order'),
    supabase.from('accounts').select('id, name, type').eq('user_id', user.id).eq('is_active', true).order('created_at'),
  ]);

  return NextResponse.json({
    categories: categoriesRes.data || [],
    accounts: accountsRes.data || [],
    transactions: transactionsRes.data || [],
    pagination: {
      offset,
      limit,
      hasMore: (transactionsRes.data || []).length === limit,
    },
    user: {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
    },
  });
}

export async function POST(request: NextRequest) {
  const guard = await apiGuard(60);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  try {
    const body = await request.json();
    const { account_id, category_id, amount, payee_original, payee_clean, date, memo, is_cleared } = body;

    if (!account_id || amount === undefined || amount === null || !date) {
      return NextResponse.json(
        { error: 'account_id, amount, and date are required' },
        { status: 400 }
      );
    }

    const { data, error } = await (supabase.from as any)('transactions')
      .insert({
        user_id: user.id,
        account_id,
        category_id: category_id || null,
        amount: Number(amount),
        payee_original: payee_original || 'Manual Entry',
        payee_clean: payee_clean || payee_original || 'Manual Entry',
        date,
        memo: memo || null,
        is_cleared: is_cleared !== undefined ? is_cleared : true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, transaction: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
