'use client';

import { useState, useRef, ReactNode } from 'react';
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
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const totalFaces = faces.length;
  const faceAngle = 360 / totalFaces; // 90° for 4 faces
  
  // Use Overview (index 0) for consistent animation height - shorter/cleaner rotation
  const ANIMATION_LAYOUT_FACE = 0;

  const goToFace = (index: number) => {
    if (isAnimating || index === currentFace) return;
    if (index < 0 || index >= totalFaces) return;
    
    setIsAnimating(true);
    
    // Calculate shortest rotation path
    let diff = index - currentFace;
    if (diff > totalFaces / 2) diff -= totalFaces;
    if (diff < -totalFaces / 2) diff += totalFaces;
    
    const newRotation = rotation - (diff * faceAngle);
    setRotation(newRotation);
    setCurrentFace(index);
    
    setTimeout(() => {
      setIsAnimating(false);
    }, 550);
  };
  
  // During animation, use consistent short height; after animation, match current face
  const layoutFace = isAnimating ? ANIMATION_LAYOUT_FACE : currentFace;

  const goNext = () => {
    const next = (currentFace + 1) % totalFaces;
    goToFace(next);
  };

  const goPrev = () => {
    const prev = (currentFace - 1 + totalFaces) % totalFaces;
    goToFace(prev);
  };

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

  // Check if a face should be visible (within 90° of current view)
  const isFaceVisible = (faceIndex: number) => {
    const faceRotation = faceIndex * faceAngle;
    const normalizedCubeRotation = (((-rotation % 360) + 360) % 360);
    
    let angleDiff = Math.abs(normalizedCubeRotation - faceRotation);
    if (angleDiff > 180) angleDiff = 360 - angleDiff;
    
    // Show face if it's within 90° of the front view
    return angleDiff <= 90;
  };

  return (
    <div className="relative w-full" style={{ minHeight: 'calc(100dvh - 56px)' }}>
      {/* Face indicators - Fixed at top */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex justify-center py-3 gap-2">
          {faces.map((face, index) => (
            <button
              key={face.id}
              onClick={() => goToFace(index)}
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

      {/* 3D Cube Container */}
      <div
        className="w-full py-6 px-4 md:px-8 pb-24 md:pb-6"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="w-full max-w-3xl mx-auto"
          style={{ perspective: '1000px' }}
        >
          {/* The Cube - scale counteracts the zoom from translateZ */}
          <div
            className="relative w-full transition-transform duration-500 ease-out"
            style={{
              transformStyle: 'preserve-3d',
              transform: `scale(0.87) rotateY(${rotation}deg)`,
            }}
          >
            {faces.map((face, index) => {
              const faceRotation = index * faceAngle;
              const visible = isFaceVisible(index);
              
              return (
                <div
                  key={face.id}
                  className={`cube-face w-full pb-16 bg-background ${index === layoutFace ? 'relative' : 'absolute top-0 left-0'}`}
                  style={{
                    transform: `rotateY(${faceRotation}deg) translateZ(150px)`,
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    visibility: visible ? 'visible' : 'hidden',
                    opacity: visible ? 1 : 0,
                    pointerEvents: index === currentFace ? 'auto' : 'none',
                  }}
                >
                  {face.content}
                </div>
              );
            })}
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
            onClick={() => goToFace(index)}
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
