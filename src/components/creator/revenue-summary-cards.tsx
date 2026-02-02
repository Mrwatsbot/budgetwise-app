'use client';

import { motion } from 'framer-motion';
import { DollarSign, Wifi, TrendingUp, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SummaryCard {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    positive: boolean;
  };
  status?: {
    text: string;
    color: string;
  };
}

const mockCards: SummaryCard[] = [
  {
    label: 'Total Revenue',
    value: '$8,240',
    subtext: 'This month',
    icon: <DollarSign className="w-5 h-5" />,
    trend: {
      value: 12.5,
      positive: true,
    },
  },
  {
    label: 'Active Platforms',
    value: '4',
    subtext: 'Connected',
    icon: <Wifi className="w-5 h-5" />,
    status: {
      text: 'All synced',
      color: 'text-emerald-400',
    },
  },
  {
    label: 'Best Day',
    value: '$847',
    subtext: 'March 15',
    icon: <Calendar className="w-5 h-5" />,
    trend: {
      value: 23.8,
      positive: true,
    },
  },
];

export function RevenueSummaryCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {mockCards.map((card, index) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="glass-card p-4"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#1a7a6d]/20 text-[#1a7a6d]">
                {card.icon}
              </div>
            </div>
            {card.trend && (
              <div
                className={cn(
                  'flex items-center gap-1 text-xs font-medium',
                  card.trend.positive ? 'text-emerald-400' : 'text-rose-400'
                )}
              >
                <TrendingUp
                  className={cn(
                    'w-3 h-3',
                    !card.trend.positive && 'rotate-180'
                  )}
                />
                <span>{card.trend.value}%</span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs text-white/60">{card.label}</p>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-white/60">{card.subtext}</p>
              {card.status && (
                <>
                  <span className="text-white/30">•</span>
                  <p className={cn('text-xs font-medium', card.status.color)}>
                    {card.status.text}
                  </p>
                </>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
