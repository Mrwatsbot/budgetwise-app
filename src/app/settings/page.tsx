'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Briefcase, Palette, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { IncomeType } from '@/types/database';

export default function SettingsPage() {
  const { userProfile, isLoading: userLoading } = useUser();
  const router = useRouter();
  const [updating, setUpdating] = useState(false);

  const appShellUser = {
    email: userProfile?.email || undefined,
    full_name: userProfile?.full_name || undefined,
  };

  const handleIncomeTypeChange = async (newType: IncomeType) => {
    setUpdating(true);
    try {
      const supabase = createClient();
      const updateData: Record<string, any> = { income_type: newType };
      const { error } = await (supabase
        .from('profiles')
        .update as any)(updateData)
        .eq('id', userProfile.id);

      if (error) throw error;

      toast.success(`Switched to ${newType === 'w2' ? 'W2' : 'Creator'} mode`);
      
      // Refresh to update the dashboard
      router.refresh();
    } catch (error: any) {
      toast.error('Failed to update: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  if (userLoading) {
    return (
      <AppShell user={appShellUser}>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const currentIncomeType = userProfile.income_type || 'w2';

  return (
    <AppShell user={appShellUser}>
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences</p>
        </div>

        {/* Income Type Card */}
        <Card>
          <CardHeader>
            <CardTitle>Income Type</CardTitle>
            <CardDescription>
              Choose how your dashboard is tailored. This affects which features and insights you see.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {/* W2 Option */}
              <button
                onClick={() => handleIncomeTypeChange('w2')}
                disabled={updating || currentIncomeType === 'w2'}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
                  'hover:border-[#e8922e80] hover:bg-[#e8922e0d] disabled:opacity-50 disabled:cursor-not-allowed',
                  currentIncomeType === 'w2'
                    ? 'border-[#e8922e80] bg-[#e8922e1a]'
                    : 'border-border bg-secondary/30'
                )}
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#e8922e33] to-[#f0ad3033] border border-[#e8922e4d] flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-[#f0a030]" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">W2 / Salary</p>
                  <p className="text-sm text-muted-foreground">Regular paycheck, predictable income</p>
                </div>
                {currentIncomeType === 'w2' && (
                  <div className="px-3 py-1 rounded-full bg-[#e8922e33] text-[#e8922e] text-xs font-medium">
                    Current
                  </div>
                )}
              </button>

              {/* Creator Option */}
              <button
                onClick={() => handleIncomeTypeChange('creator')}
                disabled={updating || currentIncomeType === 'creator'}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
                  'hover:border-[#e8922e80] hover:bg-[#e8922e0d] disabled:opacity-50 disabled:cursor-not-allowed',
                  currentIncomeType === 'creator'
                    ? 'border-[#e8922e80] bg-[#e8922e1a]'
                    : 'border-border bg-secondary/30'
                )}
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#e8922e33] to-[#f0ad3033] border border-[#e8922e4d] flex items-center justify-center">
                  <Palette className="h-6 w-6 text-[#f0a030]" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Creator / Freelancer</p>
                  <p className="text-sm text-muted-foreground">Variable income from multiple sources</p>
                </div>
                {currentIncomeType === 'creator' && (
                  <div className="px-3 py-1 rounded-full bg-[#e8922e33] text-[#e8922e] text-xs font-medium">
                    Current
                  </div>
                )}
              </button>
            </div>

            {updating && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating dashboard...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm text-muted-foreground">Email</Label>
              <p className="text-sm font-medium">{userProfile.email}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Name</Label>
              <p className="text-sm font-medium">{userProfile.full_name || 'Not set'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
