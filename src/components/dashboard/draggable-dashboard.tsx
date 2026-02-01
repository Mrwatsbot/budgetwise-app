'use client';

import { Reorder, useDragControls, motion, AnimatePresence } from 'framer-motion';
import { GripVertical, Check, X, RotateCcw } from 'lucide-react';
import { useDragState } from '@/lib/contexts/drag-context';
import { cn } from '@/lib/utils';
import type { PointerEvent, ReactNode } from 'react';

export interface Widget {
  id: string;
  content: ReactNode;
}

interface DraggableDashboardProps {
  widgets: Widget[];
  onReorder: (newOrder: string[]) => void;
  hasChanges: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onReset: () => void;
}

function DraggableWidget({ widget }: { widget: Widget }) {
  const dragControls = useDragControls();
  const { setIsDragging } = useDragState();

  const handlePointerDown = (e: PointerEvent) => {
    e.preventDefault();
    dragControls.start(e);
  };

  return (
    <Reorder.Item
      key={widget.id}
      value={widget}
      dragListener={false}
      dragControls={dragControls}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => setIsDragging(false)}
      whileDrag={{
        scale: 1.02,
        boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.25)',
        zIndex: 999,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      className="relative"
    >
      {/* Drag Handle */}
      <div className="flex justify-center mb-1">
        <div
          onPointerDown={handlePointerDown}
          className={cn(
            'flex items-center gap-0.5 px-4 py-1 rounded-full cursor-grab active:cursor-grabbing',
            'touch-none select-none',
            'transition-all duration-200',
            'text-muted-foreground/30 hover:text-muted-foreground/60',
            'hover:bg-secondary/50 active:bg-[#1a7a6d1a] active:text-[#1a7a6d]'
          )}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>
      </div>

      {widget.content}
    </Reorder.Item>
  );
}

export function DraggableDashboard({
  widgets,
  onReorder,
  hasChanges,
  onSave,
  onDiscard,
  onReset,
}: DraggableDashboardProps) {
  const handleReorder = (newWidgets: Widget[]) => {
    onReorder(newWidgets.map(w => w.id));
  };

  return (
    <div className="relative">
      <Reorder.Group
        axis="y"
        values={widgets}
        onReorder={handleReorder}
        className="space-y-6"
      >
        {widgets.map(widget => (
          <DraggableWidget key={widget.id} widget={widget} />
        ))}
      </Reorder.Group>

      {/* Floating Save FAB */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2"
          >
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-full bg-secondary/90 backdrop-blur-md border border-border text-muted-foreground text-sm font-medium shadow-lg shadow-black/10 hover:bg-secondary active:scale-95 transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDiscard}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-full bg-secondary/90 backdrop-blur-md border border-border text-muted-foreground text-sm font-medium shadow-lg shadow-black/10 hover:bg-secondary active:scale-95 transition-all"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onSave}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1a7a6d] text-white text-sm font-medium shadow-lg shadow-[#1a7a6d]/30 hover:bg-[#146b5f] active:scale-95 transition-all"
            >
              <Check className="h-4 w-4" />
              <span>Save Layout</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
