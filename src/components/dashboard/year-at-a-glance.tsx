'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonthData {
  month: string;
  label: string;
  income: number;
  expenses: number;
  surplus: number;
  runningTotal: number;
  isCurrent: boolean;
}

interface YearAtAGlanceProps {
  monthlySummary: MonthData[];
  ytdSurplus: number;
}

export function YearAtAGlance({ monthlySummary, ytdSurplus }: YearAtAGlanceProps) {
  if (!monthlySummary || monthlySummary.length === 0) return null;

  // Find the max absolute surplus for scaling bars
  const maxAbsSurplus = Math.max(
    ...monthlySummary.map(m => Math.abs(m.surplus)),
    1 // avoid division by zero
  );

  return (
    <div className="glass-card rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-base">Year at a Glance</h3>
          <p className="text-xs text-muted-foreground">Monthly surplus / deficit</p>
        </div>
        <div className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold',
          ytdSurplus > 0
            ? 'bg-[#6db555]/15 text-[#7aba5c] border border-[#6db555]/30'
            : ytdSurplus < 0
            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
            : 'bg-secondary/50 text-muted-foreground border border-border/50'
        )}>
          {ytdSurplus > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : ytdSurplus < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
          <span>
            {ytdSurplus >= 0 ? '+' : ''}${ytdSurplus.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} YTD
          </span>
        </div>
      </div>

      {/* Monthly bars */}
      <div className="space-y-2">
        {monthlySummary.map((m) => {
          const barPercent = maxAbsSurplus > 0 ? (Math.abs(m.surplus) / maxAbsSurplus) * 100 : 0;
          const isSurplus = m.surplus >= 0;

          return (
            <div
              key={m.month}
              className={cn(
                'flex items-center gap-3 py-1.5 px-2 rounded-lg transition-colors',
                m.isCurrent && 'bg-secondary/30 border border-border/30'
              )}
            >
              {/* Month label */}
              <span className={cn(
                'text-xs font-medium w-8 shrink-0',
                m.isCurrent ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {m.label}
              </span>

              {/* Bar area — centered diverging bar */}
              <div className="flex-1 flex items-center h-5">
                {/* Deficit side (left half) */}
                <div className="w-1/2 flex justify-end">
                  {!isSurplus && (
                    <div
                      className="h-4 rounded-l-sm bg-red-500/70"
                      style={{ width: `${barPercent}%`, minWidth: m.surplus !== 0 ? '2px' : '0' }}
                    />
                  )}
                </div>
                {/* Center line */}
                <div className="w-px h-5 bg-border/50 shrink-0" />
                {/* Surplus side (right half) */}
                <div className="w-1/2 flex justify-start">
                  {isSurplus && (
                    <div
                      className="h-4 rounded-r-sm bg-[#6db555]/70"
                      style={{ width: `${barPercent}%`, minWidth: m.surplus !== 0 ? '2px' : '0' }}
                    />
                  )}
                </div>
              </div>

              {/* Amount */}
              <span className={cn(
                'text-xs font-medium tabular-nums w-16 text-right shrink-0',
                isSurplus ? 'text-[#7aba5c]' : 'text-red-400'
              )}>
                {isSurplus ? '+' : ''}${m.surplus.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>

              {/* Running total */}
              <span className={cn(
                'text-[10px] tabular-nums w-16 text-right shrink-0',
                m.runningTotal >= 0 ? 'text-muted-foreground' : 'text-red-400/70'
              )}>
                {m.runningTotal >= 0 ? '' : ''}${m.runningTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-border/30">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#6db555]/70" />
          Surplus
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <div className="w-2.5 h-2.5 rounded-sm bg-red-500/70" />
          Deficit
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <div className="w-8 h-px bg-border/50" />
          Running total
        </div>
      </div>
    </div>
  );
}
