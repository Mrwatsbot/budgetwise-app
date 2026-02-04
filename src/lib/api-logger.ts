/**
 * API Request/Response Logger Middleware
 * Wraps API route handlers to log requests, responses, and timing
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';

export type ApiHandler = (
  request: NextRequest,
  context?: { params: unknown }
) => Promise<NextResponse | Response>;

/**
 * Wraps an API route handler with logging
 * Logs method, path, status, duration, and userId (if available)
 * 
 * Usage:
 *   export const GET = withApiLogging(async (request) => {
 *     // your handler code
 *   });
 */
export function withApiLogging(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context?: { params: unknown }) => {
    const startTime = Date.now();
    const { method, url } = request;
    const path = new URL(url).pathname;

    // Extract userId from common auth patterns (if available)
    let userId: string | undefined;
    try {
      // Try to get from Supabase auth cookie or header
      // This is best-effort - don't fail if not available
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        // Parse JWT token to get user ID (simple extraction, not verification)
        const token = authHeader.replace('Bearer ', '');
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.sub;
      }
    } catch {
      // Ignore auth extraction errors
    }

    try {
      // Call the actual handler
      const response = await handler(request, context);
      const duration = Date.now() - startTime;
      const status = response.status;

      // Log successful requests
      logger.info('API request completed', {
        method,
        path,
        statusCode: status,
        duration,
        userId,
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log failed requests
      logger.error('API request failed', {
        method,
        path,
        duration,
        userId,
        error: error instanceof Error ? error : String(error),
      });

      // Re-throw to let Next.js handle the error
      throw error;
    }
  };
}

/**
 * Helper to extract user ID from Supabase client
 * Use this in handlers that have access to the Supabase client
 */
export function getUserIdFromSupabase(user: { id: string } | null): string | undefined {
  return user?.id;
}
