import { NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { stripe } from '@/lib/stripe';

export async function POST() {
  const guard = await apiGuard(10);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  try {
    // Get user's stripe_customer_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    const profileData = profile as { stripe_customer_id: string | null } | null;
    if (!profileData?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Create Billing Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: profileData.stripe_customer_id!,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Stripe portal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
