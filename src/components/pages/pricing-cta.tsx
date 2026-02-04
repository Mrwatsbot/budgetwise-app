'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface PricingCTAProps {
  tier: 'free' | 'plus' | 'pro';
  cta: string;
  highlighted?: boolean;
}

export function PricingCTA({ tier, cta, highlighted }: PricingCTAProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async (targetTier: 'plus' | 'pro') => {
    setLoading(true);
    try {
      // Check if user is logged in
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Redirect to signup with plan parameter
        window.location.href = `/signup?plan=${targetTier}`;
        return;
      }

      // User is logged in, create checkout session
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: targetTier }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout');
      setLoading(false);
    }
  };

  if (tier === 'free') {
    return (
      <Button
        asChild
        variant="outline"
        className="w-full"
      >
        <Link href="/signup">
          {cta}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </Button>
    );
  }

  return (
    <Button
      onClick={() => handleUpgrade(tier)}
      disabled={loading}
      className={
        highlighted
          ? 'w-full gradient-btn border-0'
          : 'w-full'
      }
      variant={highlighted ? 'default' : 'outline'}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          {cta}
          <ArrowRight className="w-4 h-4 ml-2" />
        </>
      )}
    </Button>
  );
}
