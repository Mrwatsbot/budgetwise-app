'use client';

import { useScore } from '@/lib/hooks/use-data';
import { ListLoading } from '@/components/layout/page-loading';
import { Card, CardContent } from '@/components/ui/card';
import { ScoreGauge } from '@/components/score/score-gauge';
import { PillarCard } from '@/components/score/pillar-card';
import { StreakCard } from '@/components/score/streak-card';
import { AchievementBadge } from '@/components/score/achievement-badge';
import { ScoreChart } from '@/components/score/score-chart';
import { InsightsPanel } from '@/components/ai/insights-panel';
import {
  TrendingUp,
  Shield,
  Landmark,
  Award,
  Flame,
  Receipt,
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Financial Health Score</h1>
        <p className="text-muted-foreground">Your 0-1,000 score with full breakdown</p>
      </div>

      {isLoading ? (
        <ListLoading />
      ) : !score ? (
        /* Empty State */
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
          {/* a) Score Hero */}
          <Card>
            <CardContent className="p-2">
              <ScoreGauge
                score={score.total}
                levelTitle={score.levelTitle}
                level={score.level}
                previousScore={score.previousScore}
              />
            </CardContent>
          </Card>

          {/* b) Three Pillar Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <PillarCard
              name="Trajectory"
              icon={TrendingUp}
              score={score.trajectory.score}
              max={score.trajectory.max}
              color="blue"
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

          {/* c) Score History Chart */}
          <ScoreChart history={history} />

          {/* d) Streaks Section */}
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

          {/* e) Achievements Section */}
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

          {/* f) AI Insights */}
          <InsightsPanel
            page="score"
            pageData={{
              total: score.total,
              level: score.level,
              trajectory: score.trajectory.score,
              behavior: score.behavior.score,
              position: score.position.score,
            }}
          />
        </>
      )}
    </div>
  );
}
