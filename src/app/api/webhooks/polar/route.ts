import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/user-service';
import { UserTier } from '@/lib/usage-tracking';

// Polar.sh webhook event types
interface PolarWebhookEvent {
  type: string;
  data: {
    id: string;
    customer_id: string;
    customer_email: string;
    product_id: string;
    subscription_id?: string;
    status: string;
    metadata?: Record<string, any>;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('polar-signature');
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
    
    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: 'Missing webhook signature or secret' },
        { status: 401 }
      );
    }

    const body = await request.text();
    
    // TODO: Implement signature verification
    // const isValid = verifyWebhookSignature(body, signature, webhookSecret);
    // if (!isValid) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const event: PolarWebhookEvent = JSON.parse(body);

    // Handle different event types
    switch (event.type) {
      case 'subscription.created':
        await handleSubscriptionCreated(event);
        break;
      
      case 'subscription.updated':
        await handleSubscriptionUpdated(event);
        break;
      
      case 'subscription.canceled':
        await handleSubscriptionCanceled(event);
        break;
      
      case 'payment.succeeded':
        await handlePaymentSucceeded(event);
        break;
      
      case 'payment.failed':
        await handlePaymentFailed(event);
        break;
      
      default:
        console.log('Unhandled webhook event:', event.type);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionCreated(event: PolarWebhookEvent) {
  try {
    const { customer_email, metadata, subscription_id } = event.data;
    const userId = metadata?.userId;
    
    if (!userId) {
      console.error('No userId in subscription metadata');
      return;
    }

    // Determine tier from product/metadata
    const tier = determineTierFromProduct(event.data.product_id, metadata);
    
    // Update user subscription in Clerk
    await UserService.updateUserTier(userId, tier, {
      polarCustomerId: event.data.customer_id,
      subscriptionId: subscription_id,
      status: 'active'
    });

    console.log(`Subscription created for user ${userId}, tier: ${tier}`);
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

async function handleSubscriptionUpdated(event: PolarWebhookEvent) {
  try {
    const { customer_email, metadata, subscription_id, status } = event.data;
    const userId = metadata?.userId;
    
    if (!userId) {
      console.error('No userId in subscription metadata');
      return;
    }

    const tier = determineTierFromProduct(event.data.product_id, metadata);
    
    await UserService.updateUserTier(userId, tier, {
      polarCustomerId: event.data.customer_id,
      subscriptionId: subscription_id,
      status: status as any
    });

    console.log(`Subscription updated for user ${userId}, status: ${status}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionCanceled(event: PolarWebhookEvent) {
  try {
    const { metadata, subscription_id } = event.data;
    const userId = metadata?.userId;
    
    if (!userId) {
      console.error('No userId in subscription metadata');
      return;
    }

    // Downgrade to free tier
    await UserService.updateUserTier(userId, 'free', {
      subscriptionId: subscription_id,
      status: 'cancelled'
    });

    console.log(`Subscription canceled for user ${userId}`);
  } catch (error) {
    console.error('Error handling subscription canceled:', error);
  }
}

async function handlePaymentSucceeded(event: PolarWebhookEvent) {
  try {
    const { metadata } = event.data;
    const userId = metadata?.userId;
    
    if (!userId) {
      console.error('No userId in payment metadata');
      return;
    }

    // Payment succeeded - ensure subscription is active
    const tier = determineTierFromProduct(event.data.product_id, metadata);
    
    await UserService.updateUserTier(userId, tier, {
      polarCustomerId: event.data.customer_id,
      status: 'active'
    });

    console.log(`Payment succeeded for user ${userId}`);
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}

async function handlePaymentFailed(event: PolarWebhookEvent) {
  try {
    const { metadata } = event.data;
    const userId = metadata?.userId;
    
    if (!userId) {
      console.error('No userId in payment metadata');
      return;
    }

    // Payment failed - mark subscription as past due
    await UserService.updateUserTier(userId, 'free', {
      polarCustomerId: event.data.customer_id,
      status: 'past_due'
    });

    console.log(`Payment failed for user ${userId}`);
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

function determineTierFromProduct(productId: string, metadata?: Record<string, any>): UserTier {
  // If tier is explicitly in metadata, use it
  if (metadata?.tier) {
    return metadata.tier as UserTier;
  }

  // Otherwise, map product ID to tier
  // TODO: Configure these product IDs in environment variables
  const productTierMap: Record<string, UserTier> = {
    'starter_product_id': 'starter',
    'pro_product_id': 'pro',
    'enterprise_product_id': 'enterprise'
  };

  return productTierMap[productId] || 'free';
}