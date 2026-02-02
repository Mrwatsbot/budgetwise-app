'use client';

import { cn } from '@/lib/utils';

interface HealthPillar {
  name: string;
  score: number;
  weight: number;
  icon: string;
  status: 'excellent' | 'good' | 'fair' | 'poor';
}

const MOCK_PILLARS: HealthPillar[] = [
  {
    name: 'Diversification',
    score: 82,
    weight: 30,
    icon: '🎯',
    status: 'excellent',
  },
  {
    name: 'Stability',
    score: 74,
    weight: 25,
    icon: '📊',
    status: 'good',
  },
  {
    name: 'Savings Buffer',
    score: 86,
    weight: 25,
    icon: '🏦',
    status: 'excellent',
  },
  {
    name: 'Tax Readiness',
    score: 67,
    weight: 20,
    icon: '💰',
    status: 'fair',
  },
];

const OVERALL_SCORE = 78;

export function CreatorHealthScore() {
  const getStatusColor = (status: HealthPillar['status']) => {
    switch (status) {
      case 'excellent':
        return 'text-emerald-400';
      case 'good':
        return 'text-[#1a7a6d]';
      case 'fair':
        return 'text-yellow-400';
      case 'poor':
        return 'text-red-400';
    }
  };

  const getStatusLabel = (status: HealthPillar['status']) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'; // emerald-500
    if (score >= 70) return '#1a7a6d'; // accent teal
    if (score >= 60) return '#fbbf24'; // yellow-400
    return '#ef4444'; // red-500
  };

  return (
    <div className="glass-card p-6 space-y-6">
      {/* Header with Circular Gauge */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Circular Score Gauge */}
        <div className="relative flex-shrink-0">
          <CircularGauge score={OVERALL_SCORE} size={140} />
        </div>

        {/* Score Info */}
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-xl font-bold text-white mb-2">Creator Health Score</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            Your overall financial health based on income diversification, stability, savings, and
            tax preparedness.
          </p>
        </div>
      </div>

      {/* Pillars */}
      <div className="space-y-4">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Health Pillars
        </h3>
        <div className="space-y-3">
          {MOCK_PILLARS.map((pillar) => (
            <div key={pillar.name} className="space-y-2">
              {/* Pillar Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{pillar.icon}</span>
                  <span className="text-sm font-medium text-white">{pillar.name}</span>
                  <span className="text-xs text-gray-500">({pillar.weight}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{pillar.score}</span>
                  <span className={cn('text-xs font-medium', getStatusColor(pillar.status))}>
                    {getStatusLabel(pillar.status)}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-2 bg-[#0d1514]/60 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  style={{
                    width: `${pillar.score}%`,
                    backgroundColor: getScoreColor(pillar.score),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="pt-4 border-t border-white/5">
        <div className="bg-[#1a7a6d]/10 border border-[#1a7a6d]/20 rounded-lg p-4">
          <div className="flex gap-3">
            <span className="text-xl flex-shrink-0">💡</span>
            <div className="text-sm text-gray-300">
              <p className="font-medium text-white mb-1">Recommendation</p>
              <p>
                Consider increasing your tax withholding by 5-10% to reach "good" status. Your
                diversification is excellent — keep building on multiple platforms.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CircularGauge({ score, size }: { score: number; size: number }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const center = size / 2;

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'; // emerald-500
    if (score >= 70) return '#1a7a6d'; // accent teal
    if (score >= 60) return '#fbbf24'; // yellow-400
    return '#ef4444'; // red-500
  };

  const color = getScoreColor(score);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#1a2826"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-white">{score}</span>
        <span className="text-xs text-gray-400 uppercase tracking-wider">Score</span>
      </div>
    </div>
  );
}
