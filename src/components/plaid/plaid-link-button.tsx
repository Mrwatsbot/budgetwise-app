'use client';

import { useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PlaidLinkButtonProps {
  onSuccess?: (institutionName: string) => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  className?: string;
}

export function PlaidLinkButton({ onSuccess, variant = 'default', className }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch link token when component mounts
  const fetchLinkToken = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create link token');
      }

      const data = await response.json();
      setLinkToken(data.link_token);
    } catch (error: any) {
      toast.error(error.message || 'Failed to initialize Plaid Link');
    } finally {
      setLoading(false);
    }
  };

  // Handle successful Plaid Link
  const onPlaidSuccess = async (public_token: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to connect account');
      }

      const data = await response.json();
      
      toast.success(`Connected to ${data.institution_name}. Syncing transactions...`);

      if (onSuccess) {
        onSuccess(data.institution_name);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect account');
    } finally {
      setLoading(false);
      setLinkToken(null); // Reset link token
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: () => {
      setLinkToken(null);
    },
  });

  const handleClick = () => {
    if (linkToken && ready) {
      open();
    } else {
      fetchLinkToken();
    }
  };

  // Auto-open when link token is ready
  if (linkToken && ready && !loading) {
    open();
  }

  return (
    <Button
      variant={variant}
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        'Connect Bank Account'
      )}
    </Button>
  );
}
