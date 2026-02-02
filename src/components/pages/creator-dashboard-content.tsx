'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RevenueSummaryCards } from '@/components/creator/revenue-summary-cards';
import { RevenueChart } from '@/components/creator/revenue-chart';
import { PlatformCards } from '@/components/creator/platform-cards';
import { CreatorHealthScore } from '@/components/creator/creator-health-score';
import { EarningHeatmap } from '@/components/creator/earning-heatmap';
import { ContentROI } from '@/components/creator/content-roi';
import { LevelProgress } from '@/components/creator/level-progress';

export function CreatorDashboardContent() {
  const currentMonth = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Creator Dashboard</h1>
          <p className="text-white/60">{currentMonth}</p>
        </div>
        <Button
          className="bg-[#1a7a6d] hover:bg-[#1a7a6d]/80 text-white gap-2"
          size="default"
        >
          <Plus className="w-4 h-4" />
          Add Transaction
        </Button>
      </div>

      {/* Revenue Summary Cards */}
      <RevenueSummaryCards />

      {/* Revenue Chart */}
      <RevenueChart />

      {/* Platform Cards */}
      <PlatformCards />

      {/* Two Column Grid: Health Score + Content ROI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CreatorHealthScore />
        <ContentROI />
      </div>

      {/* Earning Heatmap */}
      <EarningHeatmap />

      {/* Level Progress */}
      <LevelProgress />
    </div>
  );
}
