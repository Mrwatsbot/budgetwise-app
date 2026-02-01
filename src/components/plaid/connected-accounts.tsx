'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Trash2, Building2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PlaidConnection {
  id: string;
  institution_name: string;
  status: 'active' | 'error' | 'disconnected';
  last_synced_at: string | null;
  error_code: string | null;
  created_at: string;
}

interface ConnectedAccountsProps {
  connections: PlaidConnection[];
  onConnectionsChange: () => void;
}

export function ConnectedAccounts({ connections, onConnectionsChange }: ConnectedAccountsProps) {
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleSync = async (connectionId: string) => {
    setSyncing({ ...syncing, [connectionId]: true });
    
    try {
      const response = await fetch('/api/plaid/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: connectionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync transactions');
      }

      const data = await response.json();
      
      toast.success(`Sync complete: Added ${data.added}, updated ${data.modified}, removed ${data.removed}`);

      onConnectionsChange();
    } catch (error: any) {
      toast.error(error.message || 'Failed to sync transactions');
    } finally {
      setSyncing({ ...syncing, [connectionId]: false });
    }
  };

  const handleDisconnect = async () => {
    if (!connectionToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/plaid/connections?id=${connectionToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect account');
      }

      toast.success('Bank account has been disconnected');

      onConnectionsChange();
    } catch (error: any) {
      toast.error(error.message || 'Failed to disconnect account');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setConnectionToDelete(null);
    }
  };

  if (connections.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Connected Accounts</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Connect your bank to automatically import transactions and keep your budget up to date.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {connections.map((connection) => (
          <Card key={connection.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-lg">{connection.institution_name}</CardTitle>
                    <CardDescription className="mt-1">
                      Connected {formatDistanceToNow(new Date(connection.created_at), { addSuffix: true })}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {connection.status === 'active' ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Error
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {connection.last_synced_at ? (
                    <span>
                      Last synced {formatDistanceToNow(new Date(connection.last_synced_at), { addSuffix: true })}
                    </span>
                  ) : (
                    <span>Never synced</span>
                  )}
                  {connection.error_code && (
                    <span className="block text-destructive mt-1">
                      Error: {connection.error_code}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(connection.id)}
                    disabled={syncing[connection.id]}
                  >
                    {syncing[connection.id] ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sync Now
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setConnectionToDelete(connection.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Bank Account?</DialogTitle>
            <DialogDescription>
              This will disconnect your bank account. Your existing transactions will remain, but no new
              transactions will be imported.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button onClick={handleDisconnect} disabled={deleting} variant="destructive">
              {deleting ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
