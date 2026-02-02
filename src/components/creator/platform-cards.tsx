'use client';

import { cn } from '@/lib/utils';

interface Platform {
  id: string;
  name: string;
  color: string;
  icon: string;
  syncStatus: 'synced' | 'syncing' | 'error';
  revenue: number;
  revenueChange: number;
  metric: {
    label: string;
    value: string;
  };
  sparklineData: number[]; // Last 5 months
}

const MOCK_PLATFORMS: Platform[] = [
  {
    id: 'patreon',
    name: 'Patreon',
    color: '#ff424d',
    icon: 'P',
    syncStatus: 'synced',
    revenue: 4250,
    revenueChange: 12.3,
    metric: {
      label: 'Patrons',
      value: '347',
    },
    sparklineData: [3200, 3500, 3800, 4100, 4250],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    color: '#ff0000',
    icon: 'Y',
    syncStatus: 'synced',
    revenue: 3890,
    revenueChange: -5.2,
    metric: {
      label: 'Views',
      value: '1.2M',
    },
    sparklineData: [4500, 4200, 3900, 4100, 3890],
  },
  {
    id: 'twitch',
    name: 'Twitch',
    color: '#9146ff',
    icon: 'T',
    syncStatus: 'synced',
    revenue: 2680,
    revenueChange: 8.7,
    metric: {
      label: 'Subs',
      value: '892',
    },
    sparklineData: [2100, 2300, 2450, 2500, 2680],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    color: '#ff0050',
    icon: 'TT',
    syncStatus: 'syncing',
    revenue: 1840,
    revenueChange: 23.5,
    metric: {
      label: 'Followers',
      value: '234K',
    },
    sparklineData: [1200, 1350, 1500, 1600, 1840],
  },
];

export function PlatformCards() {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);

  return (
    <div className="space-y-3">
      {MOCK_PLATFORMS.map((platform) => (
        <PlatformCard key={platform.id} platform={platform} formatCurrency={formatCurrency} />
      ))}
      
      {/* Add Platform Card */}
      <button className="glass-card p-4 w-full border-2 border-dashed border-white/10 hover:border-[#1a7a6d]/50 transition-colors group">
        <div className="flex items-center justify-center gap-2 text-gray-400 group-hover:text-[#1a7a6d]">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <span className="font-medium">Add Platform</span>
        </div>
      </button>
    </div>
  );
}

function PlatformCard({
  platform,
  formatCurrency,
}: {
  platform: Platform;
  formatCurrency: (value: number) => string;
}) {
  const getSyncStatusBadge = (status: Platform['syncStatus']) => {
    switch (status) {
      case 'synced':
        return (
          <div className="flex items-center gap-1 text-xs text-emerald-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Synced</span>
          </div>
        );
      case 'syncing':
        return (
          <div className="flex items-center gap-1 text-xs text-yellow-400">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            <span>Syncing</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1 text-xs text-red-400">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span>Error</span>
          </div>
        );
    }
  };

  return (
    <div
      className="glass-card p-4 relative overflow-hidden"
      style={{
        borderLeft: `4px solid ${platform.color}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: platform.color }}
          >
            {platform.icon}
          </div>
          <div>
            <h3 className="font-semibold text-white">{platform.name}</h3>
            {getSyncStatusBadge(platform.syncStatus)}
          </div>
        </div>
      </div>

      {/* Revenue */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">
            {formatCurrency(platform.revenue)}
          </span>
          <span
            className={cn(
              'text-sm font-medium flex items-center gap-0.5',
              platform.revenueChange >= 0 ? 'text-emerald-400' : 'text-red-400'
            )}
          >
            {platform.revenueChange >= 0 ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {Math.abs(platform.revenueChange)}%
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">This month</p>
      </div>

      {/* Metric */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-gray-400">{platform.metric.label}</p>
          <p className="text-lg font-semibold text-white">{platform.metric.value}</p>
        </div>
      </div>

      {/* Sparkline */}
      <div className="mb-4">
        <MiniSparkline data={platform.sparklineData} color={platform.color} />
      </div>

      {/* View Details Link */}
      <a
        href="#"
        className="text-sm text-[#1a7a6d] hover:text-[#2aaa9a] font-medium inline-flex items-center gap-1 group"
      >
        View Details
        <svg
          className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </a>
    </div>
  );
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const barWidth = 100 / data.length;
  const gap = 0.15; // 15% gap

  return (
    <div className="flex items-end gap-1 h-8">
      {data.map((value, i) => {
        const height = ((value - min) / range) * 100;
        return (
          <div
            key={i}
            className="flex-1 rounded-t relative group/bar"
            style={{
              height: `${Math.max(height, 8)}%`,
              backgroundColor: color,
              opacity: 0.3 + (i / data.length) * 0.7, // Fade in effect
            }}
          >
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
              }).format(value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
