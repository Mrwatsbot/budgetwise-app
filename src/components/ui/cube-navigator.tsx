'use client';

import { useState, useRef, useEffect, ReactNode, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDragState } from '@/lib/contexts/drag-context';

interface CubeFace {
  id: string;
  label: string;
  content: ReactNode;
}

interface CubeNavigatorProps {
  faces: CubeFace[];
  initialFace?: number;
  onFaceChange?: (index: number) => void;
}

export function CubeNavigator({ faces, initialFace = 0, onFaceChange }: CubeNavigatorProps) {
  const [currentFace, setCurrentFace] = useState(initialFace);
  const scrollRef = useRef<HTMLDivElement>(null);
  const faceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  const savedScrollPos = useRef<number>(0);
  const { isDragging } = useDragState();

  const totalFaces = faces.length;

  // Apply parallax depth effect based on scroll position
  const updateParallax = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    const scrollLeft = container.scrollLeft;
    const pageWidth = container.clientWidth;

    faceRefs.current.forEach((el, i) => {
      if (!el) return;
      const offset = (scrollLeft - i * pageWidth) / pageWidth; // -1 to 1 range
      const absOffset = Math.abs(offset);
      
      // Scale: active page is 1.0, adjacent pages scale down to 0.92
      const scale = 1 - absOffset * 0.08;
      // Translate content slightly for parallax feel
      const parallaxX = offset * -30; // content shifts opposite to scroll
      // Subtle border radius increase on non-active pages
      const radius = absOffset * 16;
      // Opacity dim on far pages
      const opacity = 1 - absOffset * 0.3;

      const inner = el.firstElementChild as HTMLElement;
      if (inner) {
        inner.style.transform = `scale(${Math.max(scale, 0.92)}) translateX(${parallaxX}px)`;
        inner.style.borderRadius = `${radius}px`;
        inner.style.opacity = String(Math.max(opacity, 0.7));
        inner.style.transition = 'none';
      }
    });
  }, []);

  // Scroll to a specific face
  const scrollToFace = useCallback((index: number) => {
    if (!scrollRef.current || index < 0 || index >= totalFaces) return;
    scrollRef.current.scrollTo({
      left: index * scrollRef.current.clientWidth,
      behavior: 'smooth',
    });
  }, [totalFaces]);

  // Lock scroll position when dragging
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (!isDragging) return; // Exit early if not dragging

    // Save current scroll position
    savedScrollPos.current = el.scrollLeft;
    
    // Continuously enforce scroll position lock via scroll event
    const enforceScrollLock = () => {
      if (el.scrollLeft !== savedScrollPos.current) {
        el.scrollLeft = savedScrollPos.current;
      }
    };

    // Listen to scroll events and immediately reset position
    el.addEventListener('scroll', enforceScrollLock, { passive: true });

    // Cleanup runs when isDragging becomes false OR component unmounts
    return () => {
      el.removeEventListener('scroll', enforceScrollLock);
    };
  }, [isDragging]);

  // Listen to scroll events for face detection + parallax
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      // Skip if dragging
      if (isDragging) return;

      // Parallax + eager face detection on every frame
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        updateParallax();
        // Eagerly update active tab as soon as scroll crosses midpoint
        if (!scrollRef.current) return;
        const w = scrollRef.current.clientWidth;
        const newIndex = Math.round(scrollRef.current.scrollLeft / w);
        if (newIndex !== currentFace && newIndex >= 0 && newIndex < totalFaces) {
          setCurrentFace(newIndex);
          onFaceChange?.(newIndex);
        }
      });
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [currentFace, totalFaces, onFaceChange, updateParallax, isDragging]);

  // Set initial scroll position + initial parallax
  useEffect(() => {
    if (scrollRef.current && initialFace > 0) {
      scrollRef.current.scrollLeft = initialFace * scrollRef.current.clientWidth;
    }
    // Initial parallax state
    requestAnimationFrame(updateParallax);
  }, [initialFace, updateParallax]);

  // Auto-scroll the mobile tab bar to keep active tab visible
  useEffect(() => {
    const tabBar = tabBarRef.current;
    const activeTab = tabRefs.current[currentFace];
    if (!tabBar || !activeTab) return;

    const tabBarRect = tabBar.getBoundingClientRect();
    const activeTabRect = activeTab.getBoundingClientRect();
    const tabBarScrollLeft = tabBar.scrollLeft;

    // Calculate if active tab is out of view
    const leftEdge = activeTabRect.left - tabBarRect.left + tabBarScrollLeft;
    const rightEdge = leftEdge + activeTabRect.width;
    const viewportWidth = tabBar.clientWidth;

    // Scroll to center the active tab
    const targetScroll = leftEdge - (viewportWidth / 2) + (activeTabRect.width / 2);

    tabBar.scrollTo({
      left: targetScroll,
      behavior: 'instant',
    });
  }, [currentFace]);

  const goNext = useCallback(() => {
    if (currentFace + 1 < totalFaces) scrollToFace(currentFace + 1);
  }, [currentFace, totalFaces, scrollToFace]);

  const goPrev = useCallback(() => {
    if (currentFace > 0) scrollToFace(currentFace - 1);
  }, [currentFace, scrollToFace]);

  return (
    <div className="relative w-full" style={{ minHeight: 'calc(100dvh - 56px)' }}>
      {/* Face tab buttons - Desktop/tablet only */}
      <div className="hidden md:block sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex justify-center py-3 gap-2">
          {faces.map((face, index) => (
            <button
              key={face.id}
              onClick={() => scrollToFace(index)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                index === currentFace
                  ? 'bg-[#1a7a6d] text-white shadow-lg shadow-[#1a7a6d40]'
                  : 'bg-secondary/80 text-muted-foreground hover:bg-secondary'
              }`}
            >
              {face.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile horizontal scrolling tab bar */}
      <div className="md:hidden sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div 
          ref={tabBarRef}
          className="flex gap-2 px-3 py-2.5 overflow-x-auto scrollbar-hide scroll-smooth"
          style={{
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {faces.map((face, index) => (
            <button
              key={face.id}
              ref={(el) => { tabRefs.current[index] = el; }}
              onClick={() => scrollToFace(index)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-300 shrink-0 ${
                index === currentFace
                  ? 'bg-[#1a7a6d] text-white shadow-md shadow-[#1a7a6d40]'
                  : 'bg-secondary/60 text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              {face.label}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation arrows - Desktop */}
      <button
        onClick={goPrev}
        className="hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full glass-card items-center justify-center text-muted-foreground hover:text-foreground hover:border-[#1a7a6d4d] transition-all"
        aria-label="Previous"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={goNext}
        className="hidden md:flex fixed right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full glass-card items-center justify-center text-muted-foreground hover:text-foreground hover:border-[#1a7a6d4d] transition-all"
        aria-label="Next"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Horizontal scroll container — native scroll-snap with parallax */}
      <div
        ref={scrollRef}
        className={`flex items-start snap-x snap-mandatory scrollbar-hide ${isDragging ? 'overflow-x-hidden' : 'overflow-x-auto'}`}
        style={{
          WebkitOverflowScrolling: isDragging ? 'auto' : 'touch',
          scrollbarWidth: 'none',
          touchAction: isDragging ? 'none' : 'auto',
          userSelect: isDragging ? 'none' : 'auto',
        }}
      >
        {faces.map((face, index) => (
          <div
            key={face.id}
            ref={(el) => { faceRefs.current[index] = el; }}
            className="min-w-full w-full snap-center shrink-0 overflow-hidden"
          >
            <div
              className="w-full max-w-6xl mx-auto py-6 px-4 md:px-8 pb-6 will-change-transform"
              style={{ transformOrigin: 'center top' }}
            >
              {face.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
