import { NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';

export async function GET() {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  try {
    // Get all Plaid connections with their status
    const { data: connections, error } = await (supabase.from as any)('plaid_connections')
      .select('id, institution_id, institution_name, status, last_synced_at, error_code, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching Plaid connections:', error);
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
    }

    // Determine overall status and issues
    const now = Date.now();
    const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

    const issues = (connections || []).map((conn: any) => {
      const lastSynced = conn.last_synced_at ? new Date(conn.last_synced_at).getTime() : 0;
      const hoursSinceSync = lastSynced ? Math.floor((now - lastSynced) / (1000 * 60 * 60)) : null;
      
      let issue = null;
      if (conn.status !== 'active') {
        issue = {
          type: 'error' as const,
          connectionId: conn.id,
          institutionName: conn.institution_name,
          message: `${conn.institution_name} connection lost. Tap to reconnect.`,
          errorCode: conn.error_code,
        };
      } else if (lastSynced && (now - lastSynced) > STALE_THRESHOLD_MS) {
        const days = Math.floor(hoursSinceSync! / 24);
        issue = {
          type: 'stale' as const,
          connectionId: conn.id,
          institutionName: conn.institution_name,
          message: `Last synced ${days > 1 ? `${days} days` : `${hoursSinceSync} hours`} ago. Tap to sync now.`,
          hoursSinceSync,
        };
      }

      return {
        ...conn,
        issue,
      };
    });

    const hasIssues = issues.some((conn: any) => conn.issue);

    return NextResponse.json({
      connections: issues,
      hasIssues,
    });
  } catch (error) {
    console.error('Error in GET /api/plaid/status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
