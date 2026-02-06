'use client';

import { useMemo } from 'react';
import { getScoreRating, getScoreColor, type ScoreRating } from '@/types/credit';

interface ScoreGaugeProps {
  score: number | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
}

const RATING_LABELS: Record<ScoreRating, string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  very_poor: 'Very Poor',
};

export function ScoreGauge({ score, size = 'md', showLabel = true, animated = true }: ScoreGaugeProps) {
  const dimensions = {
    sm: { width: 120, height: 80, strokeWidth: 8, fontSize: 24, labelSize: 10 },
    md: { width: 200, height: 120, strokeWidth: 12, fontSize: 42, labelSize: 14 },
    lg: { width: 280, height: 160, strokeWidth: 16, fontSize: 56, labelSize: 18 },
  };

  const { width, height, strokeWidth, fontSize, labelSize } = dimensions[size];
  const radius = (width - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  
  const scorePercent = score ? ((score - 300) / 550) * 100 : 0; // 300-850 range
  const strokeDashoffset = circumference - (scorePercent / 100) * circumference;
  
  const color = score ? getScoreColor(score) : '#6b7280';
  const rating = score ? getScoreRating(score) : null;

  return (
    <div className="flex flex-col items-center">
      <svg 
        width={width} 
        height={height} 
        viewBox={`0 0 ${width} ${height + 10}`}
        className="overflow-visible"
      >
        {/* Background arc */}
        <path
          d={`M ${strokeWidth / 2} ${height} A ${radius} ${radius} 0 0 1 ${width - strokeWidth / 2} ${height}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
          strokeLinecap="round"
        />
        
        {/* Score arc */}
        {score && (
          <path
            d={`M ${strokeWidth / 2} ${height} A ${radius} ${radius} 0 0 1 ${width - strokeWidth / 2} ${height}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={animated ? 'transition-all duration-1000 ease-out' : ''}
            style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
          />
        )}
        
        {/* Score text */}
        <text
          x={width / 2}
          y={height - 10}
          textAnchor="middle"
          fill="currentColor"
          fontSize={fontSize}
          fontWeight="bold"
          className="text-foreground"
        >
          {score ?? '---'}
        </text>
        
        {/* Range labels */}
        <text x={strokeWidth} y={height + 18} fontSize={10} fill="currentColor" className="text-muted-foreground">
          300
        </text>
        <text x={width - strokeWidth - 15} y={height + 18} fontSize={10} fill="currentColor" className="text-muted-foreground">
          850
        </text>
      </svg>
      
      {showLabel && rating && (
        <div 
          className="mt-2 px-3 py-1 rounded-full text-sm font-medium"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {RATING_LABELS[rating]}
        </div>
      )}
    </div>
  );
}

// Mini version for cards
export function ScoreMini({ score, bureau }: { score: number | null; bureau: string }) {
  const color = score ? getScoreColor(score) : '#6b7280';
  
  return (
    <div className="flex flex-col items-center p-3 rounded-lg bg-muted/30">
      <span className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
        {bureau}
      </span>
      <span 
        className="text-2xl font-bold"
        style={{ color: score ? color : undefined }}
      >
        {score ?? '---'}
      </span>
    </div>
  );
}
