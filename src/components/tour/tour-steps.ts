import { Step } from 'react-joyride';

export type TourType = 'main' | 'budgets' | 'transactions' | 'debts' | 'savings' | 'score';

export interface TourStepConfig {
  [key: string]: Step[];
}

export const TOUR_STEPS: TourStepConfig = {
  main: [
    {
      target: 'body',
      content: 'Welcome to Thallo! Let\'s show you around and help you get started with your financial wellness journey.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="score-widget"]',
      content: 'This is your Financial Health Score. It tracks your overall financial wellness from 0-1,000, based on your spending habits, debt management, and savings progress.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="income-section"]',
      content: 'Start by entering your monthly income. This powers all your budgets, allocations, and score calculations.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="allocation-bar"]',
      content: 'This shows how your income is split across budgets, savings, and spending. Watch it update as you manage your finances!',
      placement: 'bottom',
    },
    {
      target: '[data-tour="recent-transactions"]',
      content: 'Your latest transactions appear here. Categorize them to improve your score accuracy and budget tracking.',
      placement: 'top',
    },
    {
      target: '[data-tour="nav-menu"]',
      content: 'Use the menu to explore Budgets, Debts, Savings, and more. Each section helps you take control of different aspects of your financial health.',
      placement: 'right',
    },
    {
      target: '[data-tour="score-cta"]',
      content: 'Head to your Score page to see what\'s helping and hurting your financial health. You\'ll get personalized recommendations to improve!',
      placement: 'bottom',
    },
  ],
  budgets: [
    {
      target: '[data-tour="ai-auto-budget"]',
      content: 'Set budgets for each category manually, or let our AI analyze your spending patterns and auto-create budgets for you!',
      placement: 'bottom',
    },
  ],
  transactions: [
    {
      target: '[data-tour="receipt-scan"]',
      content: 'Scan receipts or add transactions manually. Our AI will extract details and categorize them automatically.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="transaction-calendar"]',
      content: 'The calendar view shows your spending patterns over time. Tap any day to see transactions from that date.',
      placement: 'bottom',
    },
  ],
  debts: [
    {
      target: '[data-tour="add-debt"]',
      content: 'Add your debts here and we\'ll create an optimized payoff plan using either the avalanche or snowball method.',
      placement: 'bottom',
    },
  ],
  savings: [
    {
      target: '[data-tour="add-goal"]',
      content: 'Track savings goals and investments. Use the menu to edit goals, adjust targets, and mark milestones complete.',
      placement: 'bottom',
    },
  ],
  score: [
    {
      target: '[data-tour="pillar-cards"]',
      content: 'Your score breaks down into three pillars: Spending Health, Debt Management, and Savings Progress. Each one shows what to improve and celebrates your wins!',
      placement: 'bottom',
    },
  ],
};

export const TOUR_STORAGE_KEY = 'thallo_tour_completed';
export const PAGE_TOUR_STORAGE_PREFIX = 'thallo_page_tour_';

export function getTourCompletionKey(tourType: TourType): string {
  if (tourType === 'main') {
    return TOUR_STORAGE_KEY;
  }
  return `${PAGE_TOUR_STORAGE_PREFIX}${tourType}`;
}

export function isTourCompleted(tourType: TourType): boolean {
  if (typeof window === 'undefined') return false;
  const key = getTourCompletionKey(tourType);
  return localStorage.getItem(key) === 'true';
}

export function markTourCompleted(tourType: TourType): void {
  if (typeof window === 'undefined') return;
  const key = getTourCompletionKey(tourType);
  localStorage.setItem(key, 'true');
}

export function resetTour(tourType?: TourType): void {
  if (typeof window === 'undefined') return;
  if (tourType) {
    const key = getTourCompletionKey(tourType);
    localStorage.removeItem(key);
  } else {
    // Reset all tours
    localStorage.removeItem(TOUR_STORAGE_KEY);
    const tours: TourType[] = ['budgets', 'transactions', 'debts', 'savings', 'score'];
    tours.forEach(tour => {
      localStorage.removeItem(getTourCompletionKey(tour));
    });
  }
}
