'use client';

import NumberFlow from '@number-flow/react';
import { cn } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number | undefined | null;
  format?: 'currency' | 'percent' | 'integer';
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function AnimatedNumber({
  value,
  format = 'currency',
  className,
  prefix,
  suffix,
}: AnimatedNumberProps) {
  const safeValue = value ?? 0;

  // Determine prefix, suffix, and formatting
  let displayPrefix = prefix ?? '';
  let displaySuffix = suffix ?? '';
  let locales = 'en-US';
  let formatOptions: { minimumFractionDigits?: number; maximumFractionDigits?: number } = {};

  switch (format) {
    case 'currency':
      formatOptions = {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      };
      displayPrefix = prefix ?? '$';
      break;
    case 'percent':
      formatOptions = {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      };
      displaySuffix = suffix ?? '%';
      break;
    case 'integer':
      formatOptions = {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      };
      break;
  }

  return (
    <span className={cn('tabular-nums inline-flex items-center', className)}>
      {displayPrefix}
      <NumberFlow
        value={safeValue}
        locales={locales}
        format={formatOptions}
      />
      {displaySuffix}
    </span>
  );
}
