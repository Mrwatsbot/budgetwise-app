import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

// Use the Supabase connection pooler URL (port 6543 / PgBouncer) for server-side
// clients if available. In serverless environments (Vercel), each function invocation
// creates its own connection. Traffic spikes can spin up hundreds of concurrent
// functions, exhausting Supabase's direct connection limit (60 free / 200 pro).
// The pooler URL routes through PgBouncer in transaction mode, which multiplexes
// many short-lived connections over a smaller pool of actual Postgres connections.
// Only applied server-side — the browser client uses the REST API via PostgREST
// and doesn't open direct DB connections.
const SUPABASE_URL = process.env.SUPABASE_POOLER_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
