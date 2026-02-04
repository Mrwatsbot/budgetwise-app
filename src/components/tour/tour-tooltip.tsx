import { TooltipRenderProps } from 'react-joyride';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

export function TourTooltip({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
  isLastStep,
  size,
}: TooltipRenderProps) {
  return (
    <div
      {...tooltipProps}
      className="bg-zinc-900/95 backdrop-blur-xl border border-[#1a7a6d] rounded-xl shadow-2xl max-w-md animate-in fade-in-0 zoom-in-95 duration-200"
      style={{ padding: 0 }}
    >
      {/* Header with step counter */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#1a7a6d33]">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#1a7a6d] animate-pulse" />
          <span className="text-xs font-medium text-[#8aaba6]">
            Step {index + 1} of {size}
          </span>
        </div>
        <button
          {...closeProps}
          className="text-[#8aaba6] hover:text-[#e8eded] transition-colors"
          aria-label="Close tour"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        {step.title && (
          <h3 className="text-lg font-display font-semibold text-[#e8eded] mb-2">
            {step.title}
          </h3>
        )}
        <div className="text-[#e8eded] text-sm leading-relaxed">
          {step.content}
        </div>
      </div>

      {/* Footer with navigation buttons */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-[#1a7a6d33]">
        <div className="flex items-center gap-2">
          {index > 0 && (
            <Button
              {...backProps}
              variant="outline"
              size="sm"
              className="border-[#1a7a6d33] text-[#8aaba6] hover:text-[#e8eded] hover:bg-[#1a7a6d22]"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            {...closeProps}
            variant="ghost"
            size="sm"
            className="text-[#8aaba6] hover:text-[#e8eded] hover:bg-[#1a7a6d22]"
          >
            Skip Tour
          </Button>

          {continuous && (
            <Button
              {...primaryProps}
              size="sm"
              className="bg-[#1a7a6d] text-white hover:bg-[#1a7a6d]/90 border-0"
            >
              {isLastStep ? (
                'Get Started'
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
