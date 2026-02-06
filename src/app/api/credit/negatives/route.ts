import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { NegativeItemType, NegativeItemStatus, ImpactLevel } from '@/types/credit';

const VALID_ITEM_TYPES: NegativeItemType[] = [
  'collection', 'late_payment', 'charge_off', 'repossession',
  'bankruptcy', 'foreclosure', 'tax_lien', 'judgment', 'inquiry', 'other'
];

const VALID_STATUSES: NegativeItemStatus[] = [
  'identified', 'disputing', 'responded', 'deleted', 'verified', 'paid', 'settled'
];

const VALID_IMPACTS: ImpactLevel[] = ['high', 'medium', 'low'];

export async function GET(request: NextRequest) {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const type = searchParams.get('type');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from as any)('negative_items')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (status && VALID_STATUSES.includes(status as NegativeItemStatus)) {
    query = query.eq('status', status);
  }

  if (type && VALID_ITEM_TYPES.includes(type as NegativeItemType)) {
    query = query.eq('item_type', type);
  }

  const { data: items, error } = await query;

  if (error) {
    console.error('Failed to fetch negative items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }

  return NextResponse.json(items || []);
}

export async function POST(request: NextRequest) {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  const body = await request.json();
  const {
    item_type,
    creditor_name,
    original_creditor,
    account_number,
    amount,
    date_opened,
    date_reported,
    on_equifax,
    on_experian,
    on_transunion,
    estimated_impact,
    notes
  } = body;

  // Validation
  if (!item_type || !VALID_ITEM_TYPES.includes(item_type)) {
    return NextResponse.json({ error: 'Valid item type is required' }, { status: 400 });
  }

  if (!creditor_name || typeof creditor_name !== 'string' || creditor_name.trim().length === 0) {
    return NextResponse.json({ error: 'Creditor name is required' }, { status: 400 });
  }

  if (creditor_name.length > 200) {
    return NextResponse.json({ error: 'Creditor name too long (max 200 characters)' }, { status: 400 });
  }

  if (amount !== undefined && amount !== null) {
    if (typeof amount !== 'number' || isNaN(amount) || amount < 0 || amount > 10000000) {
      return NextResponse.json({ error: 'Amount must be a valid positive number' }, { status: 400 });
    }
  }

  if (estimated_impact && !VALID_IMPACTS.includes(estimated_impact)) {
    return NextResponse.json({ error: 'Invalid impact level' }, { status: 400 });
  }

  if (notes && notes.length > 2000) {
    return NextResponse.json({ error: 'Notes too long (max 2000 characters)' }, { status: 400 });
  }

  // Insert
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newItem, error } = await (supabase.from as any)('negative_items')
    .insert({
      user_id: user.id,
      item_type,
      creditor_name: creditor_name.trim(),
      original_creditor: original_creditor?.trim() || null,
      account_number: account_number?.trim() || null,
      amount: amount || null,
      date_opened: date_opened || null,
      date_reported: date_reported || null,
      on_equifax: on_equifax ?? false,
      on_experian: on_experian ?? false,
      on_transunion: on_transunion ?? false,
      status: 'identified',
      estimated_impact: estimated_impact || null,
      notes: notes?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to insert negative item:', error);
    return NextResponse.json({ error: 'Failed to save item' }, { status: 500 });
  }

  return NextResponse.json(newItem, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
  }

  // Validate ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from as any)('negative_items')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  // Whitelist allowed update fields
  const allowedFields = [
    'item_type', 'creditor_name', 'original_creditor', 'account_number',
    'amount', 'date_opened', 'date_reported', 'on_equifax', 'on_experian',
    'on_transunion', 'status', 'estimated_impact', 'estimated_points', 'notes'
  ];

  const sanitizedUpdates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in updates) {
      sanitizedUpdates[key] = updates[key];
    }
  }

  // Validate status if provided
  if (sanitizedUpdates.status && !VALID_STATUSES.includes(sanitizedUpdates.status as NegativeItemStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  sanitizedUpdates.updated_at = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error } = await (supabase.from as any)('negative_items')
    .update(sanitizedUpdates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update negative item:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from as any)('negative_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to delete negative item:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
