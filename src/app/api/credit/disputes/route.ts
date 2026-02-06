import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';

const VALID_LETTER_TYPES = [
  '609_validation', 'goodwill', 'pay_for_delete', 'general_dispute',
  'debt_validation', 'cease_desist', 'fraud_alert'
];

const VALID_STATUSES = ['draft', 'sent', 'responded', 'won', 'lost', 'expired'];
const VALID_TARGET_TYPES = ['bureau', 'creditor', 'collection_agency'];
const VALID_SENT_METHODS = ['certified_mail', 'regular_mail', 'online', 'fax'];
const VALID_RESPONSE_TYPES = ['pending', 'deleted', 'verified', 'updated', 'no_response', 'need_more_info'];

export async function GET(request: NextRequest) {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const negativeItemId = searchParams.get('negative_item_id');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from as any)('disputes')
    .select(`
      *,
      negative_item:negative_items(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (status && VALID_STATUSES.includes(status)) {
    query = query.eq('status', status);
  }

  if (negativeItemId) {
    query = query.eq('negative_item_id', negativeItemId);
  }

  const { data: disputes, error } = await query;

  if (error) {
    console.error('Failed to fetch disputes:', error);
    return NextResponse.json({ error: 'Failed to fetch disputes' }, { status: 500 });
  }

  return NextResponse.json(disputes || []);
}

export async function POST(request: NextRequest) {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  const body = await request.json();
  const {
    negative_item_id,
    letter_type,
    target,
    target_type = 'bureau',
    target_address,
    letter_content,
    letter_generated_by = 'ai',
  } = body;

  // Validation
  if (!letter_type || !VALID_LETTER_TYPES.includes(letter_type)) {
    return NextResponse.json({ error: 'Invalid letter type' }, { status: 400 });
  }

  if (!target || typeof target !== 'string' || target.length > 200) {
    return NextResponse.json({ error: 'Invalid target' }, { status: 400 });
  }

  if (!VALID_TARGET_TYPES.includes(target_type)) {
    return NextResponse.json({ error: 'Invalid target type' }, { status: 400 });
  }

  if (!letter_content || typeof letter_content !== 'string' || letter_content.length > 20000) {
    return NextResponse.json({ error: 'Invalid letter content' }, { status: 400 });
  }

  // If negative_item_id provided, verify ownership
  if (negative_item_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: item, error: itemError } = await (supabase.from as any)('negative_items')
      .select('id')
      .eq('id', negative_item_id)
      .eq('user_id', user.id)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Negative item not found' }, { status: 404 });
    }
  }

  // Calculate deadline (30 days from now for bureau disputes)
  const deadlineDate = new Date();
  deadlineDate.setDate(deadlineDate.getDate() + 30);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: dispute, error } = await (supabase.from as any)('disputes')
    .insert({
      user_id: user.id,
      negative_item_id: negative_item_id || null,
      letter_type,
      target,
      target_type,
      target_address: target_address || null,
      letter_content,
      letter_generated_by,
      status: 'draft',
      deadline_date: deadlineDate.toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create dispute:', error);
    return NextResponse.json({ error: 'Failed to create dispute' }, { status: 500 });
  }

  return NextResponse.json(dispute, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Dispute ID required' }, { status: 400 });
  }

  // Validate allowed fields
  const allowedFields = [
    'status', 'sent_date', 'sent_method', 'tracking_number',
    'response_date', 'response_type', 'response_notes', 'letter_content'
  ];
  
  const sanitizedUpdates: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(updates)) {
    if (!allowedFields.includes(key)) continue;
    
    // Validate specific fields
    if (key === 'status' && !VALID_STATUSES.includes(value as string)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    if (key === 'sent_method' && value && !VALID_SENT_METHODS.includes(value as string)) {
      return NextResponse.json({ error: 'Invalid sent method' }, { status: 400 });
    }
    if (key === 'response_type' && value && !VALID_RESPONSE_TYPES.includes(value as string)) {
      return NextResponse.json({ error: 'Invalid response type' }, { status: 400 });
    }
    
    sanitizedUpdates[key] = value;
  }

  sanitizedUpdates.updated_at = new Date().toISOString();

  // Update dispute (ownership enforced by RLS)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: dispute, error } = await (supabase.from as any)('disputes')
    .update(sanitizedUpdates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update dispute:', error);
    return NextResponse.json({ error: 'Failed to update dispute' }, { status: 500 });
  }

  if (!dispute) {
    return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
  }

  // If status changed to 'sent', update the negative item status too
  if (sanitizedUpdates.status === 'sent' && dispute.negative_item_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)('negative_items')
      .update({ status: 'disputing', updated_at: new Date().toISOString() })
      .eq('id', dispute.negative_item_id)
      .eq('user_id', user.id);
  }

  // If dispute won (deleted), update the negative item
  if (sanitizedUpdates.status === 'won' && dispute.negative_item_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)('negative_items')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('id', dispute.negative_item_id)
      .eq('user_id', user.id);
  }

  return NextResponse.json(dispute);
}

export async function DELETE(request: NextRequest) {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Dispute ID required' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from as any)('disputes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to delete dispute:', error);
    return NextResponse.json({ error: 'Failed to delete dispute' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
