'use client';

import { cn } from '@/lib/utils';
import type { Bureau } from '@/types/credit';

interface BureauBadgeProps {
  bureau: Bureau;
  active?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const BUREAU_COLORS: Record<Bureau, { bg: string; text: string; activeBg: string }> = {
  equifax: { bg: 'bg-red-500/10', text: 'text-red-500', activeBg: 'bg-red-500' },
  experian: { bg: 'bg-blue-500/10', text: 'text-blue-500', activeBg: 'bg-blue-500' },
  transunion: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', activeBg: 'bg-emerald-500' },
};

const BUREAU_ABBREV: Record<Bureau, string> = {
  equifax: 'EQ',
  experian: 'EX',
  transunion: 'TU',
};

const BUREAU_NAMES: Record<Bureau, string> = {
  equifax: 'Equifax',
  experian: 'Experian',
  transunion: 'TransUnion',
};

export function BureauBadge({ bureau, active = false, size = 'md', className }: BureauBadgeProps) {
  const colors = BUREAU_COLORS[bureau];
  
  return (
    <span 
      className={cn(
        'inline-flex items-center justify-center font-semibold rounded-md',
        active ? `${colors.activeBg} text-white` : `${colors.bg} ${colors.text}`,
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1',
        className
      )}
      title={BUREAU_NAMES[bureau]}
    >
      {BUREAU_ABBREV[bureau]}
    </span>
  );
}

export function BureauBadges({ 
  equifax, 
  experian, 
  transunion,
  size = 'sm'
}: { 
  equifax?: boolean; 
  experian?: boolean; 
  transunion?: boolean;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="flex gap-1">
      {equifax !== undefined && (
        <BureauBadge bureau="equifax" active={equifax} size={size} />
      )}
      {experian !== undefined && (
        <BureauBadge bureau="experian" active={experian} size={size} />
      )}
      {transunion !== undefined && (
        <BureauBadge bureau="transunion" active={transunion} size={size} />
      )}
    </div>
  );
}

export function AllBureauBadges({ 
  onEquifax, 
  onExperian, 
  onTransunion 
}: { 
  onEquifax: boolean; 
  onExperian: boolean; 
  onTransunion: boolean;
}) {
  const count = [onEquifax, onExperian, onTransunion].filter(Boolean).length;
  
  return (
    <div className="flex items-center gap-2">
      <BureauBadges 
        equifax={onEquifax} 
        experian={onExperian} 
        transunion={onTransunion} 
      />
      <span className="text-xs text-muted-foreground">
        {count}/3 bureaus
      </span>
    </div>
  );
}
