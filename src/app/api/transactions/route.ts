import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';

export async function GET() {
  const guard = await apiGuard(60);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  const [categoriesRes, accountsRes, transactionsRes] = await Promise.all([
    supabase.from('categories').select('id, name, icon, type, color').order('sort_order'),
    supabase.from('accounts').select('id, name, type').eq('user_id', user.id).eq('is_active', true).order('created_at'),
    supabase.from('transactions')
      .select('id, amount, payee_clean, payee_original, date, memo, is_cleared, category:categories(id, name, icon, color), account:accounts(id, name)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  return NextResponse.json({
    categories: categoriesRes.data || [],
    accounts: accountsRes.data || [],
    transactions: transactionsRes.data || [],
    user: {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
    },
  });
}
