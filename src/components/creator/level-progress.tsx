'use client';

import { motion } from 'framer-motion';
import { Check, Lock, Share2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Level {
  level: number;
  name: string;
  emoji: string;
  minRevenue: number;
  maxRevenue: number;
}

interface Achievement {
  id: string;
  name: string;
  unlocked: boolean;
  progress?: number;
  target?: number;
}

const levels: Level[] = [
  { level: 1, name: 'Starter', emoji: '🌱', minRevenue: 0, maxRevenue: 500 },
  { level: 2, name: 'Side Hustler', emoji: '💼', minRevenue: 500, maxRevenue: 1000 },
  { level: 3, name: 'Getting Traction', emoji: '🚀', minRevenue: 1000, maxRevenue: 2000 },
  { level: 4, name: 'Part-Time Creator', emoji: '⏰', minRevenue: 2000, maxRevenue: 4000 },
  { level: 5, name: 'Full-Time Hopeful', emoji: '🎯', minRevenue: 4000, maxRevenue: 6000 },
  { level: 6, name: 'Full-Time Creator', emoji: '🎨', minRevenue: 6000, maxRevenue: 8000 },
  { level: 7, name: 'Rising Star', emoji: '⭐', minRevenue: 8000, maxRevenue: 10000 },
  { level: 8, name: 'Established', emoji: '🏆', minRevenue: 10000, maxRevenue: 15000 },
  { level: 9, name: 'Six Figures', emoji: '💎', minRevenue: 15000, maxRevenue: 25000 },
  { level: 10, name: 'Top 1%', emoji: '👑', minRevenue: 25000, maxRevenue: Infinity },
];

const mockAchievements: Achievement[] = [
  { id: '1', name: 'First Dollar Earned', unlocked: true },
  { id: '2', name: 'First $1,000 Month', unlocked: true },
  { id: '3', name: 'Multi-Platform Creator', unlocked: true },
  { id: '4', name: 'Consistent Streamer (30 days)', unlocked: true },
  { id: '5', name: 'Revenue Diversification Pro', unlocked: true },
  { id: '6', name: 'First $10K Month', unlocked: false, progress: 8240, target: 10000 },
  { id: '7', name: 'Viral Video (100K+ views)', unlocked: false, progress: 0, target: 1 },
  { id: '8', name: 'Brand Partnership', unlocked: false, progress: 1, target: 3 },
];

// Mock data
const currentRevenue = 8240;
const currentLevel = levels.find(
  (l) => currentRevenue >= l.minRevenue && currentRevenue < l.maxRevenue
) || levels[6];
const nextLevel = levels[currentLevel.level] || currentLevel;
const daysToNextLevel = 18;

export function LevelProgress() {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const progressPercentage =
    ((currentRevenue - currentLevel.minRevenue) /
      (currentLevel.maxRevenue - currentLevel.minRevenue)) *
    100;

  const unlockedAchievements = mockAchievements.filter((a) => a.unlocked);
  const lockedAchievements = mockAchievements.filter((a) => !a.unlocked);

  return (
    <div className="glass-card p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">Creator Level</h2>
          <p className="text-sm text-white/60">Your journey to the top</p>
        </div>

        {/* Current Level */}
        <div className="text-center py-6 bg-gradient-to-br from-[#1a7a6d]/20 to-transparent rounded-lg border border-[#1a7a6d]/30">
          <div className="text-5xl mb-2">{currentLevel.emoji}</div>
          <div className="text-2xl font-bold text-white mb-1">{currentLevel.name}</div>
          <div className="text-sm text-white/60">Level {currentLevel.level}</div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">
              Level {currentLevel.level} → {nextLevel.level}
            </span>
            <span className="text-white font-medium">
              {formatCurrency(currentRevenue)} / {formatCurrency(currentLevel.maxRevenue)}
            </span>
          </div>

          <div className="relative h-4 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#1a7a6d] to-emerald-400 rounded-full"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-medium text-white drop-shadow-lg">
                {Math.round(progressPercentage)}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-white/60">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>At current pace: {daysToNextLevel} days</span>
          </div>
        </div>

        {/* Achievements */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Achievements</h3>

          {/* Unlocked */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-white/60 uppercase tracking-wide">Unlocked</p>
            <div className="space-y-2">
              {unlockedAchievements.map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-500/10 to-transparent rounded-lg border border-emerald-500/20"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-sm text-white">{achievement.name}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Locked */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-white/60 uppercase tracking-wide">
              Up Next
            </p>
            <div className="space-y-2">
              {lockedAchievements.map((achievement, index) => {
                const progressPercent = achievement.progress && achievement.target
                  ? (achievement.progress / achievement.target) * 100
                  : 0;

                const remaining = achievement.target && achievement.progress
                  ? achievement.target - achievement.progress
                  : null;

                return (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-3 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                        <Lock className="w-4 h-4 text-white/40" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm text-white/80">{achievement.name}</span>
                          {remaining !== null && (
                            <span className="text-xs text-white/60 flex-shrink-0">
                              {achievement.id === '6'
                                ? formatCurrency(remaining)
                                : `${remaining} more`}
                            </span>
                          )}
                        </div>
                        {progressPercent > 0 && (
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progressPercent}%` }}
                              transition={{ duration: 0.6 }}
                              className="h-full bg-[#1a7a6d] rounded-full"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Share Button */}
        <button className="w-full py-3 px-4 bg-gradient-to-r from-[#1a7a6d] to-emerald-600 hover:from-[#1a7a6d]/80 hover:to-emerald-600/80 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 group">
          <Share2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          Share Achievement 📸
        </button>
      </div>
    </div>
  );
}
