/**
 * Health Check Endpoint
 * No authentication required - used for monitoring and uptime checks
 * Returns 200 if healthy, 503 if database is unreachable
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0';

export async function GET() {
  const timestamp = new Date().toISOString();
  
  try {
    // Check Supabase connectivity with a simple query
    const supabase = await createClient();
    
    // Try to query a system table (pg_stat_database)
    // This doesn't require any user tables to exist
    const { error } = await supabase
      .from('profiles')
      .select('count')
      .limit(0)
      .single();

    // If there's an error that's not "no rows" (PGRST116), database might be down
    if (error && error.code !== 'PGRST116') {
      logger.error('Health check failed - database error', {
        error: error.message,
        code: error.code,
      });

      return NextResponse.json(
        {
          status: 'error',
          timestamp,
          version: APP_VERSION,
          database: 'unreachable',
          error: 'Database connectivity check failed',
        },
        { status: 503 }
      );
    }

    // Database is reachable
    logger.info('Health check passed');
    
    return NextResponse.json(
      {
        status: 'ok',
        timestamp,
        version: APP_VERSION,
        database: 'connected',
        uptime: Date.now(),
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    logger.error('Health check failed - unexpected error', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        status: 'error',
        timestamp,
        version: APP_VERSION,
        error: 'Health check failed',
      },
      { status: 503 }
    );
  }
}

// Use Node.js runtime for full API access
export const runtime = 'nodejs';
