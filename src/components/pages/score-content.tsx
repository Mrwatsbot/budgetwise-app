'use client';

import { useScore } from '@/lib/hooks/use-data';
import { ListLoading } from '@/components/layout/page-loading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScoreGauge } from '@/components/score/score-gauge';
import { ScoreHeroPillars } from '@/components/score/score-hero';
import { PillarCard } from '@/components/score/pillar-card';
import { TheBleed } from '@/components/score/the-bleed';
import { StreakCard } from '@/components/score/streak-card';
import { AchievementBadge } from '@/components/score/achievement-badge';
import { ScoreChart } from '@/components/score/score-chart';
import {
  TrendingUp,
  Shield,
  Landmark,
  Award,
  Flame,
  Receipt,
  AlertTriangle,
} from 'lucide-react';
import type { StreakType, AchievementCategory, AchievementDefinition, UserAchievement, Streak } from '@/types/database';

const CATEGORY_ORDER: AchievementCategory[] = ['beginner', 'progress', 'achievement', 'elite', 'secret'];
const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  beginner: 'Beginner',
  progress: 'Progress',
  achievement: 'Achievement',
  elite: 'Elite',
  secret: 'Secret',
};

export function ScoreContent() {
  const {
    score,
    history,
    achievements,
    achievementDefinitions,
    streaks,
    isLoading,
  } = useScore();

  return (
    <div className="space-y-6">
      {isLoading ? (
        <ListLoading />
      ) : !score ? (
        /* ── Empty State ── */
        <Card>
          <CardContent className="p-8 text-center">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">Start Tracking to Get Your Score</h3>
            <p className="text-sm text-muted-foreground">
              Log some transactions, set up budgets, and add your debts to generate your Financial Health Score.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ═══════════════════════════════════════════
              a) SCORE HERO — Full-bleed, no card wrapper
              The flagship visual. Gauge + pillar summary.
              ═══════════════════════════════════════════ */}
          <div className="relative rounded-2xl overflow-hidden border border-white/[0.04] bg-gradient-to-b from-white/[0.02] to-transparent">
            {/* Ambient top edge accent line */}
            <div className="absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-[#1a7a6d]/40 to-transparent" />

            {/* Score Gauge */}
            <ScoreGauge
              score={score.total}
              levelTitle={score.levelTitle}
              level={score.level}
              previousScore={score.previousScore}
            />

            {/* Pillar Summary Bars */}
            <div className="px-4 pb-5">
              <ScoreHeroPillars
                trajectory={{ name: 'Trajectory', score: score.trajectory.score, max: score.trajectory.max }}
                behavior={{ name: 'Behavior', score: score.behavior.score, max: score.behavior.max }}
                position={{ name: 'Position', score: score.position.score, max: score.position.max }}
              />
            </div>
          </div>

          {/* ═══════════════════════════════════════════
              b) THREE PILLAR DETAIL CARDS
              With reachable upside text
              ═══════════════════════════════════════════ */}
          <div className="grid gap-4 md:grid-cols-3">
            <PillarCard
              name="Trajectory"
              icon={TrendingUp}
              score={score.trajectory.score}
              max={score.trajectory.max}
              color="blue"
              upsideText={
                score.trajectory.max - score.trajectory.score > 20
                  ? `+${score.trajectory.max - score.trajectory.score} pts available — increase savings or accelerate debt payoff`
                  : score.trajectory.max - score.trajectory.score > 0
                  ? `+${score.trajectory.max - score.trajectory.score} pts to max!`
                  : undefined
              }
              subComponents={[
                {
                  name: 'Wealth Building Rate',
                  score: score.trajectory.wealthBuildingRate.score,
                  max: score.trajectory.wealthBuildingRate.max,
                  detail: score.trajectory.wealthBuildingRate.detail,
                },
                {
                  name: 'Debt Velocity',
                  score: score.trajectory.debtVelocity.score,
                  max: score.trajectory.debtVelocity.max,
                  detail: score.trajectory.debtVelocity.detail,
                },
              ]}
            />
            <PillarCard
              name="Behavior"
              icon={Shield}
              score={score.behavior.score}
              max={score.behavior.max}
              color="emerald"
              upsideText={
                score.behavior.max - score.behavior.score > 20
                  ? `+${score.behavior.max - score.behavior.score} pts available — stay on budget & pay bills on time`
                  : score.behavior.max - score.behavior.score > 0
                  ? `+${score.behavior.max - score.behavior.score} pts to max!`
                  : undefined
              }
              subComponents={[
                {
                  name: 'Payment Consistency',
                  score: score.behavior.paymentConsistency.score,
                  max: score.behavior.paymentConsistency.max,
                  detail: score.behavior.paymentConsistency.detail,
                },
                {
                  name: 'Budget Discipline',
                  score: score.behavior.budgetDiscipline.score,
                  max: score.behavior.budgetDiscipline.max,
                  detail: score.behavior.budgetDiscipline.detail,
                },
              ]}
            />
            <PillarCard
              name="Position"
              icon={Landmark}
              score={score.position.score}
              max={score.position.max}
              color="amber"
              upsideText={
                score.position.max - score.position.score > 20
                  ? `+${score.position.max - score.position.score} pts available — grow emergency fund or reduce debt`
                  : score.position.max - score.position.score > 0
                  ? `+${score.position.max - score.position.score} pts to max!`
                  : undefined
              }
              subComponents={[
                {
                  name: 'Emergency Buffer',
                  score: score.position.emergencyBuffer.score,
                  max: score.position.emergencyBuffer.max,
                  detail: score.position.emergencyBuffer.detail,
                },
                {
                  name: 'Debt-to-Income',
                  score: score.position.debtToIncome.score,
                  max: score.position.debtToIncome.max,
                  detail: score.position.debtToIncome.detail,
                },
              ]}
            />
          </div>

          {/* ═══════════════════════════════════════════
              c) THE BLEED — Monthly interest cost
              ═══════════════════════════════════════════ */}
          {score.debtCosts && score.debtCosts.length > 0 && (
            <TheBleed debts={score.debtCosts} />
          )}

          {/* ═══════════════════════════════════════════
              d) SCORE HISTORY CHART
              ═══════════════════════════════════════════ */}
          <ScoreChart history={history} />

          {/* ═══════════════════════════════════════════
              d) STREAKS
              ═══════════════════════════════════════════ */}
          {streaks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-5 h-5 text-teal-400" />
                <h2 className="text-lg font-semibold">Streaks</h2>
              </div>
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                {(['payment', 'budget', 'savings', 'logging'] as StreakType[]).map((type) => {
                  const streak = streaks.find((s: Streak) => s.type === type);
                  return (
                    <StreakCard
                      key={type}
                      type={type}
                      currentCount={streak?.current_count || 0}
                      longestCount={streak?.longest_count || 0}
                      freezeAvailable={streak?.freeze_available || false}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════
              e) ACHIEVEMENTS
              ═══════════════════════════════════════════ */}
          {achievementDefinitions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#1a7a6d]" />
                  <h2 className="text-lg font-semibold">Achievements</h2>
                </div>
                <span className="text-sm text-muted-foreground">
                  {achievements.length} / {achievementDefinitions.length} unlocked
                </span>
              </div>

              {CATEGORY_ORDER.map((category) => {
                const defs = achievementDefinitions.filter(
                  (d: AchievementDefinition) => d.category === category
                );
                if (defs.length === 0) return null;

                return (
                  <div key={category} className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      {CATEGORY_LABELS[category]}
                    </p>
                    <div className="grid gap-3 grid-cols-3 sm:grid-cols-4 lg:grid-cols-6">
                      {defs.map((def: AchievementDefinition) => {
                        const userAch = achievements.find(
                          (a: UserAchievement) => a.achievement_id === def.id
                        );
                        return (
                          <AchievementBadge
                            key={def.id}
                            name={def.name}
                            description={def.description}
                            icon={def.icon}
                            category={def.category}
                            isSecret={def.is_secret}
                            unlocked={!!userAch}
                            unlockedAt={userAch?.unlocked_at}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══════════════════════════════════════════
              f) WHAT'S MISSING — Data completeness
              ═══════════════════════════════════════════ */}
          {score.dataCompleteness && (
            !score.dataCompleteness.hasDebts ||
            !score.dataCompleteness.hasBudgets ||
            !score.dataCompleteness.hasSavingsGoals ||
            !score.dataCompleteness.hasBillPayments ||
            !score.dataCompleteness.hasHouseholdType
          ) && (
            <Card className="border-amber-500/20 bg-amber-500/[0.03]">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <CardTitle className="text-sm">Improve Your Score Accuracy</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Add missing data for a more complete picture
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {!score.dataCompleteness.hasDebts && (
                    <div className="flex items-start gap-2 text-xs">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <p className="text-muted-foreground">
                        Add your debts for accurate Debt-to-Income and Debt Velocity scoring
                      </p>
                    </div>
                  )}
                  {!score.dataCompleteness.hasBudgets && (
                    <div className="flex items-start gap-2 text-xs">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <p className="text-muted-foreground">
                        Set up budgets to unlock Budget Discipline scoring
                      </p>
                    </div>
                  )}
                  {!score.dataCompleteness.hasSavingsGoals && (
                    <div className="flex items-start gap-2 text-xs">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <p className="text-muted-foreground">
                        Create a savings goal to track your Emergency Buffer
                      </p>
                    </div>
                  )}
                  {!score.dataCompleteness.hasBillPayments && (
                    <div className="flex items-start gap-2 text-xs">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <p className="text-muted-foreground">
                        Track your bills to improve Payment Consistency scoring
                      </p>
                    </div>
                  )}
                  {!score.dataCompleteness.hasHouseholdType && (
                    <div className="flex items-start gap-2 text-xs">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <p className="text-muted-foreground">
                        Set your household type in Settings for personalized buffer targets
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══════════════════════════════════════════
              g) TOP RECOMMENDATIONS
              ═══════════════════════════════════════════ */}
          {score.tips && score.tips.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Top Recommendations</h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {score.tips.slice(0, 3).map((tip: string, idx: number) => (
                  <Card key={idx} className="border-[#1a7a6d]/20">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">{tip}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
