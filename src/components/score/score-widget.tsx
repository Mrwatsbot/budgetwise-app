'use client';

import { TrendingUp, TrendingDown, Minus, ChevronRight, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/ui/animated-number';

interface ScoreWidgetProps {
  score: number;
  levelTitle: string;
  level: number;
  previousScore: number | null;
  recentAchievements?: Array<{
    name: string;
    icon: string;
    unlocked_at: string;
  }>;
}

/** Score tiers — consistent with ScoreGauge */
function getScoreTier(score: number) {
  if (score >= 900) return { text: 'text-emerald-400', stroke: '#34d399', glow: '#34d39960', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
  if (score >= 750) return { text: 'text-blue-400', stroke: '#60a5fa', glow: '#60a5fa50', bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
  if (score >= 600) return { text: 'text-sky-400', stroke: '#38bdf8', glow: '#38bdf840', bg: 'bg-sky-500/15 text-sky-400 border-sky-500/30' };
  if (score >= 400) return { text: 'text-amber-400', stroke: '#fbbf24', glow: '#fbbf2440', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
  if (score >= 200) return { text: 'text-orange-400', stroke: '#fb923c', glow: '#fb923c40', bg: 'bg-orange-500/15 text-orange-400 border-orange-500/30' };
  return { text: 'text-red-400', stroke: '#f87171', glow: '#f8717140', bg: 'bg-red-500/15 text-red-400 border-red-500/30' };
}

export function ScoreWidget({ score, levelTitle, level, previousScore, recentAchievements }: ScoreWidgetProps) {
  const percentage = (score / 1000) * 100;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const tier = getScoreTier(score);
  const change = previousScore !== null ? score - previousScore : 0;

  return (
    <a href="/score" data-tour="score-widget score-cta" className="glass-card rounded-xl p-4 sm:p-5 block hover:border-[#1a7a6d4d] transition-all group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-[#1a7a6d]" />
          <span className="font-medium">Financial Health</span>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>

      <div className="flex items-center gap-5">
        {/* Compact gauge */}
        <div className="relative w-24 h-24 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <defs>
              <filter id="widgetGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <circle
              cx="50" cy="50" r={radius}
              stroke="#1f1d1b" strokeWidth="6" fill="none" opacity="0.8"
            />
            <circle
              cx="50" cy="50" r={radius}
              stroke={tier.stroke} strokeWidth="6" fill="none"
              strokeLinecap="round"
              filter="url(#widgetGlow)"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset,
                transition: 'stroke-dashoffset 1.2s ease-out',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-2xl font-display font-bold tabular-nums', tier.text)}>
              <AnimatedNumber value={score} format="integer" />
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className={cn(
            'inline-flex px-2.5 py-1 rounded-full border text-xs font-medium mb-2',
            tier.bg
          )}>
            Level {level} · {levelTitle}
          </div>

          {previousScore !== null && (
            <div className={cn(
              'flex items-center gap-1 text-sm font-medium',
              change > 0 ? 'text-emerald-400' : change < 0 ? 'text-red-400' : 'text-muted-foreground'
            )}>
              {change > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : change < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
              <span>{change > 0 ? '+' : ''}{change} from last</span>
            </div>
          )}

          {/* Recent achievements */}
          {recentAchievements && recentAchievements.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              {recentAchievements.slice(0, 3).map((ach, i) => (
                <span
                  key={i}
                  className="w-7 h-7 rounded-full bg-[#1a7a6d33] border border-[#1a7a6d4d] flex items-center justify-center text-sm"
                  title={ach.name}
                >
                  {ach.icon}
                </span>
              ))}
              {recentAchievements.length > 3 && (
                <span className="text-xs text-muted-foreground">+{recentAchievements.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </a>
  );
}
