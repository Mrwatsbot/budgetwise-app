'use client';

import { Flame, Snowflake, CalendarCheck, Wallet, PiggyBank, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { StreakType } from '@/types/database';

interface StreakCardProps {
  type: StreakType;
  currentCount: number;
  longestCount: number;
  freezeAvailable: boolean;
}

const STREAK_CONFIG: Record<StreakType, {
  label: string;
  icon: typeof Flame;
  color: string;
  bg: string;
}> = {
  payment: {
    label: 'Payment',
    icon: CalendarCheck,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
  },
  budget: {
    label: 'Budget',
    icon: Wallet,
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
  },
  savings: {
    label: 'Savings',
    icon: PiggyBank,
    color: 'text-[#1a7a6d]',
    bg: 'bg-[#1a7a6d]/15',
  },
  logging: {
    label: 'Logging',
    icon: BookOpen,
    color: 'text-teal-400',
    bg: 'bg-teal-500/15',
  },
};

function FlameStack({ count }: { count: number }) {
  // Show 1-5 flames based on streak length
  const flames = Math.min(5, Math.max(1, Math.ceil(count / 7)));
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: flames }).map((_, i) => (
        <Flame
          key={i}
          className={cn(
            'transition-all',
            i === 0 ? 'w-5 h-5' : 'w-4 h-4',
            count >= 30 ? 'text-teal-400' :
            count >= 14 ? 'text-teal-400' :
            count >= 7 ? 'text-yellow-400' :
            'text-muted-foreground'
          )}
        />
      ))}
    </div>
  );
}

export function StreakCard({ type, currentCount, longestCount, freezeAvailable }: StreakCardProps) {
  const config = STREAK_CONFIG[type];
  const Icon = config.icon;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', config.bg)}>
            <Icon className={cn('w-4.5 h-4.5', config.color)} />
          </div>
          {currentCount > 0 && <FlameStack count={currentCount} />}
        </div>

        <p className="text-sm font-medium mb-1">{config.label} Streak</p>

        <div className="flex items-baseline gap-1 mb-2">
          <span className={cn('text-2xl font-bold tabular-nums', config.color)}>
            {currentCount}
          </span>
          <span className="text-xs text-muted-foreground">
            {currentCount === 1 ? 'day' : 'days'}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Best: {longestCount}</span>
          {freezeAvailable && (
            <span className="flex items-center gap-1 text-blue-400">
              <Snowflake className="w-3 h-3" />
              Freeze ready
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
