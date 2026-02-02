'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock, FileText, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

type MetricType = 'hourly' | 'video' | 'epm';

interface PlatformROI {
  platform: string;
  color: string;
  hourlyRate: number;
  hoursTracked: number;
  piecesCreated: number;
  trend: number;
}

const mockData: PlatformROI[] = [
  {
    platform: 'Sponsorships',
    color: '#fbbf24',
    hourlyRate: 380,
    hoursTracked: 2,
    piecesCreated: 1,
    trend: 12.5,
  },
  {
    platform: 'Twitch',
    color: '#a855f7',
    hourlyRate: 68,
    hoursTracked: 24.5,
    piecesCreated: 15,
    trend: 8.2,
  },
  {
    platform: 'YouTube',
    color: '#ef4444',
    hourlyRate: 52,
    hoursTracked: 18,
    piecesCreated: 4,
    trend: -3.1,
  },
  {
    platform: 'TikTok',
    color: '#06b6d4',
    hourlyRate: 8.5,
    hoursTracked: 12,
    piecesCreated: 23,
    trend: 15.3,
  },
];

export function ContentROI() {
  const [metric, setMetric] = useState<MetricType>('hourly');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const calculateAverage = () => {
    const totalRevenue = mockData.reduce(
      (sum, platform) => sum + platform.hourlyRate * platform.hoursTracked,
      0
    );
    const totalHours = mockData.reduce((sum, platform) => sum + platform.hoursTracked, 0);
    return totalRevenue / totalHours;
  };

  const calculateVideoRate = (platform: PlatformROI) => {
    return (platform.hourlyRate * platform.hoursTracked) / platform.piecesCreated;
  };

  const calculateEPM = (platform: PlatformROI) => {
    // EPM = Earnings per thousand views (mock: assume 1k views per piece)
    return ((platform.hourlyRate * platform.hoursTracked) / platform.piecesCreated / 1000) * 1000;
  };

  const getDisplayValue = (platform: PlatformROI) => {
    switch (metric) {
      case 'hourly':
        return formatCurrency(platform.hourlyRate);
      case 'video':
        return formatCurrency(calculateVideoRate(platform));
      case 'epm':
        return formatCurrency(calculateEPM(platform));
    }
  };

  const getMaxValue = () => {
    return Math.max(
      ...mockData.map((p) => {
        switch (metric) {
          case 'hourly':
            return p.hourlyRate;
          case 'video':
            return calculateVideoRate(p);
          case 'epm':
            return calculateEPM(p);
        }
      })
    );
  };

  const sortedData = [...mockData].sort((a, b) => {
    const aVal =
      metric === 'hourly'
        ? a.hourlyRate
        : metric === 'video'
        ? calculateVideoRate(a)
        : calculateEPM(a);
    const bVal =
      metric === 'hourly'
        ? b.hourlyRate
        : metric === 'video'
        ? calculateVideoRate(b)
        : calculateEPM(b);
    return bVal - aVal;
  });

  const maxValue = getMaxValue();

  return (
    <div className="glass-card p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">Content ROI</h2>
          <p className="text-sm text-white/60">Revenue efficiency by platform</p>
        </div>

        {/* Metric Toggle */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-lg w-fit">
          <button
            onClick={() => setMetric('hourly')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-all',
              metric === 'hourly'
                ? 'bg-[#1a7a6d] text-white shadow-lg'
                : 'text-white/60 hover:text-white/80'
            )}
          >
            $/hr
          </button>
          <button
            onClick={() => setMetric('video')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-all',
              metric === 'video'
                ? 'bg-[#1a7a6d] text-white shadow-lg'
                : 'text-white/60 hover:text-white/80'
            )}
          >
            $/video
          </button>
          <button
            onClick={() => setMetric('epm')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-all',
              metric === 'epm'
                ? 'bg-[#1a7a6d] text-white shadow-lg'
                : 'text-white/60 hover:text-white/80'
            )}
          >
            EPM
          </button>
        </div>

        {/* Hero Number */}
        <motion.div
          key={metric}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-6 bg-white/5 rounded-lg border border-white/10"
        >
          <div className="text-4xl font-bold text-white mb-1">
            {formatCurrency(calculateAverage())}
            <span className="text-lg text-white/60">/hour</span>
          </div>
          <p className="text-sm text-white/60">Last 30 days</p>
        </motion.div>

        {/* Platform List */}
        <div className="space-y-3">
          {sortedData.map((platform, index) => {
            const isTopEarner = index === 0;
            const percentage = (
              ((metric === 'hourly'
                ? platform.hourlyRate
                : metric === 'video'
                ? calculateVideoRate(platform)
                : calculateEPM(platform)) /
                maxValue) *
              100
            );

            return (
              <motion.div
                key={platform.platform}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  'p-4 rounded-lg border transition-all',
                  isTopEarner
                    ? 'bg-gradient-to-r from-amber-500/10 to-transparent border-amber-500/30'
                    : 'bg-white/5 border-white/10'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: platform.color }}
                    />
                    <span className="font-medium text-white">{platform.platform}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-white">
                      {getDisplayValue(platform)}
                    </span>
                    {platform.trend > 0 ? (
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3 h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: platform.color }}
                  />
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-white/60">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{platform.hoursTracked}h tracked</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    <span>{platform.piecesCreated} pieces</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Track New Content Button */}
        <button className="w-full py-3 px-4 bg-[#1a7a6d] hover:bg-[#1a7a6d]/80 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 group">
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
          Track New Content
        </button>
      </div>
    </div>
  );
}
