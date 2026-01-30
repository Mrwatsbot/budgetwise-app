'use client';

import { useState, useRef, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselSlide {
  id: string;
  label: string;
  content: ReactNode;
}

interface CarouselNavigatorProps {
  slides: CarouselSlide[];
  initialSlide?: number;
}

export function CarouselNavigator({ slides, initialSlide = 0 }: CarouselNavigatorProps) {
  const [currentSlide, setCurrentSlide] = useState(initialSlide);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);

  const totalSlides = slides.length;

  const goTo = (index: number) => {
    if (index < 0) index = 0;
    if (index >= totalSlides) index = totalSlides - 1;
    setCurrentSlide(index);
    setDragOffset(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchCurrentX.current - touchStartX.current;
    setDragOffset(diff);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    const threshold = 80;
    
    if (dragOffset > threshold && currentSlide > 0) {
      goTo(currentSlide - 1);
    } else if (dragOffset < -threshold && currentSlide < totalSlides - 1) {
      goTo(currentSlide + 1);
    } else {
      setDragOffset(0);
    }
  };

  // Mouse drag support for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    touchStartX.current = e.clientX;
    touchCurrentX.current = e.clientX;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    touchCurrentX.current = e.clientX;
    const diff = touchCurrentX.current - touchStartX.current;
    setDragOffset(diff);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    handleTouchEnd();
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleTouchEnd();
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Slide indicators */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            onClick={() => goTo(index)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              index === currentSlide
                ? 'bg-[#e8922e] text-white shadow-lg shadow-[#e8922e40]'
                : 'bg-secondary/80 text-muted-foreground hover:bg-secondary'
            }`}
          >
            {slide.label}
          </button>
        ))}
      </div>

      {/* Navigation arrows - Desktop */}
      {currentSlide > 0 && (
        <button
          onClick={() => goTo(currentSlide - 1)}
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full glass-card items-center justify-center text-muted-foreground hover:text-foreground hover:border-[#e8922e33] transition-all hover:scale-105"
          aria-label="Previous"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {currentSlide < totalSlides - 1 && (
        <button
          onClick={() => goTo(currentSlide + 1)}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full glass-card items-center justify-center text-muted-foreground hover:text-foreground hover:border-[#e8922e33] transition-all hover:scale-105"
          aria-label="Next"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Carousel track */}
      <div
        ref={containerRef}
        className="h-full pt-16 pb-8 cursor-grab active:cursor-grabbing select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(calc(-${currentSlide * 100}% + ${dragOffset}px))`,
            transitionDuration: isDragging ? '0ms' : '300ms',
          }}
        >
          {slides.map((slide, index) => {
            const isActive = index === currentSlide;
            const distance = Math.abs(index - currentSlide);
            
            return (
              <div
                key={slide.id}
                className="flex-shrink-0 w-full h-full px-4 md:px-12"
                style={{
                  opacity: isActive ? 1 : Math.max(0.3, 1 - distance * 0.4),
                  transform: `scale(${isActive ? 1 : 0.95})`,
                  transition: 'opacity 300ms, transform 300ms',
                }}
              >
                <div className="w-full max-w-3xl mx-auto h-full overflow-y-auto scrollbar-hide pb-8">
                  {slide.content}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress dots - Mobile */}
      <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentSlide
                ? 'w-6 bg-[#e8922e]'
                : 'bg-muted-foreground/30'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
