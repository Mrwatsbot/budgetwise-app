'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  FileText,
  Plus,
  ChevronRight,
  Target,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useCreditScores, useNegativeItems, useDisputes } from '@/lib/hooks/use-credit';
import { ScoreGauge, BureauBadge, AddScoreDialog } from '@/components/credit';
import { getScoreRating, getScoreColor, ITEM_TYPE_LABELS, STATUS_LABELS } from '@/types/credit';

export function CreditDashboardContent() {
  const [showAddScore, setShowAddScore] = useState(false);
  
  const { latestScore, averageScore, scoreChange, isLoading: scoresLoading, addScore } = useCreditScores();
  const { items, activeItems, deletedItems, estimatedPointsRecoverable, isLoading: itemsLoading } = useNegativeItems();
  const { disputes, stats: disputeStats, isLoading: disputesLoading } = useDisputes();

  const isLoading = scoresLoading || itemsLoading || disputesLoading;

  // Get items that need attention
  const highImpactItems = items
    .filter(i => i.estimated_impact === 'high' && !['deleted', 'paid', 'settled'].includes(i.status))
    .slice(0, 3);

  // Get upcoming deadlines
  const upcomingDeadlines = disputes
    .filter(d => d.status === 'sent' && d.deadline_date)
    .map(d => ({
      ...d,
      daysLeft: Math.ceil((new Date(d.deadline_date!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .filter(d => d.daysLeft >= 0 && d.daysLeft <= 14)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-zinc-800 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-64 bg-zinc-800 rounded-xl" />
            <div className="h-64 bg-zinc-800 rounded-xl" />
            <div className="h-64 bg-zinc-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Credit Dashboard</h1>
          <p className="text-zinc-400 mt-1">Track your credit repair journey</p>
        </div>
        <button
          onClick={() => setShowAddScore(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          Update Scores
        </button>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Score */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Average Score</h2>
            {scoreChange !== null && (
              <div className={`flex items-center gap-1 text-sm ${scoreChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {scoreChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {scoreChange >= 0 ? '+' : ''}{scoreChange} pts (30d)
              </div>
            )}
          </div>
          
          <div className="flex justify-center py-4">
            <ScoreGauge score={averageScore} size="lg" />
          </div>
          
          {latestScore && (
            <div className="flex justify-center gap-4 mt-4 pt-4 border-t border-zinc-800">
              {latestScore.equifax && (
                <div className="text-center">
                  <BureauBadge bureau="equifax" size="sm" />
                  <p className="text-lg font-semibold text-white mt-1">{latestScore.equifax}</p>
                </div>
              )}
              {latestScore.experian && (
                <div className="text-center">
                  <BureauBadge bureau="experian" size="sm" />
                  <p className="text-lg font-semibold text-white mt-1">{latestScore.experian}</p>
                </div>
              )}
              {latestScore.transunion && (
                <div className="text-center">
                  <BureauBadge bureau="transunion" size="sm" />
                  <p className="text-lg font-semibold text-white mt-1">{latestScore.transunion}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Negative Items Summary */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Negative Items</h2>
            <Link href="/credit/negatives" className="text-sm text-emerald-400 hover:text-emerald-300">
              View All
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-3xl font-bold text-amber-400">{activeItems}</p>
              <p className="text-xs text-zinc-500 mt-1">Active</p>
            </div>
            <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-3xl font-bold text-emerald-400">{deletedItems}</p>
              <p className="text-xs text-zinc-500 mt-1">Deleted</p>
            </div>
          </div>

          {estimatedPointsRecoverable > 0 && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <Sparkles size={18} className="text-emerald-400" />
              <div>
                <p className="text-sm text-emerald-400 font-medium">+{estimatedPointsRecoverable} pts potential</p>
                <p className="text-xs text-zinc-500">If all items removed</p>
              </div>
            </div>
          )}

          {activeItems === 0 && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <p className="text-sm text-emerald-400">No negative items!</p>
            </div>
          )}
        </div>

        {/* Disputes Summary */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Disputes</h2>
            <Link href="/credit/disputes" className="text-sm text-emerald-400 hover:text-emerald-300">
              View All
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="text-center p-2 bg-zinc-800/50 rounded-lg">
              <p className="text-2xl font-bold text-zinc-300">{disputeStats.draft}</p>
              <p className="text-xs text-zinc-500">Draft</p>
            </div>
            <div className="text-center p-2 bg-zinc-800/50 rounded-lg">
              <p className="text-2xl font-bold text-blue-400">{disputeStats.sent}</p>
              <p className="text-xs text-zinc-500">Sent</p>
            </div>
            <div className="text-center p-2 bg-zinc-800/50 rounded-lg">
              <p className="text-2xl font-bold text-emerald-400">{disputeStats.won}</p>
              <p className="text-xs text-zinc-500">Won</p>
            </div>
          </div>

          <Link 
            href="/credit/disputes?action=new"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm"
          >
            <FileText size={16} />
            Generate New Letter
          </Link>
        </div>
      </div>

      {/* Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* High Impact Items */}
        {highImpactItems.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target size={18} className="text-amber-400" />
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Priority Items</h2>
            </div>

            <div className="space-y-3">
              {highImpactItems.map(item => (
                <Link
                  key={item.id}
                  href={`/credit/negatives?item=${item.id}`}
                  className="flex items-center justify-between p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <div>
                    <p className="text-white font-medium">{item.creditor_name}</p>
                    <p className="text-sm text-zinc-500">
                      {ITEM_TYPE_LABELS[item.item_type]} • {item.amount ? `$${item.amount.toLocaleString()}` : 'Amount unknown'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded">
                      -{item.estimated_points || '??'} pts
                    </span>
                    <ChevronRight size={16} className="text-zinc-500" />
                  </div>
                </Link>
              ))}
            </div>

            {items.filter(i => i.estimated_impact === 'high').length > 3 && (
              <Link 
                href="/credit/negatives?filter=high"
                className="block text-center text-sm text-zinc-400 hover:text-white mt-4"
              >
                View all high-impact items →
              </Link>
            )}
          </div>
        )}

        {/* Upcoming Deadlines */}
        {upcomingDeadlines.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-amber-400" />
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Upcoming Deadlines</h2>
            </div>

            <div className="space-y-3">
              {upcomingDeadlines.map(dispute => (
                <Link
                  key={dispute.id}
                  href={`/credit/disputes?dispute=${dispute.id}`}
                  className="flex items-center justify-between p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <div>
                    <p className="text-white font-medium">{dispute.target}</p>
                    <p className="text-sm text-zinc-500">
                      Response due {new Date(dispute.deadline_date!).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`text-sm font-medium ${dispute.daysLeft <= 3 ? 'text-red-400' : 'text-amber-400'}`}>
                    {dispute.daysLeft === 0 ? 'Today!' : `${dispute.daysLeft} days`}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty State / Getting Started */}
        {activeItems === 0 && disputeStats.total === 0 && (
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles size={32} className="text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Ready to boost your credit?</h3>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto">
              Start by adding any negative items from your credit report. We&apos;ll help you dispute them with AI-generated letters.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/credit/negatives?action=add"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
              >
                Add Negative Item
              </Link>
              <button
                onClick={() => setShowAddScore(true)}
                className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                Track My Scores
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Score Dialog */}
      <AddScoreDialog
        open={showAddScore}
        onOpenChange={setShowAddScore}
        onSuccess={() => {
          setShowAddScore(false);
        }}
      />
    </div>
  );
}
