'use client';

import { motion, MotionProps } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PressableProps extends Omit<MotionProps, 'children'> {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Pressable({
  children,
  className,
  onClick,
  ...motionProps
}: PressableProps) {
  return (
    <motion.div
      className={cn(className)}
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: 1.01 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
      }}
      onClick={onClick}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}
