'use client';

import { useState } from 'react';
import { useDashboard, useAILimits } from '@/lib/hooks/use-data';
import { requestCoaching } from '@/lib/hooks/use-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Brain,
  TrendingUp,
  CreditCard,
  Wallet,
  PiggyBank,
  Trophy,
  Loader2,
  Sparkles,
  Lock,
  Clock,
  Gauge,
} from 'lucide-react';

interface CoachingResult {
  type: string;
  result: string;
  model: string;
  generated_at: string;
}

const analysisTypes = [
  {
    type: 'spending',
    label: 'Analyze Spending',
    description: 'Patterns, trends, and actionable recommendations',
    icon: TrendingUp,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-[#5b8fd9]4d',
  },
  {
    type: 'debt',
    label: 'Debt Strategy',
    description: 'Optimal payoff plan with timeline and savings',
    icon: CreditCard,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
  },
  {
    type: 'budget',
    label: 'Budget Suggestions',
    description: 'AI-optimized budget based on your income and habits',
    icon: Wallet,
    color: 'text-[#7aba5c]',
    bg: 'bg-[#6db555]/10',
    border: 'border-[#6db555]/30',
  },
  {
    type: 'savings',
    label: 'Find Savings',
    description: 'Subscriptions, recurring costs, and optimization',
    icon: PiggyBank,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30',
  },
  {
    type: 'score',
    label: 'Score Coaching',
    description: 'Improve your Financial Health Score',
    icon: Trophy,
    color: 'text-[#1a7a6d]',
    bg: 'bg-[#1a7a6d1a]',
    border: 'border-[#1a7a6d4d]',
  },
];

export function CoachingContent() {
  const { data, isLoading: dashLoading } = useDashboard();
  const { tier, features, refresh: refreshLimits } = useAILimits();
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<CoachingResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);

  const isFree = tier === 'free';
  const isBasic = tier === 'basic';
  const isLocked = isFree || isBasic;
  const coachingLimits = features?.coaching;
  const isUnlimited = coachingLimits?.limit === -1;
  const remainingUses = coachingLimits?.remaining ?? 0;
  const totalLimit = coachingLimits?.limit ?? 0;

  const handleAnalysis = async (type: string) => {
    setLoading(type);
    setError(null);
    setRateLimitMessage(null);
    try {
      const response = await requestCoaching(type);
      setResults((prev) => {
        // Replace if same type exists, else prepend
        const filtered = prev.filter((r) => r.type !== type);
        return [{ type, result: response.result, model: response.model, generated_at: response.generated_at }, ...filtered];
      });
      refreshLimits();
    } catch (err) {
      if (err instanceof Error && err.message.includes('429')) {
        setRateLimitMessage('You\'ve used all your coaching analyses for this month. Upgrade to Pro for unlimited access.');
      } else {
        setError(err instanceof Error ? err.message : 'Analysis failed');
      }
    } finally {
      setLoading(null);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a7a6d33] to-[#146b5f33] border border-[#1a7a6d4d] flex items-center justify-center">
          <Brain className="w-6 h-6 text-[#1a7a6d]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Financial Coach</h1>
          <p className="text-muted-foreground">Personalized analysis powered by AI</p>
        </div>
      </div>

      {/* Locked State */}
      {isLocked ? (
        <Card className="border-[#1a7a6d33]">
          <CardContent className="p-8 text-center">
            <Lock className="w-12 h-12 text-[#1a7a6d] mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Unlock AI Coaching</h2>
            <p className="text-muted-foreground mb-2 max-w-md mx-auto">
              Get personalized financial analysis, debt payoff strategies, budget optimization, and score coaching — all powered by AI.
            </p>
            <ul className="text-sm text-muted-foreground mb-6 space-y-1">
              <li>Spending pattern analysis with actionable insights</li>
              <li>Optimal debt payoff strategy with timeline</li>
              <li>AI-generated budget recommendations</li>
              <li>Subscription and savings finder</li>
              <li>Financial Health Score coaching</li>
            </ul>
            <Button className="gradient-btn border-0" asChild>
              <a href="/settings">
                <Sparkles className="w-4 h-4 mr-2" />
                Upgrade to Plus
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Quick Analysis Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Quick Analysis</h2>
              {!isUnlimited && totalLimit > 0 && (
                <span className="text-xs text-muted-foreground">
                  {remainingUses} of {totalLimit} analyses remaining this month
                </span>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {analysisTypes.map((analysis) => {
                const IconComponent = analysis.icon;
                const isRunning = loading === analysis.type;
                return (
                  <button
                    key={analysis.type}
                    onClick={() => handleAnalysis(analysis.type)}
                    disabled={isRunning || !!loading || dashLoading || (!isUnlimited && remainingUses <= 0)}
                    className={`glass-card rounded-xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed border ${analysis.border}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-9 h-9 rounded-lg ${analysis.bg} flex items-center justify-center`}>
                        {isRunning ? (
                          <Loader2 className={`w-4 h-4 ${analysis.color} animate-spin`} />
                        ) : (
                          <IconComponent className={`w-4 h-4 ${analysis.color}`} />
                        )}
                      </div>
                      <span className="font-semibold text-sm">{analysis.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{analysis.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rate limit message */}
          {rateLimitMessage && (
            <Card className="border-teal-500/30 bg-teal-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <Gauge className="w-5 h-5 text-teal-400 flex-shrink-0" />
                <p className="text-sm text-muted-foreground flex-1">{rateLimitMessage}</p>
                <Button size="sm" className="gradient-btn border-0 flex-shrink-0" asChild>
                  <a href="/settings">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Upgrade
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {error && (
            <Card className="border-red-500/30 bg-red-500/10">
              <CardContent className="p-4">
                <p className="text-sm text-red-400">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Results</h2>
              {results.map((result) => {
                const analysis = analysisTypes.find((a) => a.type === result.type);
                const IconComponent = analysis?.icon || Brain;
                return (
                  <Card key={result.type} className={`border ${analysis?.border || 'border-border'}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <IconComponent className={`w-5 h-5 ${analysis?.color || 'text-muted-foreground'}`} />
                          <CardTitle className="text-base">{analysis?.label || result.type}</CardTitle>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          {timeAgo(result.generated_at)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm prose-invert max-w-none">
                        <div className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">
                          {result.result}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {results.length === 0 && !loading && (
            <Card>
              <CardContent className="p-8 text-center">
                <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Choose an analysis type above to get started. Your AI coach will analyze your financial data and provide personalized recommendations.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
