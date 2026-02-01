import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { plaidClient } from '@/lib/plaid/client';
import { decryptToken } from '@/lib/plaid/crypto';

// GET: List user's Plaid connections
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all connections
    const { data: connections, error: connError } = await (supabase.from as any)('plaid_connections')
      .select('id, institution_id, institution_name, status, last_synced_at, error_code, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (connError) {
      console.error('Error fetching connections:', connError);
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
    }

    return NextResponse.json({ connections: connections || [] });
  } catch (error) {
    console.error('Error in GET /api/plaid/connections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Disconnect a Plaid connection
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('id');
    const deleteTransactions = searchParams.get('delete_transactions') === 'true';

    if (!connectionId) {
      return NextResponse.json({ error: 'Missing connection id' }, { status: 400 });
    }

    // Get the connection
    const { data: connection, error: getError } = await (supabase.from as any)('plaid_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single();

    if (getError || !connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Remove item from Plaid
    try {
      const accessToken = decryptToken(connection.encrypted_access_token);
      await plaidClient.itemRemove({
        access_token: accessToken,
      });
    } catch (plaidError) {
      console.error('Error removing Plaid item:', plaidError);
      // Continue anyway - we still want to delete from our DB
    }

    // Optionally delete associated transactions
    if (deleteTransactions) {
      await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id)
        .not('plaid_transaction_id', 'is', null);
    }

    // Delete the connection record
    const { error: deleteError } = await (supabase.from as any)('plaid_connections')
      .delete()
      .eq('id', connectionId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting connection:', deleteError);
      return NextResponse.json({ error: 'Failed to delete connection' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/plaid/connections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
