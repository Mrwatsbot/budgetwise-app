'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { TourTooltip } from './tour-tooltip';
import { TOUR_STEPS, TourType, isTourCompleted, markTourCompleted, getTourCompletionKey } from './tour-steps';

interface TourContextType {
  startTour: (tourType: TourType) => void;
  resetTours: () => void;
  isRunning: boolean;
  currentTour: TourType | null;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within TourProvider');
  }
  return context;
}

interface TourProviderProps {
  children: React.ReactNode;
  autoStart?: boolean;
}

export function TourProvider({ children, autoStart = true }: TourProviderProps) {
  const [run, setRun] = useState(false);
  const [currentTour, setCurrentTour] = useState<TourType | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [savingTourState, setSavingTourState] = useState(false);

  // Auto-start main tour on first login
  useEffect(() => {
    if (autoStart && typeof window !== 'undefined') {
      const hasCompletedMainTour = isTourCompleted('main');
      if (!hasCompletedMainTour) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          startTour('main');
        }, 1000);
      }
    }
  }, [autoStart]);

  const startTour = useCallback((tourType: TourType) => {
    // Check if already completed
    if (isTourCompleted(tourType)) {
      return;
    }

    const steps = TOUR_STEPS[tourType];
    if (!steps || steps.length === 0) {
      return;
    }

    // Scroll to top for better tour experience
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    setCurrentTour(tourType);
    setStepIndex(0);
    setRun(true);
  }, []);

  const resetTours = useCallback(() => {
    if (typeof window !== 'undefined') {
      // Clear all tour completion flags
      localStorage.removeItem('thallo_tour_completed');
      const tours: TourType[] = ['budgets', 'transactions', 'debts', 'savings', 'score'];
      tours.forEach(tour => {
        localStorage.removeItem(getTourCompletionKey(tour));
      });
      setRun(false);
      setCurrentTour(null);
      setStepIndex(0);
    }
  }, []);

  const saveTourCompletion = useCallback(async (tourType: TourType) => {
    if (savingTourState) return;
    
    setSavingTourState(true);
    try {
      // Mark as completed in localStorage immediately
      markTourCompleted(tourType);

      // If main tour, also save to user profile via API
      if (tourType === 'main') {
        try {
          await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ has_completed_tour: true }),
          });
        } catch (error) {
          console.error('Failed to save tour completion to API:', error);
          // Non-critical, localStorage is the source of truth
        }
      }
    } finally {
      setSavingTourState(false);
    }
  }, [savingTourState]);

  const handleJoyrideCallback = useCallback(
    (data: CallBackProps) => {
      const { status, action, index, type } = data;

      // Handle tour completion or skip
      if (
        status === STATUS.FINISHED ||
        status === STATUS.SKIPPED ||
        action === ACTIONS.CLOSE
      ) {
        if (currentTour) {
          if (status === STATUS.FINISHED) {
            // Mark as completed only if user finished the tour
            saveTourCompletion(currentTour);
          }
        }
        setRun(false);
        setCurrentTour(null);
        setStepIndex(0);
        return;
      }

      // Update step index for back/next navigation
      if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
        setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));

        // If target not found, try scrolling to it
        if (type === EVENTS.TARGET_NOT_FOUND && currentTour) {
          const steps = TOUR_STEPS[currentTour];
          const step = steps[index];
          if (step?.target && typeof step.target === 'string' && step.target !== 'body') {
            const element = document.querySelector(step.target);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
      }
    },
    [currentTour, saveTourCompletion]
  );

  const steps = currentTour ? TOUR_STEPS[currentTour] : [];

  return (
    <TourContext.Provider
      value={{
        startTour,
        resetTours,
        isRunning: run,
        currentTour,
      }}
    >
      {children}
      <Joyride
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        continuous
        showProgress
        showSkipButton
        callback={handleJoyrideCallback}
        tooltipComponent={TourTooltip}
        disableOverlayClose
        disableCloseOnEsc={false}
        spotlightClicks={false}
        scrollToFirstStep
        scrollOffset={100}
        styles={{
          options: {
            zIndex: 10000,
            arrowColor: '#18181b',
            backgroundColor: '#18181b',
            primaryColor: '#1a7a6d',
            textColor: '#e8eded',
          },
          overlay: {
            backgroundColor: 'rgba(13, 21, 20, 0.85)',
            mixBlendMode: 'normal' as any,
          },
          spotlight: {
            backgroundColor: 'transparent',
            border: '2px solid #1a7a6d',
            borderRadius: '12px',
          },
          beaconInner: {
            backgroundColor: '#1a7a6d',
          },
          beaconOuter: {
            backgroundColor: 'rgba(26, 122, 109, 0.2)',
            border: '2px solid #1a7a6d',
          },
        }}
      />
    </TourContext.Provider>
  );
}
