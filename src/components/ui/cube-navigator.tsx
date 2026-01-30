'use client';

import { useState, useRef, ReactNode, useCallback, useEffect, useLayoutEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CubeFace {
  id: string;
  label: string;
  content: ReactNode;
}

interface CubeNavigatorProps {
  faces: CubeFace[];
  initialFace?: number;
}

export function CubeNavigator({ faces, initialFace = 0 }: CubeNavigatorProps) {
  const [currentFace, setCurrentFace] = useState(initialFace);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('left');
  const [prevFace, setPrevFace] = useState<number | null>(null);
  const [animHeight, setAnimHeight] = useState<number | null>(null);

  // Sliding indicator state
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const totalFaces = faces.length;

  // Measure and position the sliding indicator
  const updateIndicator = useCallback(() => {
    const activeEl = tabRefs.current[currentFace];
    const container = scrollContainerRef.current;
    if (!activeEl || !container) return;

    const containerRect = container.getBoundingClientRect();
    const tabRect = activeEl.getBoundingClientRect();

    setIndicatorStyle({
      left: tabRect.left - containerRect.left + container.scrollLeft,
      width: tabRect.width,
    });
  }, [currentFace]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [currentFace, updateIndicator]);

  useEffect(() => {
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  // Auto-scroll active tab to center
  useEffect(() => {
    const activeEl = tabRefs.current[currentFace];
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
  }, [currentFace]);

  const goToFace = useCallback((index: number, dir?: 'left' | 'right') => {
    if (isAnimating || index === currentFace) return;
    if (index < 0 || index >= totalFaces) return;

    const autoDir = dir || (index > currentFace ? 'left' : 'right');

    setAnimHeight(window.innerHeight - 120);
    setDirection(autoDir);
    setPrevFace(currentFace);
    setCurrentFace(index);
    setIsAnimating(true);

    setTimeout(() => {
      setIsAnimating(false);
      setPrevFace(null);
      setAnimHeight(null);
    }, 650);
  }, [isAnimating, currentFace, totalFaces]);

  const goNext = useCallback(() => {
    const next = (currentFace + 1) % totalFaces;
    goToFace(next, 'left');
  }, [currentFace, totalFaces, goToFace]);

  const goPrev = useCallback(() => {
    const prev = (currentFace - 1 + totalFaces) % totalFaces;
    goToFace(prev, 'right');
  }, [currentFace, totalFaces, goToFace]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diffX = e.touches[0].clientX - touchStartX.current;
    const diffY = e.touches[0].clientY - touchStartY.current;

    if (isHorizontalSwipe.current === null && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
      isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
    }

    if (isHorizontalSwipe.current) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isHorizontalSwipe.current) return;

    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const threshold = 50;

    if (diffX > threshold) {
      goNext();
    } else if (diffX < -threshold) {
      goPrev();
    }

    isHorizontalSwipe.current = null;
  };

  const getExitClass = () => direction === 'left' ? 'cube-exit-left' : 'cube-exit-right';
  const getEnterClass = () => direction === 'left' ? 'cube-enter-left' : 'cube-enter-right';

  return (
    <div className="relative w-full" style={{ minHeight: 'calc(100dvh - 56px)' }}>
      {/* ── Top Tab Bar — Scrollable with sliding indicator ── */}
      <div className="sticky top-0 z-30 bg-background border-b border-[#2a2523]">
        <div
          ref={scrollContainerRef}
          className="relative overflow-x-auto scrollbar-hide"
        >
          {/* Sliding indicator pill */}
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
            {faces.map((face, index) => (
              <button
                key={face.id}
                ref={(el) => { tabRefs.current[index] = el; }}
                onClick={() => {
                  if (index !== currentFace && !isAnimating) {
                    goToFace(index, index > currentFace ? 'left' : 'right');
                  }
                }}
                disabled={isAnimating}
                className={`relative z-10 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors duration-200 whitespace-nowrap ${
                  index === currentFace
                    ? 'text-[#0f0d0b]'
                    : 'text-[#8a8279] hover:text-[#b8afa4]'
                }`}
              >
                {face.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Navigation Arrows */}
      <button
        onClick={goPrev}
        disabled={isAnimating}
        className="hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full glass-card items-center justify-center text-[#8a8279] hover:text-[#ede6db] hover:border-[#e8922e33] transition-all"
        aria-label="Previous"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={goNext}
        disabled={isAnimating}
        className="hidden md:flex fixed right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full glass-card items-center justify-center text-[#8a8279] hover:text-[#ede6db] hover:border-[#e8922e33] transition-all"
        aria-label="Next"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* ── Content Area ── */}
      <div
        className="w-full py-6 px-4 md:px-8 pb-20 md:pb-6 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={contentRef}
          className="w-full max-w-3xl mx-auto relative"
          style={{
            perspective: '800px',
            height: animHeight ? `${animHeight}px` : 'auto',
            overflow: isAnimating ? 'hidden' : 'visible',
          }}
        >
          {/* Exiting face */}
          {isAnimating && prevFace !== null && (
            <div
              className={`absolute inset-0 ${getExitClass()}`}
              style={{ transformOrigin: 'center center' }}
            >
              {faces[prevFace].content}
            </div>
          )}

          {/* Current face */}
          <div
            className={isAnimating ? getEnterClass() : ''}
            style={{ transformOrigin: 'center center' }}
          >
            {faces[currentFace].content}
          </div>
        </div>
      </div>

      {/* ── Bottom Dots — Subtle, no frosting ── */}
      <div
        className="md:hidden fixed left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 px-3 py-1.5"
        style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {faces.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              if (index !== currentFace && !isAnimating) {
                goToFace(index, index > currentFace ? 'left' : 'right');
              }
            }}
            disabled={isAnimating}
            className={`rounded-full transition-all duration-300 ${
              index === currentFace
                ? 'w-7 h-2 bg-[#e8922e] shadow-[0_0_8px_rgba(232,146,46,0.4)]'
                : 'w-2 h-2 bg-[#3a3430] hover:bg-[#4a4440]'
            }`}
            aria-label={`Go to ${faces[index].label}`}
          />
        ))}
      </div>
    </div>
  );
}
