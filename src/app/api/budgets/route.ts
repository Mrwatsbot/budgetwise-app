import { NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';

export async function GET(request: Request) {
  const guard = await apiGuard(60);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  // Use client-provided month to avoid timezone mismatch (client=CST, server=UTC)
  const url = new URL(request.url);
  const clientMonth = url.searchParams.get('month');
  let monthStr: string;
  if (clientMonth && /^\d{4}-\d{2}-\d{2}$/.test(clientMonth)) {
    monthStr = clientMonth;
  } else {
    const now = new Date();
    monthStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
  }

  // Compute next month string for transaction date range
  const [yearNum, monthNum] = monthStr.split('-').map(Number);
  const nextMonth = monthNum === 12
    ? `${yearNum + 1}-01-01`
    : `${yearNum}-${String(monthNum + 1).padStart(2, '0')}-01`;

  // Compute previous month string for rollover calculation
  const prevMonth = monthNum === 1
    ? `${yearNum - 1}-12-01`
    : `${yearNum}-${String(monthNum - 1).padStart(2, '0')}-01`;

  const [categoriesRes, budgetsRes, prevBudgetsRes, transactionsRes, prevTransactionsRes, savingsRes] = await Promise.all([
    supabase.from('categories').select('id, name, icon, type, color').order('sort_order'),
    (supabase.from as any)('budgets')
      .select('id, budgeted, rollover, rollover_amount, category_id, category:categories(id, name, icon, color)')
      .eq('user_id', user.id)
      .eq('month', monthStr),
    (supabase.from as any)('budgets')
      .select('id, budgeted, rollover, rollover_amount, category_id')
      .eq('user_id', user.id)
      .eq('month', prevMonth),
    supabase.from('transactions')
      .select('id, amount, category:categories(id), is_split, parent_transaction_id')
      .eq('user_id', user.id)
      .gte('date', monthStr)
      .lt('date', nextMonth),
    supabase.from('transactions')
      .select('id, amount, category:categories(id), is_split, parent_transaction_id')
      .eq('user_id', user.id)
      .gte('date', prevMonth)
      .lt('date', monthStr),
    (supabase.from as any)('savings_goals')
      .select('monthly_contribution')
      .eq('user_id', user.id)
      .eq('is_active', true),
  ]);

  // Spent per category for current month
  // Exclude parent transactions that are split (count only the children)
  const spentByCategory: Record<string, number> = {};
  (transactionsRes.data || [])
    .filter((t: { amount: number; is_split?: boolean; parent_transaction_id?: string | null }) => 
      t.amount < 0 && !t.is_split
    )
    .forEach((t: { amount: number; category: { id: string } | null }) => {
      if (t.category?.id) {
        spentByCategory[t.category.id] = (spentByCategory[t.category.id] || 0) + Math.abs(t.amount);
      }
    });

  // Spent per category for previous month
  const prevSpentByCategory: Record<string, number> = {};
  (prevTransactionsRes.data || [])
    .filter((t: { amount: number; is_split?: boolean; parent_transaction_id?: string | null }) => 
      t.amount < 0 && !t.is_split
    )
    .forEach((t: { amount: number; category: { id: string } | null }) => {
      if (t.category?.id) {
        prevSpentByCategory[t.category.id] = (prevSpentByCategory[t.category.id] || 0) + Math.abs(t.amount);
      }
    });

  // Calculate rollover amounts from previous month
  const rolloverByCategory: Record<string, number> = {};
  (prevBudgetsRes.data || []).forEach((prevBudget: { category_id: string; budgeted: number; rollover: boolean; rollover_amount: number }) => {
    if (prevBudget.rollover) {
      const prevSpent = prevSpentByCategory[prevBudget.category_id] || 0;
      // Rollover = (budgeted + rollover_amount) - spent
      const rollover = (prevBudget.budgeted + (prevBudget.rollover_amount || 0)) - prevSpent;
      rolloverByCategory[prevBudget.category_id] = rollover;
    }
  });

  // Fetch monthly income and pay schedule
  let monthlyIncome = 0;
  let payFrequency = 'monthly';
  let nextPayDate = null;
  try {
    const { data: profileData } = await (supabase.from as any)('profiles')
      .select('monthly_income, pay_frequency, next_pay_date')
      .eq('id', user.id)
      .single();
    monthlyIncome = profileData?.monthly_income || 0;
    payFrequency = profileData?.pay_frequency || 'monthly';
    nextPayDate = profileData?.next_pay_date || null;
  } catch { /* columns may not exist yet */ }

  // Compute total savings target from active savings goals
  const savingsGoals = savingsRes.data || [];
  const totalSavingsTarget = savingsGoals.reduce((sum: number, g: { monthly_contribution: number }) => sum + (g.monthly_contribution || 0), 0);

  return NextResponse.json({
    categories: categoriesRes.data || [],
    budgets: (budgetsRes.data || []).map((b: { id: string; budgeted: number; rollover: boolean; rollover_amount: number; category_id: string; category: { id: string; name: string; icon: string | null; color: string | null } | null }) => ({
      ...b,
      spent: spentByCategory[b.category?.id || b.category_id || ''] || 0,
      rollover_amount: rolloverByCategory[b.category_id] || b.rollover_amount || 0,
    })),
    spentByCategory,
    monthlyIncome,
    totalSavingsTarget,
    payFrequency,
    nextPayDate,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
    },
  });
}

export async function POST(request: Request) {
  const guard = await apiGuard(60);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  try {
    const body = await request.json();
    const { category_id, month, budgeted, rollover } = body;

    if (!category_id || !month || budgeted === undefined) {
      return NextResponse.json(
        { error: 'category_id, month, and budgeted are required' },
        { status: 400 }
      );
    }

    const { data, error } = await (supabase.from as any)('budgets')
      .insert({
        user_id: user.id,
        category_id,
        month,
        budgeted: Number(budgeted),
        rollover: rollover !== undefined ? rollover : true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, budget: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create budget' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const guard = await apiGuard(60);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  try {
    const body = await request.json();
    const { budgetId, rollover, budgeted } = body;

    if (!budgetId) {
      return NextResponse.json(
        { error: 'budgetId is required' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updates: Record<string, any> = {};
    if (typeof rollover === 'boolean') updates.rollover = rollover;
    if (budgeted !== undefined) updates.budgeted = Number(budgeted);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data, error } = await (supabase.from as any)('budgets')
      .update(updates)
      .eq('id', budgetId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, budget: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update budget' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const guard = await apiGuard(60);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  try {
    const body = await request.json();
    const { budgetId } = body;

    if (!budgetId) {
      return NextResponse.json(
        { error: 'budgetId is required' },
        { status: 400 }
      );
    }

    const { error } = await (supabase.from as any)('budgets')
      .delete()
      .eq('id', budgetId)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete budget' },
      { status: 500 }
    );
  }
}
