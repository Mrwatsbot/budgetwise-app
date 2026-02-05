import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { plaidClient } from '@/lib/plaid/client';
import { encryptToken } from '@/lib/plaid/crypto';
import { getUserTier } from '@/lib/ai/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const guard = await apiGuard(10);
    if (guard.error) return guard.error;
    const { user, supabase } = guard;

    // Check user tier
    const { tier } = await getUserTier(supabase, user.id);
    if (tier === 'free') {
      return NextResponse.json(
        { error: 'Plaid integration is only available for Plus and Pro tier users' },
        { status: 403 }
      );
    }

    const { public_token } = await request.json();
    
    if (!public_token) {
      return NextResponse.json({ error: 'Missing public_token' }, { status: 400 });
    }

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Get institution information
    const itemResponse = await plaidClient.itemGet({
      access_token: accessToken,
    });

    const institutionId = itemResponse.data.item.institution_id;
    if (!institutionId) {
      return NextResponse.json(
        { error: 'Failed to get institution information' },
        { status: 500 }
      );
    }

    const institutionResponse = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: ['US' as any],
    });

    const institutionName = institutionResponse.data.institution.name;

    // Encrypt the access token
    const encryptedAccessToken = encryptToken(accessToken);

    // Check if this is a reconnection (existing item_id)
    const { data: existingConnection } = await (supabase.from as any)('plaid_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_id', itemId)
      .maybeSingle();

    if (existingConnection) {
      // Update existing connection (reconnection)
      const { error: dbError } = await (supabase.from as any)('plaid_connections')
        .update({
          encrypted_access_token: encryptedAccessToken,
          status: 'active',
          error_code: null,
          institution_name: institutionName, // Update in case it changed
        })
        .eq('id', existingConnection.id);

      if (dbError) {
        console.error('Database error:', dbError);
        return NextResponse.json(
          { error: 'Failed to update connection' },
          { status: 500 }
        );
      }
    } else {
      // Insert new connection
      const { error: dbError } = await (supabase.from as any)('plaid_connections')
        .insert({
          user_id: user.id,
          institution_id: institutionId,
          institution_name: institutionName,
          item_id: itemId,
          encrypted_access_token: encryptedAccessToken,
          status: 'active',
        });

      if (dbError) {
        console.error('Database error:', dbError);
        return NextResponse.json(
          { error: 'Failed to save connection' },
          { status: 500 }
        );
      }
    }

    // Trigger initial sync (fire and forget - don't wait)
    fetch(`${request.nextUrl.origin}/api/plaid/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify({ item_id: itemId }),
    }).catch(err => console.error('Initial sync failed:', err));

    return NextResponse.json({
      success: true,
      institution_name: institutionName,
    });
  } catch (error) {
    console.error('Error exchanging token:', error);
    return NextResponse.json(
      { error: 'Failed to exchange token' },
      { status: 500 }
    );
  }
}
