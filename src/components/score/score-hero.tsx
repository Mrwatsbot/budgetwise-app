'use client';

import { TrendingUp, Shield, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Types ─────────────────────────────────────── */

interface PillarMini {
  name: string;
  score: number;
  max: number;
}

interface ScoreHeroProps {
  trajectory: PillarMini;
  behavior: PillarMini;
  position: PillarMini;
}

/* ─── Pillar Mini Config ────────────────────────── */

const PILLAR_CONFIG = {
  Trajectory: {
    icon: TrendingUp,
    gradient: 'from-blue-500/80 to-blue-600/80',
    glow: '#3b82f6',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
  },
  Behavior: {
    icon: Shield,
    gradient: 'from-emerald-500/80 to-emerald-600/80',
    glow: '#10b981',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  Position: {
    icon: Landmark,
    gradient: 'from-amber-500/80 to-amber-600/80',
    glow: '#f59e0b',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
  },
} as const;

/* ─── Component ─────────────────────────────────── */

export function ScoreHeroPillars({ trajectory, behavior, position }: ScoreHeroProps) {
  const pillars = [
    { key: 'Trajectory' as const, ...trajectory },
    { key: 'Behavior' as const, ...behavior },
    { key: 'Position' as const, ...position },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
      {pillars.map(({ key, score, max }) => {
        const config = PILLAR_CONFIG[key];
        const Icon = config.icon;
        const pct = max > 0 ? Math.min(100, (score / max) * 100) : 0;

        return (
          <div
            key={key}
            className={cn(
              'relative rounded-xl p-3 sm:p-4 border overflow-hidden',
              'bg-white/[0.02] backdrop-blur-sm',
              config.border
            )}
          >
            {/* Subtle corner glow */}
            <div
              className="absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-30"
              style={{
                background: `radial-gradient(circle at 100% 0%, ${config.glow}20, transparent 70%)`,
              }}
            />

            <div className="relative z-10">
              {/* Icon + Name */}
              <div className="flex items-center gap-1.5 mb-2">
                <div className={cn('w-5 h-5 rounded flex items-center justify-center', config.bg)}>
                  <Icon className={cn('w-3 h-3', config.text)} />
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">
                  {key}
                </span>
              </div>

              {/* Score */}
              <div className="flex items-baseline gap-1 mb-2.5">
                <span className={cn('text-lg sm:text-xl font-bold tabular-nums', config.text)}>
                  {score}
                </span>
                <span className="text-[10px] text-muted-foreground/50">
                  /{max}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${config.glow}90, ${config.glow})`,
                    boxShadow: `0 0 8px ${config.glow}40`,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
