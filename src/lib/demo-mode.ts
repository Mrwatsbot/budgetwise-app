/**
 * Demo Mode Detection
 * 
 * Utilities to detect and handle demo mode across the app.
 */

'use client';

import { usePathname } from 'next/navigation';

/**
 * Hook to detect if current session is in demo mode
 */
export function useIsDemo(): boolean {
  const pathname = usePathname();
  return pathname?.startsWith('/demo') ?? false;
}

/**
 * Client-side check if on demo path
 */
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.startsWith('/demo');
}
