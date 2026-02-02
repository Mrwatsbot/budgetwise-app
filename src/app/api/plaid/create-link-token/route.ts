import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { plaidClient } from '@/lib/plaid/client';
import { getUserTier } from '@/lib/ai/rate-limiter';
import { CountryCode, Products } from 'plaid';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user tier (plus or pro only)
    const { tier } = await getUserTier(supabase, user.id);
    if (tier === 'free') {
      return NextResponse.json(
        { error: 'Plaid integration is only available for Plus and Pro tier users' },
        { status: 403 }
      );
    }

    // Create link token
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: user.id,
      },
      client_name: 'Thallo',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook: process.env.PLAID_WEBHOOK_URL,
    });

    return NextResponse.json({ link_token: response.data.link_token });
  } catch (error: any) {
    console.error('Error creating link token:', error?.response?.data || error?.message || error);
    const plaidError = error?.response?.data;
    const responseBody: { error: string; plaid_error_code?: string; debug?: Record<string, unknown> } = {
      error: plaidError?.error_message || 'Failed to create link token',
      plaid_error_code: plaidError?.error_code,
    };

    // Only include debug info in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      responseBody.debug = {
        hasClientId: !!process.env.PLAID_CLIENT_ID,
        hasSecret: !!process.env.PLAID_SECRET,
        env: process.env.PLAID_ENV,
      };
    }

    return NextResponse.json(responseBody, { status: 500 });
  }
}
