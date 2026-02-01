'use client';

import { useState } from 'react';
import { 
  Sparkles, TrendingUp, AlertCircle, Scissors, 
  ChevronRight, Loader2, Search, Zap, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Insight {
  id: string;
  type: 'warning' | 'tip' | 'opportunity';
  icon: 'trending' | 'alert' | 'calendar' | 'scissors';
  text: string;
  action?: string;
}

interface AIInsightsPanelProps {
  insights: Insight[];
  onAnalyze?: () => void;
  onFindSavings?: () => void;
}

const iconMap = {
  trending: TrendingUp,
  alert: AlertCircle,
  calendar: Calendar,
  scissors: Scissors,
};

const typeColors = {
  warning: 'text-yellow-400',
  tip: 'text-blue-400',
  opportunity: 'text-[#7aba5c]',
};

const typeBg = {
  warning: 'bg-yellow-500/10',
  tip: 'bg-blue-500/10',
  opportunity: 'bg-[#6db555]/10',
};

export function AIInsightsPanel({ insights, onAnalyze, onFindSavings }: AIInsightsPanelProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [findingSavings, setFindingSavings] = useState(false);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 2000));
    setAnalyzing(false);
    onAnalyze?.();
  };

  const handleFindSavings = async () => {
    setFindingSavings(true);
    // Simulate AI search
    await new Promise(resolve => setTimeout(resolve, 2000));
    setFindingSavings(false);
    onFindSavings?.();
  };

  return (
    <div className="glass-card rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1a7a6d33] to-[#146b5f33] border border-[#1a7a6d4d] flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-[#1a7a6d]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">AI Insights</h2>
          <p className="text-sm text-muted-foreground">Smart recommendations based on your spending</p>
        </div>
      </div>

      {/* Insights List */}
      <div className="space-y-3 mb-5">
        {insights.map((insight) => {
          const IconComponent = iconMap[insight.icon];
          return (
            <div 
              key={insight.id}
              className={`flex items-start gap-3 p-3 rounded-lg ${typeBg[insight.type]} transition-colors hover:opacity-90`}
            >
              <IconComponent className={`w-5 h-5 mt-0.5 flex-shrink-0 ${typeColors[insight.type]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm">{insight.text}</p>
                {insight.action && (
                  <button className="text-xs text-[#1a7a6d] hover:text-[#22a090] mt-1 flex items-center gap-1">
                    {insight.action}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          className="flex-1 gradient-btn border-0"
          onClick={handleAnalyze}
          disabled={analyzing}
        >
          {analyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Analyze Spending
            </>
          )}
        </Button>
        <Button 
          variant="outline"
          className="flex-1 border-[#1a7a6d4d] text-[#1a7a6d] hover:bg-[#1a7a6d1a]"
          onClick={handleFindSavings}
          disabled={findingSavings}
        >
          {findingSavings ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Find Savings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
