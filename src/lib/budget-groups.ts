/**
 * Budget Groups — classifies categories into Needs / Wants / Savings & Investments
 * Used by the budget list, budget grid, and month-end review for consistent grouping.
 */

export type BudgetGroupKey = 'needs' | 'wants' | 'savings';

export interface BudgetGroup {
  key: BudgetGroupKey;
  label: string;
  sublabel: string;
  /** Target percentage from 50/30/20 rule */
  targetPct: number;
  /** Accent color (hex) */
  color: string;
  /** Lighter bg color for the group box */
  bgColor: string;
  /** Border color */
  borderColor: string;
  /** Icon/emoji */
  icon: string;
}

export const BUDGET_GROUPS: Record<BudgetGroupKey, BudgetGroup> = {
  needs: {
    key: 'needs',
    label: 'Needs',
    sublabel: 'Essentials you can\'t skip',
    targetPct: 50,
    color: '#4a90d9',
    bgColor: 'rgba(74, 144, 217, 0.06)',
    borderColor: 'rgba(74, 144, 217, 0.20)',
    icon: '🏠',
  },
  wants: {
    key: 'wants',
    label: 'Wants',
    sublabel: 'Fun stuff & lifestyle',
    targetPct: 30,
    color: '#2aaa9a',
    bgColor: 'rgba(42, 170, 154, 0.06)',
    borderColor: 'rgba(42, 170, 154, 0.20)',
    icon: '✨',
  },
  savings: {
    key: 'savings',
    label: 'Savings & Investments',
    sublabel: 'Future you says thanks',
    targetPct: 20,
    color: '#6db555',
    bgColor: 'rgba(109, 181, 85, 0.06)',
    borderColor: 'rgba(109, 181, 85, 0.20)',
    icon: '💰',
  },
};

/** Group order for rendering */
export const GROUP_ORDER: BudgetGroupKey[] = ['needs', 'wants', 'savings'];

/**
 * Needs categories — matched by lowercase name.
 * Anything not in this set (and not savings-type) falls to Wants.
 */
const NEEDS_NAMES = new Set([
  'housing',
  'rent',
  'mortgage',
  'groceries',
  'transportation',
  'utilities',
  'healthcare',
  'insurance',
  'childcare',
  'medical',
  'phone',
  'internet',
]);

/**
 * Savings-related category names
 */
const SAVINGS_NAMES = new Set([
  'savings',
  'investments',
  'emergency fund',
  'retirement',
  '401k',
  'ira',
  'hsa',
]);

/**
 * Classify a single category into a budget group.
 * Priority: savings type → needs name match → wants (default)
 */
export function classifyCategory(
  categoryName: string,
  categoryType?: string
): BudgetGroupKey {
  const name = categoryName.toLowerCase().trim();

  // Savings/investment type categories
  if (
    categoryType === 'savings' ||
    categoryType === 'investment' ||
    SAVINGS_NAMES.has(name)
  ) {
    return 'savings';
  }

  // Needs
  if (NEEDS_NAMES.has(name)) {
    return 'needs';
  }

  // Everything else is a want
  return 'wants';
}

/**
 * Group an array of category budget items into the three groups.
 * Returns a map of group key → items in that group.
 */
export function groupBudgetCategories<T extends { categoryName: string; categoryType?: string }>(
  items: T[]
): Record<BudgetGroupKey, T[]> {
  const grouped: Record<BudgetGroupKey, T[]> = {
    needs: [],
    wants: [],
    savings: [],
  };

  for (const item of items) {
    const group = classifyCategory(item.categoryName, item.categoryType);
    grouped[group].push(item);
  }

  return grouped;
}
