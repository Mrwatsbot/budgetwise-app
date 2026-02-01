'use client';

import { CheckCircle2, AlertTriangle, Minus } from 'lucide-react';
import { getAmortizationHealth, generateSchedule } from '@/lib/amortization';
import { cn } from '@/lib/utils';
import type { Debt } from '@/types/database';

interface AmortizationHealthProps {
  debt: Debt;
}

export function AmortizationHealth({ debt }: AmortizationHealthProps) {
  // Only show for debts with complete amortization data
  if (
    !debt.origination_date ||
    !debt.term_months ||
    !debt.original_balance ||
    debt.original_balance <= 0 ||
    debt.is_paid_off
  ) {
    return null;
  }

  const health = getAmortizationHealth({
    original_balance: debt.original_balance,
    current_balance: debt.current_balance,
    apr: debt.apr,
    term_months: debt.term_months,
    origination_date: debt.origination_date,
  });

  if (!health) return null;

  // Generate mini sparkline data (just enough points for a smooth curve)
  const schedule = generateSchedule(debt.original_balance, debt.apr, debt.term_months);
  const sparklinePoints = 30; // 30 points for the curve
  const step = Math.max(1, Math.floor(schedule.length / sparklinePoints));
  const points = schedule.filter((_, i) => i % step === 0 || i === schedule.length - 1);

  // SVG dimensions
  const width = 100;
  const height = 20;
  const maxBalance = debt.original_balance;

  // Create path for the amortization curve
  const pathData = points
    .map((point, i) => {
      const x = (point.month / debt.term_months!) * width;
      const y = height - (point.balance / maxBalance) * height;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  // Current position on the curve
  const currentX = (health.monthsElapsed / debt.term_months) * width;
  const currentY = height - (health.actualBalance / maxBalance) * height;
  const expectedY = height - (health.expectedBalance / maxBalance) * height;

  // Status styling
  const statusConfig = {
    ahead: {
      icon: CheckCircle2,
      color: 'text-[#7aba5c]',
      bgColor: 'bg-[#7aba5c]/10',
      borderColor: 'border-[#7aba5c]/30',
    },
    on_track: {
      icon: Minus,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
      borderColor: 'border-yellow-400/30',
    },
    behind: {
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-400/10',
      borderColor: 'border-red-400/30',
    },
  };

  const config = statusConfig[health.status];
  const Icon = config.icon;

  // Format text
  let statusText = '';
  if (health.status === 'ahead') {
    statusText = health.monthsAhead === 1
      ? '1 month ahead of schedule'
      : `${health.monthsAhead} months ahead of schedule`;
  } else if (health.status === 'behind') {
    statusText = Math.abs(health.monthsAhead) === 1
      ? '1 month behind schedule'
      : `${Math.abs(health.monthsAhead)} months behind schedule`;
  } else {
    statusText = 'On track';
  }

  // Format payoff dates
  const expectedPayoff = health.expectedPayoffDate.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
  const projectedPayoff = health.projectedPayoffDate?.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className={cn('mt-3 rounded-lg border p-3 space-y-2', config.bgColor, config.borderColor)}>
      {/* Status indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', config.color)} />
          <span className={cn('text-sm font-medium', config.color)}>{statusText}</span>
        </div>
      </div>

      {/* Mini sparkline */}
      <div className="relative">
        <svg width={width} height={height} className="w-full" style={{ maxWidth: '200px' }}>
          {/* Schedule curve */}
          <path
            d={pathData}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-muted-foreground/40"
          />
          
          {/* Expected position marker (on the curve) */}
          <circle
            cx={currentX}
            cy={expectedY}
            r="2"
            className="text-muted-foreground/60"
            fill="currentColor"
          />
          
          {/* Actual position marker */}
          <circle
            cx={currentX}
            cy={currentY}
            r="3"
            className={config.color}
            fill="currentColor"
          />
          
          {/* Connecting line (if ahead or behind) */}
          {health.status !== 'on_track' && (
            <line
              x1={currentX}
              y1={expectedY}
              x2={currentX}
              y2={currentY}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="2,2"
              className={config.color}
              opacity="0.5"
            />
          )}
        </svg>
      </div>

      {/* Payoff date comparison */}
      <div className="text-xs text-muted-foreground space-y-0.5">
        <div className="flex items-center justify-between">
          <span>Original payoff:</span>
          <span>{expectedPayoff}</span>
        </div>
        {health.status !== 'on_track' && projectedPayoff && projectedPayoff !== expectedPayoff && (
          <div className="flex items-center justify-between">
            <span>Projected payoff:</span>
            <span className={config.color}>{projectedPayoff}</span>
          </div>
        )}
      </div>
    </div>
  );
}
