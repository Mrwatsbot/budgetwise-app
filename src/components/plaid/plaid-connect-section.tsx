'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaidLinkButton } from './plaid-link-button';
import { ConnectedAccounts } from './connected-accounts';
import { Sparkles, Lock, Info, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface PlaidConnection {
  id: string;
  institution_name: string;
  status: 'active' | 'error' | 'disconnected';
  last_synced_at: string | null;
  error_code: string | null;
  created_at: string;
}

interface PlaidConnectSectionProps {
  userTier: 'free' | 'plus' | 'pro';
}

export function PlaidConnectSection({ userTier }: PlaidConnectSectionProps) {
  const [connections, setConnections] = useState<PlaidConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/plaid/connections');
      if (!response.ok) {
        throw new Error('Failed to fetch connections');
      }
      const data = await response.json();
      setConnections(data.connections || []);
    } catch (error: any) {
      console.error('Error fetching connections:', error);
      toast.error('Failed to load bank connections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleConnectionSuccess = () => {
    fetchConnections();
  };

  // Show upgrade prompt for free tier users
  if (userTier === 'free') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Automatic Bank Import</CardTitle>
          </div>
          <CardDescription>
            Connect your bank account to automatically import transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
            <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Premium Feature</p>
              <p className="text-sm text-muted-foreground">
                Bank connections are available for Plus and Pro tier users. Upgrade your account to connect
                your bank and automatically import transactions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bank Connections</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bank Connections</CardTitle>
              <CardDescription>
                Securely connect your bank to automatically import transactions
              </CardDescription>
            </div>
            {connections.length > 0 && (
              <PlaidLinkButton onSuccess={handleConnectionSuccess} variant="outline" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ConnectedAccounts
            connections={connections}
            onConnectionsChange={handleConnectionSuccess}
          />
          
          {connections.length === 0 && (
            <div className="mt-4 flex justify-center">
              <PlaidLinkButton onSuccess={handleConnectionSuccess} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plaid branding (required by Plaid) */}
      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border">
        <Shield className="h-5 w-5 text-muted-foreground" />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Powered by</span>
          <strong>Plaid</strong>
          <span className="text-xs text-muted-foreground">
            • Bank-level encryption and security
          </span>
        </div>
      </div>
    </div>
  );
}
