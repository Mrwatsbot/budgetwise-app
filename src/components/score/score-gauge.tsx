'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScoreGaugeProps {
  score: number;
  levelTitle: string;
  level: number;
  previousScore: number | null;
}

/** Score tiers with color theming */
function getScoreTier(score: number) {
  if (score >= 900) return { label: 'Excellent', text: 'text-emerald-400', stroke: '#34d399', glow: '#34d39960', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
  if (score >= 750) return { label: 'Great', text: 'text-blue-400', stroke: '#60a5fa', glow: '#60a5fa50', bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
  if (score >= 600) return { label: 'Good', text: 'text-sky-400', stroke: '#38bdf8', glow: '#38bdf840', bg: 'bg-sky-500/15 text-sky-400 border-sky-500/30' };
  if (score >= 400) return { label: 'Building', text: 'text-amber-400', stroke: '#fbbf24', glow: '#fbbf2440', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
  if (score >= 200) return { label: 'Starting', text: 'text-orange-400', stroke: '#fb923c', glow: '#fb923c40', bg: 'bg-orange-500/15 text-orange-400 border-orange-500/30' };
  return { label: 'Beginning', text: 'text-red-400', stroke: '#f87171', glow: '#f8717140', bg: 'bg-red-500/15 text-red-400 border-red-500/30' };
}

export function ScoreGauge({ score, levelTitle, level, previousScore }: ScoreGaugeProps) {
  const percentage = (score / 1000) * 100;
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const tier = getScoreTier(score);
  const gradientId = 'scoreGradient';

  const change = previousScore !== null ? score - previousScore : 0;

  return (
    <div className="flex flex-col items-center py-6">
      {/* Circular Gauge */}
      <div className="relative w-52 h-52 mb-5">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          <defs>
            {/* Glow filter */}
            <filter id="scoreGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Gradient for the progress ring */}
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={tier.stroke} stopOpacity="0.7" />
              <stop offset="100%" stopColor={tier.stroke} stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Background ring — full circle outline */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            stroke="#2a2724"
            strokeWidth="10"
            fill="none"
          />

          {/* Progress ring with glow */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            stroke={`url(#${gradientId})`}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            filter="url(#scoreGlow)"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
              transition: 'stroke-dashoffset 1.2s ease-out, stroke 0.6s ease',
            }}
          />
        </svg>

        {/* Score center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-5xl font-bold tabular-nums', tier.text)}>
            {score}
          </span>
          <span className="text-sm text-muted-foreground mt-1">/ 1,000</span>
        </div>
      </div>

      {/* Level badge */}
      <div className={cn(
        'px-4 py-1.5 rounded-full border font-medium text-sm flex items-center gap-2',
        tier.bg
      )}>
        <span>Level {level}</span>
        <span className="opacity-60">|</span>
        <span>{levelTitle}</span>
      </div>

      {/* Trend */}
      {previousScore !== null && (
        <div className={cn(
          'flex items-center gap-1.5 mt-3 text-sm font-medium',
          change > 0 ? 'text-emerald-400' : change < 0 ? 'text-red-400' : 'text-muted-foreground'
        )}>
          {change > 0 ? (
            <TrendingUp className="w-4 h-4" />
          ) : change < 0 ? (
            <TrendingDown className="w-4 h-4" />
          ) : (
            <Minus className="w-4 h-4" />
          )}
          <span>{change > 0 ? '+' : ''}{change} from last score</span>
        </div>
      )}
    </div>
  );
}
