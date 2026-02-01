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

export function ScoreWidget({ score, levelTitle, level, previousScore, recentAchievements }: ScoreWidgetProps) {
  const percentage = (score / 1000) * 100;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const strokeColor = getStrokeColor(score);
  const change = previousScore !== null ? score - previousScore : 0;

  return (
    <a href="/score" className="glass-card rounded-xl p-4 sm:p-5 block hover:border-[#1a7a6d4d] transition-all group">
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
            <circle
              cx="50" cy="50" r={radius}
              stroke="#2e2926" strokeWidth="6" fill="none"
            />
            <circle
              cx="50" cy="50" r={radius}
              stroke={strokeColor} strokeWidth="6" fill="none"
              strokeLinecap="round"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset,
                transition: 'stroke-dashoffset 1.2s ease-out',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-2xl font-bold tabular-nums', getScoreColor(score))}>
              <AnimatedNumber value={score} format="integer" />
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className={cn(
            'inline-flex px-2.5 py-1 rounded-full border text-xs font-medium mb-2',
            getBadgeBg(score)
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
