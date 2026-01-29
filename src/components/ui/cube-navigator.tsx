'use client';

import { useState, useRef, ReactNode, useCallback } from 'react';
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
  
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const totalFaces = faces.length;

  const goToFace = useCallback((index: number, dir?: 'left' | 'right') => {
    if (isAnimating || index === currentFace) return;
    if (index < 0 || index >= totalFaces) return;
    
    // Determine direction if not specified
    const autoDir = dir || (index > currentFace ? 'left' : 'right');
    
    // Capture current height before animating so all turns look the same
    if (contentRef.current) {
      setAnimHeight(contentRef.current.offsetHeight);
    }
    
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

  // Animation classes for the "cube turn" effect
  const getExitClass = () => {
    if (direction === 'left') {
      return 'cube-exit-left';
    }
    return 'cube-exit-right';
  };

  const getEnterClass = () => {
    if (direction === 'left') {
      return 'cube-enter-left';
    }
    return 'cube-enter-right';
  };

  return (
    <div className="relative w-full" style={{ minHeight: 'calc(100dvh - 56px)' }}>
      {/* Face indicators - Fixed at top */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex justify-center py-3 gap-2">
          {faces.map((face, index) => (
            <button
              key={face.id}
              onClick={() => {
                if (index !== currentFace) {
                  goToFace(index, index > currentFace ? 'left' : 'right');
                }
              }}
              disabled={isAnimating}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                index === currentFace
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-secondary/80 text-muted-foreground hover:bg-secondary'
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
        disabled={isAnimating}
        className="hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full glass-card items-center justify-center text-muted-foreground hover:text-foreground hover:border-purple-500/30 transition-all"
        aria-label="Previous"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={goNext}
        disabled={isAnimating}
        className="hidden md:flex fixed right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full glass-card items-center justify-center text-muted-foreground hover:text-foreground hover:border-purple-500/30 transition-all"
        aria-label="Next"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Content Area */}
      <div
        className="w-full py-6 px-4 md:px-8 pb-24 md:pb-6 overflow-hidden"
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

      {/* Bottom progress indicator - Mobile */}
      <div 
        className="md:hidden fixed left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full border border-border/50"
        style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {faces.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              if (index !== currentFace) {
                goToFace(index, index > currentFace ? 'left' : 'right');
              }
            }}
            disabled={isAnimating}
            className={`transition-all rounded-full ${
              index === currentFace
                ? 'w-6 h-2 bg-purple-500'
                : 'w-2 h-2 bg-muted-foreground/40 hover:bg-muted-foreground/60'
            }`}
            aria-label={`Go to ${faces[index].label}`}
          />
        ))}
      </div>
    </div>
  );
}
