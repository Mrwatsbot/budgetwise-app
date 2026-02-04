'use client';

/**
 * Client-Side Session Recovery
 * Handles auth token refresh failures and session expiration
 * Provides automatic recovery with one retry before redirecting to login
 */

import { useEffect, useRef } from 'react';
import { createClient } from './client';
import { clientLogger } from '@/lib/logger';

/**
 * Hook to handle session recovery on the client side
 * Listens for auth state changes and token refresh failures
 * Attempts one retry before redirecting to login
 */
export function useSessionRecovery() {
  const retryAttemptedRef = useRef(false);
  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      clientLogger.info('Auth state changed', { event });

      // Handle token refresh failures
      if (event === 'TOKEN_REFRESHED') {
        // Reset retry flag on successful refresh
        retryAttemptedRef.current = false;
        if (recoveryTimeoutRef.current) {
          clearTimeout(recoveryTimeoutRef.current);
          recoveryTimeoutRef.current = null;
        }
      }

      if (event === 'SIGNED_OUT' && session === null) {
        // User signed out - redirect to login
        const currentPath = window.location.pathname;
        // Don't redirect if already on auth pages
        if (!currentPath.startsWith('/login') && !currentPath.startsWith('/signup')) {
          window.location.href = '/login?session_expired=true';
        }
      }
    });

    // Set up a periodic session check
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          clientLogger.warn('Session check error', { error: error.message });
          
          // If we haven't tried recovery yet, attempt it
          if (!retryAttemptedRef.current) {
            retryAttemptedRef.current = true;
            clientLogger.info('Attempting session recovery...');
            
            // Wait 2 seconds before retry
            recoveryTimeoutRef.current = setTimeout(async () => {
              try {
                const { error: retryError } = await supabase.auth.refreshSession();
                
                if (retryError) {
                  clientLogger.error('Session recovery failed', { error: retryError.message });
                  // Redirect to login with session expired flag
                  window.location.href = '/login?session_expired=true';
                } else {
                  clientLogger.info('Session recovery successful');
                  retryAttemptedRef.current = false;
                }
              } catch (e) {
                clientLogger.error('Session recovery exception', { 
                  error: e instanceof Error ? e.message : String(e) 
                });
                window.location.href = '/login?session_expired=true';
              }
            }, 2000);
          }
        } else if (!session) {
          // No session and no error - user likely not logged in
          const currentPath = window.location.pathname;
          const protectedPaths = ['/dashboard', '/transactions', '/budgets', '/debts', '/savings', '/score', '/settings'];
          const isProtected = protectedPaths.some(path => currentPath.startsWith(path));
          
          if (isProtected) {
            window.location.href = '/login';
          }
        }
      } catch (e) {
        clientLogger.error('Session check exception', { 
          error: e instanceof Error ? e.message : String(e) 
        });
      }
    };

    // Check session immediately and then every 5 minutes
    checkSession();
    const intervalId = setInterval(checkSession, 5 * 60 * 1000);

    // Cleanup
    return () => {
      subscription.unsubscribe();
      clearInterval(intervalId);
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
      }
    };
  }, []);
}

/**
 * Manual session recovery function
 * Call this to force a session refresh attempt
 */
export async function recoverSession(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.refreshSession();
    
    if (error) {
      clientLogger.error('Manual session recovery failed', { error: error.message });
      return false;
    }
    
    clientLogger.info('Manual session recovery successful');
    return true;
  } catch (e) {
    clientLogger.error('Manual session recovery exception', { 
      error: e instanceof Error ? e.message : String(e) 
    });
    return false;
  }
}
