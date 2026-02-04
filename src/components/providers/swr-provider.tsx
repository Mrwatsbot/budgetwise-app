'use client';

import { SWRConfig } from 'swr';
import { fetcher, getSwrFallback, persistResult } from '@/lib/hooks/use-data';

const PERSIST_PREFIXES = [
  '/api/dashboard', '/api/budgets', '/api/transactions',
  '/api/debts', '/api/savings', '/api/score', '/api/settings',
];

/**
 * SWR provider with localStorage-backed fallback data.
 *
 * - `fallback`: reads localStorage on mount → hooks get data instantly
 *   instead of showing loading skeletons.
 * - `onSuccess`: after any successful fetch, persists the result to
 *   localStorage so the next refresh has fresh fallback data.
 *
 * No custom cache provider needed — uses SWR's default cache +
 * the first-class `fallback` API.
 */
export function SWRProvider({ children }: { children: React.ReactNode }) {
  // Read from localStorage synchronously on first render.
  // Server: returns {} (no window). Client: returns cached data.
  // React handles the hydration diff gracefully.
  const fallback = getSwrFallback();

  return (
    <SWRConfig
      value={{
        fetcher,
        fallback,
        onSuccess: (data: unknown, key: string) => {
          // Persist API responses to localStorage for next page load
          if (PERSIST_PREFIXES.some(p => key.startsWith(p))) {
            persistResult(key, data);
          }
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
