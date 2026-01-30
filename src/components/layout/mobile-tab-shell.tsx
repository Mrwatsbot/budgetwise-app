'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TabConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

interface MobileTabShellProps {
  tabs: TabConfig[];
  initialTab?: number;
}

export function MobileTabShell({ tabs, initialTab = 0 }: MobileTabShellProps) {
  const [currentTab, setCurrentTab] = useState(initialTab);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('left');
  const [prevTab, setPrevTab] = useState<number | null>(null);
  const [animHeight, setAnimHeight] = useState<number | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swipeDecided = useRef(false);
  const isHorizontal = useRef(false);
  const animatingRef = useRef(false);
  const currentTabRef = useRef(currentTab);

  const totalTabs = tabs.length;

  // Keep refs in sync with state
  useEffect(() => {
    currentTabRef.current = currentTab;
  }, [currentTab]);

  useEffect(() => {
    animatingRef.current = isAnimating;
  }, [isAnimating]);

  const goToTab = useCallback((index: number, dir?: 'left' | 'right') => {
    if (animatingRef.current || index === currentTabRef.current) return;
    if (index < 0 || index >= totalTabs) return;

    const autoDir = dir || (index > currentTabRef.current ? 'left' : 'right');

    setAnimHeight(window.innerHeight - 120);
    setDirection(autoDir);
    setPrevTab(currentTabRef.current);
    setCurrentTab(index);
    setIsAnimating(true);
    animatingRef.current = true;

    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

    setTimeout(() => {
      setIsAnimating(false);
      animatingRef.current = false;
      setPrevTab(null);
      setAnimHeight(null);
    }, 650);
  }, [totalTabs]);

  // Attach touch listeners directly to the DOM with { passive: false }
  // This gives us proper control over preventDefault
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (animatingRef.current) return;
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      swipeDecided.current = false;
      isHorizontal.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (animatingRef.current) return;
      
      const diffX = e.touches[0].clientX - touchStartX.current;
      const diffY = e.touches[0].clientY - touchStartY.current;

      // Decide direction once after meaningful movement
      if (!swipeDecided.current && (Math.abs(diffX) > 12 || Math.abs(diffY) > 12)) {
        swipeDecided.current = true;
        // Require clearly horizontal: X movement must exceed Y by 1.3x
        isHorizontal.current = Math.abs(diffX) > Math.abs(diffY) * 1.3;
      }

      // Block native scroll only for horizontal swipes
      if (swipeDecided.current && isHorizontal.current) {
        e.preventDefault();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (animatingRef.current) return;

      if (!swipeDecided.current || !isHorizontal.current) {
        swipeDecided.current = false;
        isHorizontal.current = false;
        return;
      }

      const diffX = touchStartX.current - e.changedTouches[0].clientX;
      const threshold = 60;
      const cur = currentTabRef.current;

      if (diffX > threshold && cur < totalTabs - 1) {
        goToTab(cur + 1, 'left');
      } else if (diffX < -threshold && cur > 0) {
        goToTab(cur - 1, 'right');
      }

      swipeDecided.current = false;
      isHorizontal.current = false;
    };

    // passive: false is critical - allows us to call preventDefault on touch events
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [goToTab, totalTabs]);

  const getExitClass = () => direction === 'left' ? 'cube-exit-left' : 'cube-exit-right';
  const getEnterClass = () => direction === 'left' ? 'cube-enter-left' : 'cube-enter-right';

  return (
    <div className="relative w-full min-h-dvh">
      {/* Tab indicators */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex justify-center py-3 gap-1.5 px-2 overflow-x-auto scrollbar-hide">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => {
                if (index !== currentTab && !isAnimating) {
                  goToTab(index, index > currentTab ? 'left' : 'right');
                }
              }}
              disabled={isAnimating}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                index === currentTab
                  ? 'bg-[#e8922e] text-[#0f0d0b] shadow-lg shadow-[#e8922e40]'
                  : 'bg-secondary/80 text-muted-foreground hover:bg-secondary'
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area - min-height ensures swipe works even on empty pages */}
      <div ref={contentRef} className="w-full py-4 px-4 pb-24" style={{ minHeight: 'calc(100dvh - 60px)' }}>
        <div
          className="w-full max-w-6xl mx-auto relative"
          style={{
            perspective: isAnimating ? '800px' : undefined,
            height: animHeight ? `${animHeight}px` : 'auto',
            overflow: isAnimating ? 'hidden' : undefined,
          }}
        >
          {/* Exiting tab */}
          {isAnimating && prevTab !== null && (
            <div
              className={`absolute inset-0 ${getExitClass()}`}
              style={{ transformOrigin: 'center center' }}
            >
              {tabs[prevTab].content}
            </div>
          )}

          {/* Current tab */}
          <div
            className={isAnimating ? getEnterClass() : ''}
            style={{ transformOrigin: 'center center' }}
          >
            {tabs[currentTab].content}
          </div>
        </div>
      </div>

      {/* Bottom progress dots */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full border border-border/50"
        style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {tabs.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              if (index !== currentTab && !isAnimating) {
                goToTab(index, index > currentTab ? 'left' : 'right');
              }
            }}
            disabled={isAnimating}
            className={cn(
              'transition-all rounded-full',
              index === currentTab
                ? 'w-6 h-2 bg-[#e8922e]'
                : 'w-2 h-2 bg-muted-foreground/40 hover:bg-muted-foreground/60'
            )}
            aria-label={`Go to ${tabs[index].label}`}
          />
        ))}
      </div>
    </div>
  );
}
