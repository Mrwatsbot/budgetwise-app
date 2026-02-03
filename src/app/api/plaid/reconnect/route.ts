import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { plaidClient } from '@/lib/plaid/client';
import { decryptToken } from '@/lib/plaid/crypto';
import { CountryCode, Products } from 'plaid';

export async function POST(request: NextRequest) {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  try {
    const body = await request.json();
    const { connection_id } = body;

    if (!connection_id) {
      return NextResponse.json({ error: 'Missing connection_id' }, { status: 400 });
    }

    // Get the connection
    const { data: connection, error: connError } = await (supabase.from as any)('plaid_connections')
      .select('*')
      .eq('id', connection_id)
      .eq('user_id', user.id)
      .single();

    if (connError || !connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Get the current access token
    const accessToken = decryptToken(connection.encrypted_access_token);

    // Create a Link token in update mode
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: user.id,
      },
      client_name: 'Thallo',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      access_token: accessToken, // This puts Link in update mode
      webhook: process.env.PLAID_WEBHOOK_URL,
    });

    return NextResponse.json({ 
      link_token: response.data.link_token,
      connection_id,
    });
  } catch (error: any) {
    console.error('Error creating reconnect link token:', error?.response?.data || error?.message || error);
    const plaidError = error?.response?.data;
    return NextResponse.json(
      {
        error: plaidError?.error_message || 'Failed to create reconnect link token',
        plaid_error_code: plaidError?.error_code,
      },
      { status: 500 }
    );
  }
}
