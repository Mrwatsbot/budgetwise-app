'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type TimeRange = '7d' | '30d' | '90d';
type ViewMode = 'combined' | 'split';

interface PlatformData {
  name: string;
  color: string;
  values: number[];
}

const PLATFORM_COLORS = {
  Patreon: '#ff424d',
  YouTube: '#ff0000',
  Twitch: '#9146ff',
  Kick: '#53fc18',
  TikTok: '#ff0050',
  Sponsorships: '#ffd43b',
  Merch: '#f59f00',
} as const;

// Generate 90 days of realistic creator income data
const generateMockData = (): Record<string, number[]> => {
  const data: Record<string, number[]> = {};
  const days = 90;
  
  // Patreon: steady, slightly growing
  data.Patreon = Array.from({ length: days }, (_, i) => 
    2800 + Math.sin(i / 10) * 200 + Math.random() * 400
  );
  
  // YouTube: more volatile, ad revenue spikes
  data.YouTube = Array.from({ length: days }, (_, i) => 
    3500 + Math.sin(i / 7) * 800 + Math.random() * 1200
  );
  
  // Twitch: weekend spikes (streaming schedule)
  data.Twitch = Array.from({ length: days }, (_, i) => {
    const isWeekend = i % 7 >= 5;
    return 2200 + (isWeekend ? 600 : 0) + Math.random() * 500;
  });
  
  // TikTok: sporadic, viral spikes
  data.TikTok = Array.from({ length: days }, (_, i) => {
    const viralDay = [15, 42, 68].includes(i);
    return 1500 + (viralDay ? 2000 : 0) + Math.random() * 600;
  });
  
  return data;
};

const mockData = generateMockData();

export function RevenueChart() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [viewMode, setViewMode] = useState<ViewMode>('combined');

  const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
  const days = daysMap[timeRange];

  // Slice data based on time range (most recent days)
  const platformData: PlatformData[] = Object.entries(mockData).map(([name, values]) => ({
    name,
    color: PLATFORM_COLORS[name as keyof typeof PLATFORM_COLORS],
    values: values.slice(-days),
  }));

  // Calculate totals
  const dailyTotals = Array.from({ length: days }, (_, i) => 
    platformData.reduce((sum, p) => sum + p.values[i], 0)
  );
  
  const totalRevenue = dailyTotals.reduce((sum, val) => sum + val, 0);
  const avgDaily = totalRevenue / days;
  
  // Calculate trend (compare first half vs second half)
  const midpoint = Math.floor(days / 2);
  const firstHalf = dailyTotals.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint;
  const secondHalf = dailyTotals.slice(midpoint).reduce((a, b) => a + b, 0) / (days - midpoint);
  const trendPercent = ((secondHalf - firstHalf) / firstHalf) * 100;

  // Calculate platform breakdown percentages
  const platformTotals = platformData.map(p => ({
    name: p.name,
    color: p.color,
    total: p.values.reduce((sum, val) => sum + val, 0),
  })).sort((a, b) => b.total - a.total);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);

  return (
    <div className="glass-card p-4 sm:p-6 space-y-6">
      {/* Header with time range toggle */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
              {formatCurrency(totalRevenue)}
            </h2>
            <span className={cn(
              "text-sm font-medium",
              trendPercent >= 0 ? "text-emerald-400" : "text-red-400"
            )}>
              {trendPercent >= 0 ? "↗" : "↘"} {Math.abs(trendPercent).toFixed(1)}%
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {formatCurrency(avgDaily)}/day average
          </p>
        </div>

        <div className="flex gap-1 bg-[#0F1828]/60 rounded-lg p-1">
          {(['7d', '30d', '90d'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                timeRange === range
                  ? "bg-[#3D6B52] text-white"
                  : "text-gray-400 hover:text-white"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <AnimatePresence mode="wait">
        {viewMode === 'combined' ? (
          <motion.div
            key="combined"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <StackedAreaChart data={platformData} height={240} />
          </motion.div>
        ) : (
          <motion.div
            key="split"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {platformData.map((platform) => (
              <div
                key={platform.name}
                className="bg-[#0F1828]/40 rounded-lg p-3 border border-white/5"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{platform.name}</span>
                  <span className="text-sm text-gray-400">
                    {formatCurrency(platform.values.reduce((a, b) => a + b, 0))}
                  </span>
                </div>
                <Sparkline data={platform.values} color={platform.color} height={40} />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Platform Breakdown */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Platform Breakdown
        </h3>
        <div className="space-y-2">
          {platformTotals.map((platform) => {
            const percentage = (platform.total / totalRevenue) * 100;
            return (
              <div key={platform.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: platform.color }}
                    />
                    <span className="text-gray-300">{platform.name}</span>
                  </div>
                  <span className="text-white font-medium">
                    {formatCurrency(platform.total)} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 bg-[#0F1828]/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: platform.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-center pt-2">
        <div className="flex gap-1 bg-[#0F1828]/60 rounded-lg p-1">
          {(['combined', 'split'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize",
                viewMode === mode
                  ? "bg-[#3D6B52] text-white"
                  : "text-gray-400 hover:text-white"
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Stacked Area Chart Component
function StackedAreaChart({ data, height }: { data: PlatformData[]; height: number }) {
  const width = 100; // percentage
  const points = data[0].values.length;
  const padding = { top: 10, bottom: 10 };

  // Calculate stacked values
  const stackedData = data.map((platform, platformIndex) => {
    return platform.values.map((value, i) => {
      const baseValue = data.slice(0, platformIndex).reduce((sum, p) => sum + p.values[i], 0);
      return baseValue + value;
    });
  });

  // Find max for scaling
  const maxValue = Math.max(...stackedData[stackedData.length - 1]);

  // Generate SVG paths
  const paths = data.map((platform, platformIndex) => {
    const stackValues = stackedData[platformIndex];
    const baseValues = platformIndex > 0 ? stackedData[platformIndex - 1] : new Array(points).fill(0);

    const topPath = stackValues.map((val, i) => {
      const x = (i / (points - 1)) * 100;
      const y = padding.top + ((1 - val / maxValue) * (100 - padding.top - padding.bottom));
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    const bottomPath = baseValues.slice().reverse().map((val, i) => {
      const index = points - 1 - i;
      const x = (index / (points - 1)) * 100;
      const y = padding.top + ((1 - val / maxValue) * (100 - padding.top - padding.bottom));
      return `L ${x} ${y}`;
    }).join(' ');

    return {
      d: `${topPath} ${bottomPath} Z`,
      color: platform.color,
      name: platform.name,
    };
  });

  return (
    <div className="relative" style={{ height: `${height}px` }}>
      <svg
        viewBox={`0 0 ${width} 100`}
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        {paths.map((path, i) => (
          <path
            key={i}
            d={path.d}
            fill={path.color}
            fillOpacity="0.6"
            stroke={path.color}
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  );
}

// Sparkline Component
function Sparkline({ data, color, height }: { data: number[]; color: string; height: number }) {
  const points = data.length;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const path = data.map((val, i) => {
    const x = (i / (points - 1)) * 100;
    const y = ((max - val) / range) * 100;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height: `${height}px` }}>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
