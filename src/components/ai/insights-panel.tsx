'use client';

import { useState } from 'react';
import {
  Sparkles,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Target,
  RefreshCw,
  Loader2,
  Lock,
  Gauge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageInsights, generateInsights, useAILimits } from '@/lib/hooks/use-data';
import { useIsDemo } from '@/lib/demo-mode';
import { DEMO_SPENDING_INSIGHTS } from '@/lib/demo-ai-responses';

interface InsightsPanelProps {
  page: string; // 'dashboard' | 'budgets' | 'transactions' | 'savings' | 'debts'
  pageData?: Record<string, unknown>;
}

interface Insight {
  id: string;
  type: 'tip' | 'warning' | 'positive' | 'action';
  title: string;
  body: string;
  impact?: string;
}

const typeConfig = {
  tip: {
    icon: Lightbulb,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/20',
  },
  positive: {
    icon: CheckCircle,
    color: 'text-[#7aba5c]',
    bg: 'bg-[#6db555]/10',
    border: 'border-[#6db555]/20',
  },
  action: {
    icon: Target,
    color: 'text-[#1a7a6d]',
    bg: 'bg-[#1a7a6d1a]',
    border: 'border-[#1a7a6d33]',
  },
};

function InsightCard({ insight }: { insight: Insight }) {
  const config = typeConfig[insight.type] || typeConfig.tip;
  const IconComponent = config.icon;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${config.bg} border ${config.border}`}>
      <IconComponent className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{insight.title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{insight.body}</p>
        {insight.impact && (
          <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full bg-[#1a7a6d33] text-[#22a090] border border-[#1a7a6d4d]">
            {insight.impact}
          </span>
        )}
      </div>
    </div>
  );
}

function ShimmerCards() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
          <Skeleton className="w-5 h-5 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LockedState() {
  return (
    <div className="relative">
      {/* Fake blurred insights */}
      <div className="space-y-3 blur-sm select-none pointer-events-none">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10">
          <Lightbulb className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-400" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Your spending has a pattern</p>
            <p className="text-sm text-muted-foreground">AI detected recurring charges you could optimize</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-lg bg-teal-500/10">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-teal-400" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Budget alert on a category</p>
            <p className="text-sm text-muted-foreground">One category is trending over budget this month</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-lg bg-[#6db555]/10">
          <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#7aba5c]" />
          <div className="flex-1">
            <p className="text-sm font-semibold">You are on track this month</p>
            <p className="text-sm text-muted-foreground">Great job keeping your spending in check</p>
          </div>
        </div>
      </div>

      {/* Overlay CTA */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg">
        <Lock className="w-8 h-8 text-[#1a7a6d] mb-3" />
        <p className="text-sm font-semibold mb-1">Unlock AI Insights</p>
        <p className="text-xs text-muted-foreground mb-3">Upgrade to Plus for personalized analysis</p>
        <Button size="sm" className="gradient-btn border-0" asChild>
          <a href="/settings">
            <Sparkles className="w-4 h-4 mr-1.5" />
            Upgrade to Plus
          </a>
        </Button>
      </div>
    </div>
  );
}

function RateLimitedState({ message }: { message: string }) {
  return (
    <div className="text-center py-6">
      <Gauge className="w-8 h-8 text-teal-400 mx-auto mb-3" />
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      <Button size="sm" className="gradient-btn border-0" asChild>
        <a href="/settings">
          <Sparkles className="w-4 h-4 mr-1.5" />
          Upgrade to Pro
        </a>
      </Button>
    </div>
  );
}

export function InsightsPanel({ page, pageData }: InsightsPanelProps) {
  const isDemo = useIsDemo();
  const { insights, generatedAt, stale, isLoading, refresh } = usePageInsights(page);
  const { tier, features } = useAILimits();
  const [generating, setGenerating] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  const [demoInsights, setDemoInsights] = useState<Insight[] | null>(null);

  const isFree = tier === 'free' || tier === 'basic';
  const insightsLimits = features?.insights;
  const isUnlimited = insightsLimits?.limit === -1;
  const remainingUses = insightsLimits?.remaining ?? 0;
  const totalLimit = insightsLimits?.limit ?? 0;
  const usedCount = insightsLimits?.used ?? 0;

  const handleGenerate = async () => {
    setGenerating(true);
    setRateLimitMessage(null);
    
    try {
      // DEMO MODE: Use mock insights
      if (isDemo) {
        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Map demo insights to expected format
        const mappedInsights: Insight[] = DEMO_SPENDING_INSIGHTS.map((insight, idx) => ({
          id: `demo-${idx}`,
          type: insight.type === 'success' ? 'positive' : insight.type === 'opportunity' ? 'action' : insight.type as 'tip' | 'warning',
          title: insight.message,
          body: insight.detail,
          impact: insight.action || undefined,
        }));
        
        setDemoInsights(mappedInsights);
        setGenerating(false);
        return;
      }
      
      // REAL MODE: Call API
      await generateInsights(page, pageData);
      refresh();
    } catch (error) {
      // Check if it's a rate limit error
      if (error instanceof Error && error.message.includes('429')) {
        setRateLimitMessage('You\'ve used all your insight refreshes for today. Upgrade to Pro for unlimited access.');
      } else {
        console.error('Failed to generate insights:', error);
      }
    } finally {
      setGenerating(false);
    }
  };

  // Time ago helper
  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="glass-card rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1a7a6d33] to-[#146b5f33] border border-[#1a7a6d4d] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#1a7a6d]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">AI Insights</h2>
            <p className="text-sm text-muted-foreground">Personalized analysis for this page</p>
          </div>
        </div>
      </div>

      {/* Content */}
      {isFree && !isDemo ? (
        <LockedState />
      ) : rateLimitMessage ? (
        <RateLimitedState message={rateLimitMessage} />
      ) : isLoading || generating ? (
        <ShimmerCards />
      ) : (isDemo && demoInsights) || (insights && insights.length > 0 && !stale) ? (
        <>
          <div className="space-y-3">
            {(isDemo ? demoInsights : insights)?.map((insight: Insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>

          {/* Footer */}
          {!isDemo && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Updated {timeAgo(generatedAt)}
                </span>
                {!isUnlimited && totalLimit > 0 && (
                  <span className="text-xs text-muted-foreground/70">
                    {remainingUses} of {totalLimit} refreshes remaining today
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerate}
                disabled={generating || (!isUnlimited && remainingUses <= 0)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {generating ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                )}
                Refresh
              </Button>
            </div>
          )}

          {/* Demo Mode CTA */}
          {isDemo && demoInsights && (
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-[#1a7a6d1a] to-[#146b5f1a] border border-[#1a7a6d4d]">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-[#1a7a6d] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-1">Get Real Insights</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    This is a demo using sample data. Sign up to get AI insights based on YOUR actual spending patterns.
                  </p>
                  <Button size="sm" className="gradient-btn border-0" asChild>
                    <a href="/signup">
                      Sign Up Free
                      <Target className="w-3.5 h-3.5 ml-1.5" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Stale or no insights — show generate button */
        <div className="text-center py-6">
          <Sparkles className="w-8 h-8 text-[#1a7a6d] mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            {stale ? 'Your insights are outdated. Generate fresh analysis.' : 'Get AI-powered insights for this page.'}
          </p>
          {!isUnlimited && totalLimit > 0 && (
            <p className="text-xs text-muted-foreground/70 mb-3">
              {remainingUses} of {totalLimit} refreshes remaining today
            </p>
          )}
          <Button
            className="gradient-btn border-0"
            onClick={handleGenerate}
            disabled={generating || (!isUnlimited && remainingUses <= 0)}
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Insights
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
