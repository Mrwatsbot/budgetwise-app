'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const DEFAULT_ORDER = [
  'monthly-pulse',
  'score-widget',
  'year-at-a-glance',
  'budget-overview',
  'recent-transactions',
  'insights',
];

const STORAGE_KEY = 'thallo-widget-order';

/**
 * Hook to manage dashboard widget order with localStorage persistence.
 * Separates "live" order from "saved" order so we can detect unsaved changes.
 */
export function useWidgetOrder() {
  const [orderedIds, setOrderedIds] = useState<string[]>(DEFAULT_ORDER);
  const [savedOrder, setSavedOrder] = useState<string[]>(DEFAULT_ORDER);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge: keep stored order, add any new widgets at the end
          const merged = [
            ...parsed.filter((id: string) => DEFAULT_ORDER.includes(id)),
            ...DEFAULT_ORDER.filter(id => !parsed.includes(id)),
          ];
          setOrderedIds(merged);
          setSavedOrder(merged);
        }
      }
      loaded.current = true;
    } catch {
      loaded.current = true;
    }
  }, []);

  const hasChanges = loaded.current && JSON.stringify(orderedIds) !== JSON.stringify(savedOrder);

  const saveOrder = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orderedIds));
      setSavedOrder([...orderedIds]);
    } catch {}
  }, [orderedIds]);

  const discardChanges = useCallback(() => {
    setOrderedIds([...savedOrder]);
  }, [savedOrder]);

  const resetOrder = useCallback(() => {
    setOrderedIds(DEFAULT_ORDER);
    setSavedOrder(DEFAULT_ORDER);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ORDER));
    } catch {}
  }, []);

  return { orderedIds, setOrderedIds, saveOrder, discardChanges, resetOrder, hasChanges };
}
