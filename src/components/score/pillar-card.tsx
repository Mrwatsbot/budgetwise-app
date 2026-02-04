'use client';

import { type LucideIcon, Info } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { getScoreBarStyle } from '@/lib/bar-colors';

interface SubComponent {
  name: string;
  score: number;
  max: number;
  detail: string;
  tip?: string; // Optional tip if scoring low
}

interface PillarCardProps {
  name: string;
  icon: LucideIcon;
  score: number;
  max: number;
  color: string; // e.g. 'blue', 'emerald', 'amber'
  subComponents: SubComponent[];
  upsideText?: string; // e.g. "+40 pts available if you hit budget this week"
}

const PILLAR_DESCRIPTIONS: Record<string, string> = {
  'Trajectory': 'How fast you\'re building wealth and reducing debt. Tracks your savings rate and debt payoff velocity.',
  'Behavior': 'How consistently you manage money day-to-day. Measures payment punctuality and budget adherence.',
  'Position': 'Your current financial standing. Evaluates your emergency buffer and debt-to-income ratio.',
};

function MainProgressBar({ value, max }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-3 rounded-full bg-border/10 overflow-hidden progress-bar-container">
      {pct > 0 && (
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, ...getScoreBarStyle(pct / 100) }}
        />
      )}
    </div>
  );
}

function MiniProgress({ value, max }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 rounded-full bg-border/10 overflow-hidden progress-bar-container">
      {pct > 0 && (
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, ...getScoreBarStyle(pct / 100) }}
        />
      )}
    </div>
  );
}

export function PillarCard({ name, icon: Icon, score, max, color, subComponents, upsideText }: PillarCardProps) {
  const colorTextMap: Record<string, string> = {
    blue: 'text-blue-400',
    emerald: 'text-emerald-400',
    amber: 'text-teal-400',
  };
  const colorBgMap: Record<string, string> = {
    blue: 'bg-blue-500/15 border-blue-500/25',
    emerald: 'bg-emerald-500/15 border-emerald-500/25',
    amber: 'bg-teal-500/15 border-teal-500/25',
  };

  const description = PILLAR_DESCRIPTIONS[name];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-9 h-9 rounded-lg border flex items-center justify-center',
            colorBgMap[color] || 'bg-[#1a7a6d]/15 border-purple-500/25'
          )}>
            <Icon className={cn('w-4.5 h-4.5', colorTextMap[color] || 'text-[#1a7a6d]')} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold">{name}</p>
              {description && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button 
                      className="inline-flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
                      aria-label={`Information about ${name}`}
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="max-w-[280px] text-xs leading-relaxed p-3">
                    <p>{description}</p>
                  </PopoverContent>
                </Popover>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{score} / {max}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main pillar progress bar — visually distinct */}
          <MainProgressBar value={score} max={max} color={color} />

          {/* Reachable upside — turns dashboard into action list */}
          {upsideText && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] font-semibold text-emerald-400">▲</span>
              <p className="text-[10px] text-emerald-400/80 font-medium leading-snug">
                {upsideText}
              </p>
            </div>
          )}

          {/* Divider + sub-components — indented to feel nested */}
          <div className="border-t border-border/30 pt-3 ml-1 space-y-3">
            <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">Breakdown</p>
            {subComponents.map((sub) => {
              const percentage = sub.max > 0 ? (sub.score / sub.max) * 100 : 0;
              const isLowScore = percentage < 70;
              
              return (
                <div key={sub.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">{sub.name}</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button 
                            className="inline-flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
                            aria-label={`Information about ${sub.name}`}
                          >
                            <Info className="w-3 h-3" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="max-w-[280px] text-xs leading-relaxed p-3">
                          <p className="font-medium mb-1">{sub.name}</p>
                          <p className="text-muted-foreground">{sub.detail}</p>
                          {isLowScore && sub.tip && (
                            <p className="mt-2 text-amber-400 text-[11px]">
                              💡 {sub.tip}
                            </p>
                          )}
                        </PopoverContent>
                      </Popover>
                    </div>
                    <span className="font-medium tabular-nums">{sub.score}/{sub.max}</span>
                  </div>
                  <MiniProgress value={sub.score} max={sub.max} color={color} />
                  {/* Show detail string below progress bar */}
                  <p className="text-[10px] text-muted-foreground/70 leading-snug">{sub.detail}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
  );
}
