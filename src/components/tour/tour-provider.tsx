'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TourTooltip } from './tour-tooltip';
import { TOUR_STEPS, TourType, TourStep, isTourCompleted, markTourCompleted, getTourCompletionKey } from './tour-steps';

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

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SPOTLIGHT_PADDING = 10;
const TOOLTIP_GAP = 16;

export function TourProvider({ children, autoStart = true }: TourProviderProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTour, setCurrentTour] = useState<TourType | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom' | 'left' | 'right' | 'center'>('bottom');
  const [ready, setReady] = useState(false);

  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const scrollListenerRef = useRef<(() => void) | null>(null);
  const elevatedElementRef = useRef<HTMLElement | null>(null);
  const originalZIndexRef = useRef<string>('');
  const originalPositionRef = useRef<string>('');
  const originalRelativeRef = useRef<string>('');

  // Auto-start main tour on first login
  useEffect(() => {
    if (autoStart && typeof window !== 'undefined') {
      const hasCompletedMainTour = isTourCompleted('main');
      if (!hasCompletedMainTour) {
        setTimeout(() => {
          startTour('main');
        }, 1500);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // Clean up elevated element z-index when tour ends or step changes
  const restoreElement = useCallback(() => {
    if (elevatedElementRef.current) {
      elevatedElementRef.current.style.zIndex = originalZIndexRef.current;
      elevatedElementRef.current.style.position = originalPositionRef.current;
      elevatedElementRef.current.style.position = originalRelativeRef.current;
      elevatedElementRef.current = null;
    }
  }, []);

  // Elevate the target element above the overlay
  const elevateElement = useCallback((el: HTMLElement) => {
    restoreElement();
    originalZIndexRef.current = el.style.zIndex;
    originalPositionRef.current = el.style.position;
    // Make the element appear above the overlay (z-index: 9999)
    el.style.zIndex = '10001';
    // Ensure the element has a positioning context
    const computed = window.getComputedStyle(el);
    if (computed.position === 'static') {
      originalRelativeRef.current = el.style.position;
      el.style.position = 'relative';
    }
    elevatedElementRef.current = el;
  }, [restoreElement]);

  const getCurrentStep = useCallback((): TourStep | null => {
    if (!currentTour) return null;
    const steps = TOUR_STEPS[currentTour];
    return steps?.[stepIndex] || null;
  }, [currentTour, stepIndex]);

  const calculatePosition = useCallback((rect: DOMRect, step: TourStep) => {
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceAbove = rect.top;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceLeft = rect.left;
    const spaceRight = viewportWidth - rect.right;

    let pos = step.placement || 'bottom';

    if (pos === 'center') return 'center' as const;

    // Auto-adjust if not enough space
    if (pos === 'bottom' && spaceBelow < 220) pos = 'top';
    if (pos === 'top' && spaceAbove < 220) pos = 'bottom';
    if (pos === 'left' && spaceLeft < 350) pos = 'right';
    if (pos === 'right' && spaceRight < 350) pos = 'left';

    // Final fallback — prefer bottom or top
    if (pos === 'left' && spaceLeft < 350 && spaceRight < 350) {
      pos = spaceBelow > spaceAbove ? 'bottom' : 'top';
    }

    return pos as 'top' | 'bottom' | 'left' | 'right';
  }, []);

  const updateSpotlight = useCallback(() => {
    const step = getCurrentStep();
    if (!step) return;

    if (step.target === 'body' || step.placement === 'center') {
      setSpotlightRect(null);
      setTooltipPosition('center');
      setReady(true);
      return;
    }

    const selector = step.target.startsWith('[') ? step.target : `[data-tour="${step.target}"]`;
    const el = document.querySelector(selector) as HTMLElement | null;

    if (!el) {
      // Target not found — show as centered
      console.warn(`Tour target not found: ${step.target}`);
      setSpotlightRect(null);
      setTooltipPosition('center');
      setReady(true);
      return;
    }

    const rect = el.getBoundingClientRect();

    setSpotlightRect({
      top: rect.top - SPOTLIGHT_PADDING,
      left: rect.left - SPOTLIGHT_PADDING,
      width: rect.width + SPOTLIGHT_PADDING * 2,
      height: rect.height + SPOTLIGHT_PADDING * 2,
    });

    setTooltipPosition(calculatePosition(rect, step));
    elevateElement(el);
    setReady(true);
  }, [getCurrentStep, calculatePosition, elevateElement]);

  const scrollAndHighlight = useCallback(() => {
    setReady(false);
    const step = getCurrentStep();
    if (!step || step.target === 'body' || step.placement === 'center') {
      setSpotlightRect(null);
      setTooltipPosition('center');
      setReady(true);
      return;
    }

    const selector = step.target.startsWith('[') ? step.target : `[data-tour="${step.target}"]`;
    const el = document.querySelector(selector) as HTMLElement | null;

    if (!el) {
      setSpotlightRect(null);
      setTooltipPosition('center');
      setReady(true);
      return;
    }

    // Scroll element into view first, then update spotlight after scroll completes
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

    // Wait for scroll to finish, then measure position
    setTimeout(() => {
      updateSpotlight();
    }, 600);
  }, [getCurrentStep, updateSpotlight]);

  // Set up observers for current step
  useEffect(() => {
    if (!isRunning || !currentTour) return;

    // Clean up previous
    if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
    if (scrollListenerRef.current) {
      window.removeEventListener('scroll', scrollListenerRef.current, true);
    }

    // Scroll to target and highlight
    scrollAndHighlight();

    // Set up scroll listener to update position
    const handleScroll = () => updateSpotlight();
    scrollListenerRef.current = handleScroll;
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    // Set up resize observer on target
    const step = getCurrentStep();
    if (step && step.target !== 'body') {
      const selector = step.target.startsWith('[') ? step.target : `[data-tour="${step.target}"]`;
      const el = document.querySelector(selector);
      if (el) {
        resizeObserverRef.current = new ResizeObserver(() => updateSpotlight());
        resizeObserverRef.current.observe(el);
      }
    }

    return () => {
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
      if (scrollListenerRef.current) {
        window.removeEventListener('scroll', scrollListenerRef.current, true);
        window.removeEventListener('resize', scrollListenerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, currentTour, stepIndex]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      restoreElement();
    };
  }, [restoreElement]);

  const startTour = useCallback((tourType: TourType) => {
    if (isTourCompleted(tourType)) return;

    const steps = TOUR_STEPS[tourType];
    if (!steps || steps.length === 0) return;

    setCurrentTour(tourType);
    setStepIndex(0);
    setIsRunning(true);
  }, []);

  const resetTours = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('thallo_tour_completed');
    const tours: TourType[] = ['budgets', 'transactions', 'debts', 'savings', 'score'];
    tours.forEach(tour => localStorage.removeItem(getTourCompletionKey(tour)));
    restoreElement();
    setIsRunning(false);
    setCurrentTour(null);
    setStepIndex(0);
    setSpotlightRect(null);
    setReady(false);
  }, [restoreElement]);

  const endTour = useCallback((completed: boolean) => {
    if (completed && currentTour) {
      markTourCompleted(currentTour);
      if (currentTour === 'main') {
        fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ has_completed_tour: true }),
        }).catch(() => {});
      }
    }
    restoreElement();
    setIsRunning(false);
    setCurrentTour(null);
    setStepIndex(0);
    setSpotlightRect(null);
    setReady(false);
  }, [currentTour, restoreElement]);

  const handleNext = useCallback(() => {
    if (!currentTour) return;
    restoreElement();
    const steps = TOUR_STEPS[currentTour];
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      endTour(true);
    }
  }, [currentTour, stepIndex, endTour, restoreElement]);

  const handleBack = useCallback(() => {
    if (stepIndex > 0) {
      restoreElement();
      setStepIndex(stepIndex - 1);
    }
  }, [stepIndex, restoreElement]);

  const step = getCurrentStep();
  const totalSteps = currentTour ? TOUR_STEPS[currentTour].length : 0;

  // Build SVG mask for the spotlight cutout
  const svgMask = spotlightRect ? (
    <svg className="fixed inset-0 w-full h-full z-[9999] pointer-events-none" style={{ width: '100vw', height: '100vh' }}>
      <defs>
        <mask id="tour-spotlight-mask">
          {/* White = visible (the dark overlay) */}
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          {/* Black = transparent (the cutout) */}
          <rect
            x={spotlightRect.left}
            y={spotlightRect.top}
            width={spotlightRect.width}
            height={spotlightRect.height}
            rx="12"
            ry="12"
            fill="black"
          />
        </mask>
      </defs>
      {/* Dark overlay with the cutout */}
      <rect
        x="0" y="0" width="100%" height="100%"
        fill="rgba(13, 21, 20, 0.85)"
        mask="url(#tour-spotlight-mask)"
      />
      {/* Teal border around the cutout */}
      <rect
        x={spotlightRect.left}
        y={spotlightRect.top}
        width={spotlightRect.width}
        height={spotlightRect.height}
        rx="12"
        ry="12"
        fill="none"
        stroke="#1a7a6d"
        strokeWidth="2"
        style={{ filter: 'drop-shadow(0 0 12px rgba(26, 122, 109, 0.6))' }}
      />
    </svg>
  ) : null;

  return (
    <TourContext.Provider value={{ startTour, resetTours, isRunning, currentTour }}>
      {children}

      <AnimatePresence>
        {isRunning && step && ready && (
          <>
            {/* Click blocker — covers everything, clicking it closes the tour */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[9998]"
              onClick={() => endTour(false)}
            />

            {/* SVG spotlight overlay with true cutout */}
            {spotlightRect ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="pointer-events-none"
              >
                {svgMask}
              </motion.div>
            ) : (
              /* Center mode — just a dark overlay */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-[9999] pointer-events-none"
                style={{ background: 'rgba(13, 21, 20, 0.85)' }}
              />
            )}

            {/* Tooltip */}
            <TourTooltip
              key={stepIndex}
              step={step}
              index={stepIndex}
              total={totalSteps}
              onNext={handleNext}
              onBack={handleBack}
              onSkip={() => endTour(false)}
              onClose={() => endTour(false)}
              isFirst={stepIndex === 0}
              isLast={stepIndex === totalSteps - 1}
              position={tooltipPosition}
              targetRect={spotlightRect}
            />
          </>
        )}
      </AnimatePresence>
    </TourContext.Provider>
  );
}
