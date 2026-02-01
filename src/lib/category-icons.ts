import {
  ShoppingCart, UtensilsCrossed, Car, Lightbulb, Home, 
  Heart, Film, ShoppingBag, Sparkles, GraduationCap,
  Smartphone, Shield, Gift, Plane, Dog, Package,
  Utensils, Zap, HeartPulse, Repeat, Wallet,
  DollarSign, TrendingUp, RefreshCw, Briefcase,
  type LucideIcon,
} from 'lucide-react';

// Map Lucide icon names (used in demo data) to components
const iconNameMap: Record<string, LucideIcon> = {
  'utensils': Utensils,
  'car': Car,
  'shopping-bag': ShoppingBag,
  'film': Film,
  'zap': Zap,
  'heart-pulse': HeartPulse,
  'repeat': Repeat,
  'sparkles': Sparkles,
};

// Map category names to Lucide icons (for DB categories that store emoji strings)
const categoryNameMap: Record<string, LucideIcon> = {
  'groceries': ShoppingCart,
  'dining out': UtensilsCrossed,
  'food & dining': Utensils,
  'transportation': Car,
  'utilities': Lightbulb,
  'housing': Home,
  'healthcare': HeartPulse,
  'health': HeartPulse,
  'entertainment': Film,
  'shopping': ShoppingBag,
  'personal care': Sparkles,
  'education': GraduationCap,
  'subscriptions': Smartphone,
  'insurance': Shield,
  'gifts': Gift,
  'travel': Plane,
  'pets': Dog,
  'other expense': Package,
  'other': Package,
  // Income categories
  'salary': Briefcase,
  'freelance': Wallet,
  'investment': TrendingUp,
  'refund': RefreshCw,
  'other income': DollarSign,
};

/**
 * Get a Lucide icon component for a budget category.
 * Resolves by icon name first, then by category name, then falls back to Package.
 */
export function getCategoryIcon(iconName: string | null, categoryName?: string): LucideIcon {
  // Try icon name lookup first (for demo data using lucide names like 'utensils')
  if (iconName && iconNameMap[iconName]) {
    return iconNameMap[iconName];
  }

  // Try category name lookup (for DB categories that store emojis as icon)
  if (categoryName) {
    const normalized = categoryName.toLowerCase().trim();
    if (categoryNameMap[normalized]) {
      return categoryNameMap[normalized];
    }
  }

  return Package;
}
