'use client';

import {
  Award,
  Star,
  Trophy,
  Crown,
  HelpCircle,
  Zap,
  Target,
  Shield,
  Gem,
  Medal,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AchievementCategory } from '@/types/database';

interface AchievementBadgeProps {
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  isSecret: boolean;
  unlocked: boolean;
  unlockedAt?: string;
}

// Map icon strings to Lucide components
const ICON_MAP: Record<string, typeof Award> = {
  award: Award,
  star: Star,
  trophy: Trophy,
  crown: Crown,
  zap: Zap,
  target: Target,
  shield: Shield,
  gem: Gem,
  medal: Medal,
};

const CATEGORY_COLORS: Record<AchievementCategory, {
  border: string;
  bg: string;
  text: string;
  glow: string;
}> = {
  beginner: {
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/20',
  },
  progress: {
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/20',
  },
  achievement: {
    border: 'border-[#1a7a6d66]',
    bg: 'bg-[#1a7a6d]/15',
    text: 'text-[#1a7a6d]',
    glow: 'shadow-[#1a7a6d33]',
  },
  elite: {
    border: 'border-teal-500/40',
    bg: 'bg-teal-500/15',
    text: 'text-teal-400',
    glow: 'shadow-teal-500/20',
  },
  secret: {
    border: 'border-pink-500/40',
    bg: 'bg-pink-500/15',
    text: 'text-pink-400',
    glow: 'shadow-pink-500/20',
  },
};

export function AchievementBadge({
  name,
  description,
  icon,
  category,
  isSecret,
  unlocked,
  unlockedAt,
}: AchievementBadgeProps) {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.beginner;
  const IconComponent = unlocked
    ? (ICON_MAP[icon.toLowerCase()] || Award)
    : isSecret
      ? HelpCircle
      : Lock;

  const displayName = unlocked ? name : isSecret ? '???' : name;
  const displayDesc = unlocked ? description : isSecret ? 'Keep exploring to discover this' : description;

  return (
    <div
      className={cn(
        'flex flex-col items-center text-center p-4 rounded-xl border transition-all',
        unlocked
          ? cn(colors.border, colors.bg, 'shadow-lg', colors.glow)
          : 'border-border bg-muted/30 opacity-50'
      )}
    >
      <div className={cn(
        'w-12 h-12 rounded-full flex items-center justify-center mb-2',
        unlocked ? colors.bg : 'bg-muted'
      )}>
        <IconComponent className={cn(
          'w-6 h-6',
          unlocked ? colors.text : 'text-muted-foreground'
        )} />
      </div>

      <p className={cn(
        'text-xs font-semibold mb-0.5',
        unlocked ? '' : 'text-muted-foreground'
      )}>
        {displayName}
      </p>

      <p className="text-[10px] text-muted-foreground line-clamp-2">
        {displayDesc}
      </p>

      {unlocked && unlockedAt && (
        <p className="text-[10px] text-muted-foreground mt-1.5">
          {new Date(unlockedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </p>
      )}
    </div>
  );
}
