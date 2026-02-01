'use client';

import { useCallback } from 'react';
import { CubeNavigator } from '@/components/ui/cube-navigator';
import { DashboardContent } from '@/components/pages/dashboard-content';
import { TransactionsContent } from '@/components/pages/transactions-content';
import { BudgetsContent } from '@/components/pages/budgets-content';
import { DebtsContent } from '@/components/pages/debts-content';
import { SavingsContent } from '@/components/pages/savings-content';
import { ReviewContent } from '@/components/pages/review-content';
import { CoachingContent } from '@/components/pages/coaching-content';
import { ScoreContent } from '@/components/pages/score-content';
import { DragProvider } from '@/lib/contexts/drag-context';

const PAGES = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  { id: 'transactions', label: 'Transactions', path: '/transactions' },
  { id: 'budgets', label: 'Budgets', path: '/budgets' },
  { id: 'debts', label: 'Debts', path: '/debts' },
  { id: 'savings', label: 'Savings', path: '/savings' },
  { id: 'review', label: 'Review', path: '/review' },
  { id: 'coaching', label: 'AI Coach', path: '/coaching' },
  { id: 'score', label: 'Score', path: '/score' },
];

interface MobileAppViewProps {
  initialPath: string;
}

export function MobileAppView({ initialPath }: MobileAppViewProps) {
  const initialIndex = Math.max(0, PAGES.findIndex(p => p.path === initialPath));

  const handleFaceChange = useCallback((index: number) => {
    const page = PAGES[index];
    if (page) {
      window.history.replaceState(null, '', page.path);
    }
  }, []);

  const faces = [
    { id: 'dashboard', label: 'Dashboard', content: <DashboardContent /> },
    { id: 'transactions', label: 'Transactions', content: <TransactionsContent /> },
    { id: 'budgets', label: 'Budgets', content: <BudgetsContent /> },
    { id: 'debts', label: 'Debts', content: <DebtsContent /> },
    { id: 'savings', label: 'Savings', content: <SavingsContent /> },
    { id: 'review', label: 'Review', content: <ReviewContent /> },
    { id: 'coaching', label: 'AI Coach', content: <CoachingContent /> },
    { id: 'score', label: 'Score', content: <ScoreContent /> },
  ];

  return (
    <DragProvider>
      <CubeNavigator
        faces={faces}
        initialFace={initialIndex}
        onFaceChange={handleFaceChange}
      />
    </DragProvider>
  );
}
