'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface DragContextValue {
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
}

const DragContext = createContext<DragContextValue | undefined>(undefined);

export function DragProvider({ children }: { children: ReactNode }) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <DragContext.Provider value={{ isDragging, setIsDragging }}>
      {children}
    </DragContext.Provider>
  );
}

export function useDragState() {
  const context = useContext(DragContext);
  // Return a safe default if used outside provider (e.g., during SSR or in non-swipeable views)
  if (context === undefined) {
    return { isDragging: false, setIsDragging: () => {} };
  }
  return context;
}
