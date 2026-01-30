'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedBarProps {
  percentage: number;
  color?: string;
  height?: string;
  delay?: number;
  className?: string;
}

export function AnimatedBar({
  percentage,
  color = 'bg-primary',
  height = 'h-3',
  delay = 0,
  className,
}: AnimatedBarProps) {
  const safePercentage = Math.min(Math.max(percentage, 0), 100);

  return (
    <div className={cn('relative overflow-hidden rounded-full bg-muted', height, className)}>
      <motion.div
        className={cn('h-full rounded-full', color)}
        initial={{ width: '0%' }}
        animate={{ width: `${safePercentage}%` }}
        transition={{
          duration: 0.8,
          delay,
          ease: [0.16, 1, 0.3, 1],
        }}
      />
    </div>
  );
}
