'use client';

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
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

  // Sliding indicator state
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  // Measure and position the sliding indicator behind active tab
  const updateIndicator = useCallback(() => {
    const activeEl = tabRefs.current[currentTab];
    const container = scrollContainerRef.current;
    if (!activeEl || !container) return;

    const containerRect = container.getBoundingClientRect();
    const tabRect = activeEl.getBoundingClientRect();

    setIndicatorStyle({
      left: tabRect.left - containerRect.left + container.scrollLeft,
      width: tabRect.width,
    });
  }, [currentTab]);

  // Update indicator on tab change + resize
  useLayoutEffect(() => {
    updateIndicator();
  }, [currentTab, updateIndicator]);

  useEffect(() => {
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  // Auto-scroll active tab to center of the scrollable bar
  useEffect(() => {
    const activeEl = tabRefs.current[currentTab];
    const container = scrollContainerRef.current;
    if (!activeEl || !container) return;

    const containerRect = container.getBoundingClientRect();
    const tabRect = activeEl.getBoundingClientRect();
    const tabCenter = tabRect.left + tabRect.width / 2;
    const containerCenter = containerRect.left + containerRect.width / 2;
    const scrollDelta = tabCenter - containerCenter;

    container.scrollBy({
      left: scrollDelta,
      behavior: 'smooth',
    });
  }, [currentTab]);

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

      if (!swipeDecided.current && (Math.abs(diffX) > 12 || Math.abs(diffY) > 12)) {
        swipeDecided.current = true;
        isHorizontal.current = Math.abs(diffX) > Math.abs(diffY) * 1.3;
      }

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
      {/* ── Top Tab Bar ── */}
      <div className="sticky top-0 z-30 bg-background border-b border-[#2a2523]">
        <div
          ref={scrollContainerRef}
          className="relative overflow-x-auto scrollbar-hide"
        >
          {/* Sliding indicator pill — sits behind the active button */}
          <div
            className="tab-indicator absolute top-1/2 -translate-y-1/2 h-[34px] rounded-full"
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
              background: 'linear-gradient(135deg, #e8922e 0%, #d4800f 100%)',
              boxShadow: '0 0 20px rgba(232, 146, 46, 0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          />

          {/* Tab buttons */}
          <div className="flex items-center gap-1 px-3 py-2.5 w-max min-w-full justify-center">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                ref={(el) => { tabRefs.current[index] = el; }}
                onClick={() => {
                  if (index !== currentTab && !isAnimating) {
                    goToTab(index, index > currentTab ? 'left' : 'right');
                  }
                }}
                disabled={isAnimating}
                className={cn(
                  'relative z-10 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors duration-200 whitespace-nowrap',
                  index === currentTab
                    ? 'text-[#0f0d0b]'
                    : 'text-[#8a8279] hover:text-[#b8afa4]'
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content Area ── */}
      <div ref={contentRef} className="w-full py-4 px-4 pb-20" style={{ minHeight: 'calc(100dvh - 60px)' }}>
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

      {/* ── Bottom Dots — Subtle, no frosting ── */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 px-3 py-1.5"
        style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
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
              'rounded-full transition-all duration-300',
              index === currentTab
                ? 'w-7 h-2 bg-[#e8922e] shadow-[0_0_8px_rgba(232,146,46,0.4)]'
                : 'w-2 h-2 bg-[#3a3430] hover:bg-[#4a4440]'
            )}
            aria-label={`Go to ${tabs[index].label}`}
          />
        ))}
      </div>
    </div>
  );
}
