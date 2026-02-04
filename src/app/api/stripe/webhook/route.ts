import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';
import Stripe from 'stripe';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

const PRICE_TO_TIER: Record<string, 'plus' | 'pro'> = {
  [process.env.STRIPE_PLUS_PRICE_ID!]: 'plus',
  [process.env.STRIPE_PRO_PRICE_ID!]: 'pro',
};

/**
 * Helper to determine tier from subscription
 */
function getTierFromSubscription(subscription: Stripe.Subscription): 'plus' | 'pro' | 'free' {
  const priceId = subscription.items.data[0]?.price.id;
  return PRICE_TO_TIER[priceId] || 'free';
}

/**
 * Helper to get user_id from customer
 */
async function getUserIdFromCustomer(customerId: string): Promise<string | null> {
  const { data: profile } = await (supabaseAdmin as any)
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();
  return (profile as { id: string } | null)?.id || null;
}

/**
 * Log event to billing_events table
 */
async function logBillingEvent(params: {
  user_id: string;
  stripe_event_id: string;
  event_type: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  amount?: number;
  currency?: string;
  tier?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await (supabaseAdmin as any).from('billing_events').insert({
      user_id: params.user_id,
      stripe_event_id: params.stripe_event_id,
      event_type: params.event_type,
      stripe_customer_id: params.stripe_customer_id || null,
      stripe_subscription_id: params.stripe_subscription_id || null,
      amount: params.amount || null,
      currency: params.currency || 'usd',
      tier: params.tier || null,
      status: params.status || null,
      metadata: params.metadata || {},
    });
  } catch (error) {
    console.error('Failed to log billing event:', error);
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  // Verify webhook signature
  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (error: unknown) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid signature' },
      { status: 400 }
    );
  }

  console.log(`[Stripe Webhook] ${event.type} - ${event.id}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const userId = session.client_reference_id || session.metadata?.supabase_user_id;

        if (!userId) {
          console.error('No user_id in checkout session');
          break;
        }

        // Retrieve subscription to get tier
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const tier = getTierFromSubscription(subscription);

        // Update profile
        await (supabaseAdmin as any)
          .from('profiles')
          .update({
            subscription_tier: tier,
            subscription_status: 'active',
            stripe_customer_id: customerId,
          })
          .eq('id', userId);

        // Log event
        await logBillingEvent({
          user_id: userId,
          stripe_event_id: event.id,
          event_type: event.type,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          amount: session.amount_total ?? undefined,
          tier,
          status: 'active',
          metadata: session.metadata || {},
        });

        console.log(`✅ Checkout completed for user ${userId} - tier: ${tier}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const userId = await getUserIdFromCustomer(customerId);

        if (!userId) {
          console.error('No user found for customer:', customerId);
          break;
        }

        const tier = getTierFromSubscription(subscription);
        const status = subscription.status === 'active' ? 'active' : 
                      subscription.status === 'past_due' ? 'past_due' : 
                      'canceled';

        // Update profile
        await (supabaseAdmin as any)
          .from('profiles')
          .update({
            subscription_tier: tier,
            subscription_status: status,
          })
          .eq('id', userId);

        // Log event
        await logBillingEvent({
          user_id: userId,
          stripe_event_id: event.id,
          event_type: event.type,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          tier,
          status,
        });

        console.log(`✅ Subscription updated for user ${userId} - tier: ${tier}, status: ${status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const userId = await getUserIdFromCustomer(customerId);

        if (!userId) {
          console.error('No user found for customer:', customerId);
          break;
        }

        // Downgrade to free
        await (supabaseAdmin as any)
          .from('profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'canceled',
          })
          .eq('id', userId);

        // Log event
        await logBillingEvent({
          user_id: userId,
          stripe_event_id: event.id,
          event_type: event.type,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          tier: 'free',
          status: 'canceled',
        });

        console.log(`✅ Subscription canceled for user ${userId} - downgraded to free`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const userId = await getUserIdFromCustomer(customerId);

        if (!userId) {
          console.error('No user found for customer:', customerId);
          break;
        }

        // Mark as past_due
        await (supabaseAdmin as any)
          .from('profiles')
          .update({ subscription_status: 'past_due' })
          .eq('id', userId);

        // Log event
        await logBillingEvent({
          user_id: userId,
          stripe_event_id: event.id,
          event_type: event.type,
          stripe_customer_id: customerId,
          stripe_subscription_id: (invoice as any).subscription as string,
          amount: invoice.amount_due,
          currency: invoice.currency,
          status: 'past_due',
        });

        console.log(`⚠️ Payment failed for user ${userId}`);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const userId = await getUserIdFromCustomer(customerId);

        if (!userId) {
          console.error('No user found for customer:', customerId);
          break;
        }

        // Mark as active (handles retry success)
        await (supabaseAdmin as any)
          .from('profiles')
          .update({ subscription_status: 'active' })
          .eq('id', userId);

        // Log event
        await logBillingEvent({
          user_id: userId,
          stripe_event_id: event.id,
          event_type: event.type,
          stripe_customer_id: customerId,
          stripe_subscription_id: (invoice as any).subscription as string,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: 'active',
        });

        console.log(`✅ Payment succeeded for user ${userId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
