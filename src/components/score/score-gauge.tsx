'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScoreGaugeProps {
  score: number;
  levelTitle: string;
  level: number;
  previousScore: number | null;
}

function getScoreColor(score: number): string {
  if (score >= 900) return 'text-emerald-500';
  if (score >= 750) return 'text-blue-500';
  if (score >= 600) return 'text-yellow-500';
  if (score >= 400) return 'text-teal-600';
  return 'text-red-500';
}

function getStrokeColor(score: number): string {
  if (score >= 900) return '#10b981';
  if (score >= 750) return '#3b82f6';
  if (score >= 600) return '#eab308';
  if (score >= 400) return '#1a7a6d';
  return '#ef4444';
}

function getBadgeBg(score: number): string {
  if (score >= 900) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  if (score >= 750) return 'bg-blue-500/20 text-blue-400 border-[#5b8fd9]4d';
  if (score >= 600) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  if (score >= 400) return 'bg-teal-600/20 text-teal-400 border-teal-600/30';
  return 'bg-red-500/20 text-red-400 border-red-500/30';
}

export function ScoreGauge({ score, levelTitle, level, previousScore }: ScoreGaugeProps) {
  const percentage = (score / 1000) * 100;
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const strokeColor = getStrokeColor(score);

  const change = previousScore !== null ? score - previousScore : 0;

  return (
    <div className="flex flex-col items-center py-6">
      {/* Circular Gauge */}
      <div className="relative w-52 h-52 mb-5">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          {/* Background ring */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            stroke="currentColor"
            strokeWidth="10"
            fill="none"
            className="text-secondary"
          />
          {/* Progress ring */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            stroke={strokeColor}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
              transition: 'stroke-dashoffset 1.2s ease-out',
            }}
          />
        </svg>

        {/* Score center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-5xl font-bold tabular-nums', getScoreColor(score))}>
            {score}
          </span>
          <span className="text-sm text-muted-foreground mt-1">/ 1,000</span>
        </div>
      </div>

      {/* Level badge */}
      <div className={cn(
        'px-4 py-1.5 rounded-full border font-medium text-sm flex items-center gap-2',
        getBadgeBg(score)
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
