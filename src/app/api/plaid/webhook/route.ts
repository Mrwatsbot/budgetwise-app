import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Plaid Webhook Handler
 * 
 * Security: Webhooks must be verified using Plaid's JWK-signed JWT.
 * For production, implement full Plaid webhook verification:
 * https://plaid.com/docs/api/webhooks/webhook-verification/
 * 
 * For now, we verify the webhook structure and use a shared secret header.
 */

// Use env var as a shared webhook secret for basic verification
const WEBHOOK_SECRET = process.env.PLAID_WEBHOOK_SECRET;

function verifyWebhookSignature(request: NextRequest): boolean {
  // If a webhook secret is configured, verify it
  if (WEBHOOK_SECRET) {
    const providedSecret = request.headers.get('x-plaid-webhook-secret');
    if (providedSecret !== WEBHOOK_SECRET) {
      console.error('Plaid webhook: invalid secret');
      return false;
    }
    return true;
  }

  // In sandbox/development without a secret configured, verify basic structure
  // but log a warning
  if (process.env.NODE_ENV === 'production' || process.env.PLAID_ENV === 'production') {
    console.error('CRITICAL: PLAID_WEBHOOK_SECRET not configured in production!');
    return false; // Block unverified webhooks in production
  }

  console.warn('Plaid webhook: no PLAID_WEBHOOK_SECRET configured, accepting in non-production mode');
  return true;
}

// Create a service-role Supabase client for webhook processing
// (webhooks don't have user cookies)
function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    // Fall back to anon key (will respect RLS — limited functionality)
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set, webhook processing limited');
  }

  return createServerClient(
    supabaseUrl,
    serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return []; },
        setAll() { /* no-op for service client */ },
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    if (!verifyWebhookSignature(request)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const body = await request.json();
    const { webhook_type, webhook_code, item_id, error } = body;

    if (!webhook_type || !item_id) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    const supabase = createServiceClient();

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
          // Log that a sync is needed — the user will trigger it on next page load
          // or we could use a background job queue here
          await (supabase.from as any)('plaid_connections')
            .update({ 
              updated_at: new Date().toISOString(),
              // Mark that new data is available so the UI can prompt sync
            })
            .eq('id', connection.id);
        }
        break;

      case 'ITEM':
        if (webhook_code === 'ERROR') {
          await (supabase.from as any)('plaid_connections')
            .update({
              status: 'error',
              error_code: error?.error_code || 'UNKNOWN_ERROR',
            })
            .eq('id', connection.id);
        } else if (webhook_code === 'PENDING_EXPIRATION') {
          await (supabase.from as any)('plaid_connections')
            .update({
              status: 'error',
              error_code: 'PENDING_EXPIRATION',
            })
            .eq('id', connection.id);
        }
        break;

      default:
        // Silently accept unhandled webhook types
        break;
    }

    // Always return 200 OK quickly
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error('Webhook processing error:', err instanceof Error ? err.message : 'Unknown error');
    // Still return 200 to prevent Plaid from retrying
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
