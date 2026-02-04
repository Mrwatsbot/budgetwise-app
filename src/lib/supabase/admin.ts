import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Use the Supabase connection pooler URL (port 6543 / PgBouncer) for the admin
// client if available. See server.ts for the full explanation — in serverless
// environments, direct connections can be exhausted during traffic spikes.
// The pooler multiplexes connections via PgBouncer in transaction mode.
const SUPABASE_URL = process.env.SUPABASE_POOLER_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

let _admin: SupabaseClient<Database> | null = null;

function getAdmin(): SupabaseClient<Database> {
  if (!_admin) {
    if (!SUPABASE_URL) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_POOLER_URL) is not set');
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
    }
    _admin = createClient<Database>(
      SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return _admin;
}

/**
 * Admin client with service role key - bypasses RLS.
 * USE WITH CAUTION - Only for server-side operations like webhooks.
 * Lazily initialized to avoid build-time crashes when env vars aren't set.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    return (getAdmin() as any)[prop];
  },
});
