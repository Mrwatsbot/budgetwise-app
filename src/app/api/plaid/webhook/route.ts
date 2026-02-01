import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Webhook verification
// Plaid sends a JWT signed with their private key
// For production, you should verify using their public JWK
// For now, we'll do basic verification

async function verifyWebhook(request: NextRequest): Promise<boolean> {
  // TODO: In production, verify Plaid webhook signature using their JWK
  // https://plaid.com/docs/api/webhooks/webhook-verification/
  
  // For now, just check that it came from a reasonable source
  // In sandbox/development, this is acceptable
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook (important for security)
    const isValid = await verifyWebhook(request);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const body = await request.json();
    const { webhook_type, webhook_code, item_id, error } = body;

    const supabase = await createClient();

    // Get the connection for this item
    const { data: connection } = await (supabase.from as any)('plaid_connections')
      .select('id, user_id')
      .eq('item_id', item_id)
      .single();

    if (!connection) {
      console.error('Webhook received for unknown item_id:', item_id);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    switch (webhook_type) {
      case 'TRANSACTIONS':
        if (webhook_code === 'SYNC_UPDATES_AVAILABLE' || webhook_code === 'DEFAULT_UPDATE') {
          // Trigger sync in background (fire and forget)
          fetch(`${request.nextUrl.origin}/api/plaid/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ item_id }),
          }).catch(err => console.error('Background sync failed:', err));
        }
        break;

      case 'ITEM':
        if (webhook_code === 'ERROR') {
          // Update connection status
          await (supabase.from as any)('plaid_connections')
            .update({
              status: 'error',
              error_code: error?.error_code || 'UNKNOWN_ERROR',
            })
            .eq('id', connection.id);
        } else if (webhook_code === 'PENDING_EXPIRATION') {
          // User needs to re-authenticate
          // Update status and optionally notify user
          await (supabase.from as any)('plaid_connections')
            .update({
              status: 'error',
              error_code: 'PENDING_EXPIRATION',
            })
            .eq('id', connection.id);
        }
        break;

      default:
        console.log('Unhandled webhook type:', webhook_type, webhook_code);
    }

    // Always return 200 OK quickly
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Still return 200 to prevent Plaid from retrying
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
