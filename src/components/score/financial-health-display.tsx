'use client';

import { useState } from 'react';
import { getScoreBarStyle } from '@/lib/bar-colors';
import { 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  PiggyBank, 
  Target,
  Wallet,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Trophy,
  Sprout,
  Footprints,
  Hammer,
  Dumbbell,
  Rocket,
  Crown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FinancialHealthScore, ScoreBreakdown } from '@/lib/scoring/financial-health-score';

interface FinancialHealthDisplayProps {
  score: FinancialHealthScore;
  previousScore?: number;
  animated?: boolean;
}

const levelColors = {
  0: 'from-gray-500 to-gray-600',
  1: 'from-red-500 to-red-600', 
  2: 'from-yellow-500 to-yellow-600',
  3: 'from-blue-500 to-blue-600',
  4: 'from-[#1a7a6d] to-[#146b5f]',
  5: 'from-[#6db555] to-emerald-500',
};

const levelIcons: Record<number, LucideIcon> = {
  0: Sprout,
  1: Footprints,
  2: Hammer,
  3: Dumbbell,
  4: Rocket,
  5: Crown,
};

const factorIcons: Record<keyof ScoreBreakdown, typeof Target> = {
  wealthBuilding: PiggyBank,
  debtVelocity: TrendingUp,
  paymentConsistency: Target,
  budgetDiscipline: Wallet,
  emergencyBuffer: Shield,
  debtToIncome: CreditCard,
};

const factorNames: Record<keyof ScoreBreakdown, string> = {
  wealthBuilding: 'Wealth Building',
  debtVelocity: 'Debt Progress',
  paymentConsistency: 'Payment History',
  budgetDiscipline: 'Budget Discipline',
  emergencyBuffer: 'Emergency Fund',
  debtToIncome: 'Debt-to-Income',
};

const pillarColors = {
  Trajectory: 'text-blue-400',
  Behavior: 'text-[#7aba5c]',
  Position: 'text-yellow-400',
};

export function FinancialHealthDisplay({ score, previousScore, animated = true }: FinancialHealthDisplayProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  
  const change = previousScore !== undefined ? score.total - previousScore : 0;
  const changeColor = change > 0 ? 'text-[#7aba5c]' : change < 0 ? 'text-red-400' : 'text-muted-foreground';
  
  // Calculate percentage for the ring
  const percentage = (score.total / 1000) * 100;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* Main Score Card */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col items-center">
          {/* Score Ring */}
          <div className="relative w-48 h-48 mb-4">
            {/* Background ring */}
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-secondary"
              />
              {/* Progress ring */}
              <circle
                cx="96"
                cy="96"
                r="45"
                stroke="url(#scoreGradient)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: animated ? strokeDashoffset : circumference,
                  transition: animated ? 'stroke-dashoffset 1.5s ease-out' : 'none',
                }}
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1a7a6d" />
                  <stop offset="100%" stopColor="#2aaa9a" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Score in center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold">{score.total}</span>
              <span className="text-sm text-muted-foreground">/ 1000</span>
              {change !== 0 && (
                <span className={cn('text-sm font-medium flex items-center gap-1', changeColor)}>
                  {change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {change > 0 ? '+' : ''}{change}
                </span>
              )}
            </div>
          </div>

          {/* Level Badge */}
          <div className={cn(
            'px-4 py-2 rounded-full bg-gradient-to-r text-white font-medium flex items-center gap-2',
            levelColors[score.level as keyof typeof levelColors]
          )}>
            {(() => { const LevelIcon = levelIcons[score.level as keyof typeof levelIcons]; return LevelIcon ? <LevelIcon className="w-5 h-5" /> : null; })()}
            <span>{score.title}</span>
          </div>
          
          <p className="text-sm text-muted-foreground mt-2">
            Level {score.level} of 5
          </p>
        </div>
      </div>

      {/* Toggle Breakdown */}
      <button
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="w-full glass-card rounded-xl p-4 flex items-center justify-between hover:border-[#1a7a6d4d] transition-colors"
      >
        <span className="font-medium">Score Breakdown</span>
        {showBreakdown ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {/* Breakdown Details */}
      {showBreakdown && (
        <div className="space-y-3">
          {Object.entries(score.breakdown).map(([key, factor]) => {
            const Icon = factorIcons[key as keyof typeof factorIcons];
            const name = factorNames[key as keyof typeof factorNames];
            const pct = (factor.score / factor.maxScore) * 100;
            
            return (
              <div key={key} className="glass-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#1a7a6d33] flex items-center justify-center">
                      <Icon className="w-4 h-4 text-[#1a7a6d]" />
                    </div>
                    <span className="font-medium">{name}</span>
                  </div>
                  <span className="text-sm">
                    <span className="font-bold">{factor.score}</span>
                    <span className="text-muted-foreground">/{factor.maxScore}</span>
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="h-2 rounded-full bg-border/10 overflow-hidden mb-2">
                  {pct > 0 && (
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, ...getScoreBarStyle(pct / 100) }}
                    />
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{factor.detail}</p>
                  <span className={`text-xs font-medium ${pillarColors[factor.sublabel as keyof typeof pillarColors] || 'text-muted-foreground'}`}>
                    {factor.sublabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tips */}
      {score.tips.length > 0 && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
            <span className="font-medium">Tips to Improve</span>
          </div>
          <ul className="space-y-2">
            {score.tips.map((tip, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-[#1a7a6d]">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* How This Differs from FICO */}
      <div className="glass-card rounded-xl p-4 border-[#1a7a6d33]">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-[#1a7a6d]" />
          <span className="font-medium">Not Like Credit Scores</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Unlike FICO, this score rewards <span className="text-[#7aba5c]">paying off debt</span>, 
          not having more credit. It measures <span className="text-[#1a7a6d]">your</span> financial 
          health, not how profitable you are to lenders.
        </p>
      </div>
    </div>
  );
}
