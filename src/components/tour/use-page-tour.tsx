'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTour } from './tour-provider';
import { TourType, isTourCompleted } from './tour-steps';

// Map paths to tour types
const PATH_TO_TOUR: Record<string, TourType> = {
  '/budgets': 'budgets',
  '/transactions': 'transactions',
  '/debts': 'debts',
  '/savings': 'savings',
  '/score': 'score',
};

/**
 * Hook to auto-start page-specific mini-tours on first visit
 * Call this in each page component
 */
export function usePageTour() {
  const pathname = usePathname();
  const { startTour, isRunning } = useTour();

  useEffect(() => {
    // Don't auto-start if a tour is already running
    if (isRunning) return;

    const tourType = PATH_TO_TOUR[pathname];
    if (!tourType) return;

    // Check if this page's tour has already been completed
    const completed = isTourCompleted(tourType);
    const mainCompleted = isTourCompleted('main');

    // Only auto-start page tours AFTER the main tour is completed
    // This prevents overwhelming new users
    if (!completed && mainCompleted) {
      // Small delay to ensure DOM elements are rendered
      const timer = setTimeout(() => {
        startTour(tourType);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [pathname, startTour, isRunning]);
}
