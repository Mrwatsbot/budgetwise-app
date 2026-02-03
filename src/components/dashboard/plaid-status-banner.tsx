'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { usePlaidLink } from 'react-plaid-link';

interface PlaidConnection {
  id: string;
  institution_name: string;
  status: string;
  last_synced_at: string | null;
  issue?: {
    type: 'error' | 'stale';
    connectionId: string;
    institutionName: string;
    message: string;
    errorCode?: string;
    hoursSinceSync?: number;
  };
}

interface PlaidStatusBannerProps {
  connections?: PlaidConnection[];
  onRefresh?: () => void;
}

export function PlaidStatusBanner({ connections, onRefresh }: PlaidStatusBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [reconnectingId, setReconnectingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Find the first non-dismissed issue
  const activeIssue = connections?.find(
    (conn) => conn.issue && !dismissed.has(conn.id)
  )?.issue;

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken, metadata) => {
      // Exchange token and trigger sync
      try {
        const res = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_token: publicToken }),
        });

        if (!res.ok) throw new Error('Failed to reconnect');

        toast.success('Bank reconnected successfully!');
        setLinkToken(null);
        setReconnectingId(null);
        
        // Clear dismissal and refresh data
        setDismissed(new Set());
        onRefresh?.();
      } catch (error) {
        console.error('Reconnection error:', error);
        toast.error('Failed to reconnect. Please try again.');
      }
    },
    onExit: () => {
      setLinkToken(null);
      setReconnectingId(null);
    },
  });

  // Open Plaid Link when token is ready
  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  if (!activeIssue) return null;

  const handleReconnect = async () => {
    if (!activeIssue.connectionId) return;

    try {
      setReconnectingId(activeIssue.connectionId);
      const res = await fetch('/api/plaid/reconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: activeIssue.connectionId }),
      });

      if (!res.ok) throw new Error('Failed to get reconnect link');

      const data = await res.json();
      setLinkToken(data.link_token);
    } catch (error) {
      console.error('Reconnect error:', error);
      toast.error('Failed to initiate reconnection');
      setReconnectingId(null);
    }
  };

  const handleSync = async () => {
    if (!activeIssue.connectionId) return;

    try {
      setSyncing(true);
      const res = await fetch('/api/plaid/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: activeIssue.connectionId }),
      });

      if (!res.ok) throw new Error('Sync failed');

      const data = await res.json();
      toast.success(
        `Synced! ${data.added || 0} added, ${data.modified || 0} updated`
      );
      
      // Clear dismissal and refresh
      setDismissed(new Set());
      onRefresh?.();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync. Please try reconnecting.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDismiss = () => {
    if (activeIssue.connectionId) {
      setDismissed((prev) => new Set(prev).add(activeIssue.connectionId));
    }
  };

  const isError = activeIssue.type === 'error';
  const isStale = activeIssue.type === 'stale';

  return (
    <div
      className={`glass-card rounded-xl p-4 border ${
        isError
          ? 'bg-amber-500/10 border-amber-500/30'
          : 'bg-muted/30 border-border/30'
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
            isError ? 'text-amber-500' : 'text-muted-foreground'
          }`}
        />
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium ${
              isError ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'
            }`}
          >
            {activeIssue.message}
          </p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {isError && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-amber-500/50 hover:bg-amber-500/10"
                  onClick={handleReconnect}
                  disabled={reconnectingId === activeIssue.connectionId}
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 mr-1.5 ${
                      reconnectingId === activeIssue.connectionId ? 'animate-spin' : ''
                    }`}
                  />
                  Reconnect
                </Button>
                <a
                  href="/transactions"
                  className="text-xs text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Manually
                </a>
              </>
            )}
            {isStale && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={handleSync}
                disabled={syncing}
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
            )}
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
