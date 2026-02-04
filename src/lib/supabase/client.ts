import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Auto-refresh tokens before they expire
        autoRefreshToken: true,
        // Persist session to localStorage
        persistSession: true,
        // Detect session from URL (for magic links, OAuth callbacks)
        detectSessionInUrl: true,
      },
    }
  );
}
