'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, X, ChevronDown, ChevronUp } from 'lucide-react';
import { generateBudgetAlerts, getDismissedAlerts, dismissAlert, type BudgetAlert, type CategoryBudgetData } from '@/lib/budget-alerts';
import { Button } from '@/components/ui/button';

interface BudgetAlertsBannerProps {
  categoryBudgets: CategoryBudgetData[];
}

export function BudgetAlertsBanner({ categoryBudgets }: BudgetAlertsBannerProps) {
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Generate alerts when budgets change
  useEffect(() => {
    const dismissed = getDismissedAlerts();
    setDismissedAlerts(dismissed);
    const generatedAlerts = generateBudgetAlerts(categoryBudgets, dismissed);
    setAlerts(generatedAlerts);
    
    // Auto-expand if there are new critical alerts
    const hasCritical = generatedAlerts.some(a => a.type === 'overspent' || a.type === 'danger');
    if (hasCritical) {
      setIsExpanded(true);
    }
  }, [categoryBudgets]);

  const handleDismiss = (categoryId: string) => {
    dismissAlert(categoryId);
    const newDismissed = getDismissedAlerts();
    setDismissedAlerts(newDismissed);
    setAlerts(generateBudgetAlerts(categoryBudgets, newDismissed));
  };

  // Don't render if no alerts
  if (alerts.length === 0) {
    return null;
  }

  const getAlertColor = (type: BudgetAlert['type']) => {
    switch (type) {
      case 'overspent':
      case 'danger':
        return 'text-red-400 border-red-400/20 bg-red-400/5';
      case 'warning':
      case 'pace':
        return 'text-amber-400 border-amber-400/20 bg-amber-400/5';
      default:
        return 'text-muted-foreground border-border/20';
    }
  };

  const getAlertIcon = (type: BudgetAlert['type']) => {
    switch (type) {
      case 'overspent':
      case 'danger':
        return <AlertTriangle className="h-4 w-4 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 flex-shrink-0" />;
      case 'pace':
        return <TrendingUp className="h-4 w-4 flex-shrink-0" />;
      default:
        return <AlertTriangle className="h-4 w-4 flex-shrink-0" />;
    }
  };

  const criticalCount = alerts.filter(a => a.type === 'overspent' || a.type === 'danger').length;
  const warningCount = alerts.filter(a => a.type === 'warning' || a.type === 'pace').length;

  return (
    <div className="glass-card rounded-xl overflow-hidden border border-border/50">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 sm:px-6 py-3 flex items-center justify-between hover:bg-accent/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 ${criticalCount > 0 ? 'text-red-400' : 'text-amber-400'}`}>
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold">Budget Alerts</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {criticalCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 font-medium">
                {criticalCount} critical
              </span>
            )}
            {warningCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 font-medium">
                {warningCount} warning{warningCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {/* Alert list - collapsible */}
      {isExpanded && (
        <div className="border-t border-border/50 divide-y divide-border/30">
          {alerts.map((alert) => (
            <div
              key={alert.categoryId}
              className={`px-4 sm:px-6 py-3 flex items-start gap-3 transition-colors hover:bg-accent/5 ${getAlertColor(alert.type)}`}
            >
              <div className="mt-0.5">
                {getAlertIcon(alert.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {alert.categoryName}
                </p>
                <p className="text-xs opacity-90 mt-0.5">
                  {alert.message}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismiss(alert.categoryId)}
                className="flex-shrink-0 h-7 w-7 p-0 hover:bg-background/50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
