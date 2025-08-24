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
    metadata?: Record<string, unknown>;
    customer_metadata?: Record<string, unknown>;
    customer?: {
      metadata?: Record<string, unknown>;
    };
  };
}

export async function GET() {
  console.log('🔍 Webhook GET endpoint accessed');
  return NextResponse.json({ 
    status: 'Webhook endpoint accessible',
    timestamp: new Date().toISOString() 
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, polar-signature',
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚨 WEBHOOK CALLED! Headers:', Object.fromEntries(request.headers.entries()));
    
    // Verify webhook signature
    const signature = request.headers.get('webhook-signature') || request.headers.get('polar-signature');
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
    
    console.log('🔍 Signature present:', !!signature);
    console.log('🔍 Webhook secret present:', !!webhookSecret);
    console.log('🔍 Signature value:', signature);
    
    // TEMPORARILY DISABLE signature verification to debug payload
    // if (!signature || !webhookSecret) {
    //   console.log('❌ Missing signature or secret');
    //   return NextResponse.json(
    //     { error: 'Missing webhook signature or secret' },
    //     { status: 401 }
    //   );
    // }

    const body = await request.text();
    console.log('🔍 Raw webhook body:', body);
    
    // TODO: Implement signature verification
    // const isValid = verifyWebhookSignature(body, signature, webhookSecret);
    // if (!isValid) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const event: PolarWebhookEvent = JSON.parse(body);
    
    // Debug logging to see what Polar actually sends
    console.log('🔍 Webhook event received:', {
      type: event.type,
      productId: event.data.product_id,
      metadata: event.data.metadata,
      customerMetadata: event.data.customer_metadata,
      customerId: event.data.customer_id,
      status: event.data.status
    });

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
      
      case 'order.paid':
        await handleOrderPaid(event);
        break;
      
      case 'order.updated':
        await handleOrderUpdated(event);
        break;
      
      case 'customer.updated':
        await handleCustomerUpdated(event);
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
    const { subscription_id } = event.data;
    const userId = extractUserId(event);
    const metadata = extractMetadata(event);
    
    if (!userId) {
      console.error('❌ No userId in subscription metadata');
      return;
    }

    // Determine tier from product/metadata
    const tier = determineTierFromProduct(event.data.product_id, metadata);
    console.log('🔍 Subscription created - userId:', userId, 'tier:', tier);
    
    // Update user subscription
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
    const { subscription_id, status } = event.data;
    const userId = extractUserId(event);
    const metadata = extractMetadata(event);
    
    if (!userId) {
      console.error('❌ No userId in subscription metadata');
      return;
    }

    const tier = determineTierFromProduct(event.data.product_id, metadata);
    console.log('🔍 Subscription updated - userId:', userId, 'tier:', tier, 'status:', status);
    
    await UserService.updateUserTier(userId, tier, {
      polarCustomerId: event.data.customer_id,
      subscriptionId: subscription_id,
      status: status
    });

    console.log(`Subscription updated for user ${userId}, status: ${status}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionCanceled(event: PolarWebhookEvent) {
  try {
    const { subscription_id } = event.data;
    const userId = extractUserId(event);
    
    if (!userId) {
      console.error('❌ No userId in subscription metadata');
      return;
    }
    
    console.log('🔍 Subscription canceled - userId:', userId);

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
    const userId = extractUserId(event);
    const metadata = extractMetadata(event);
    
    if (!userId) {
      console.error('❌ No userId in payment metadata');
      return;
    }

    // Payment succeeded - ensure subscription is active
    const tier = determineTierFromProduct(event.data.product_id, metadata);
    console.log('🔍 Payment succeeded - userId:', userId, 'tier:', tier);
    
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
    const userId = extractUserId(event);
    
    if (!userId) {
      console.error('❌ No userId in payment metadata');
      return;
    }
    
    console.log('🔍 Payment failed - userId:', userId);

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

async function handleCustomerUpdated(event: PolarWebhookEvent) {
  try {
    const userId = extractUserId(event);
    
    if (!userId) {
      console.error('❌ No userId in customer metadata');
      return;
    }
    
    console.log('🔍 Customer updated - userId:', userId);
    
    // For customer.updated events, we generally don't change tiers
    // unless there's specific tier information in the metadata
    const metadata = extractMetadata(event);
    
    if (metadata.tier) {
      const tier = metadata.tier as string;
      // Clean up tier value (remove any suffixes like "-t")
      const cleanTier = tier.replace(/-.*$/, '') as 'free' | 'founding';
      
      if (['free', 'founding'].includes(cleanTier)) {
        console.log(`🔍 Updating tier based on customer metadata: ${cleanTier}`);
        
        await UserService.updateUserTier(userId, cleanTier, {
          polarCustomerId: event.data.id,
          status: 'active'
        });
        
        console.log(`Customer updated for user ${userId}, tier: ${cleanTier}`);
      } else {
        console.log(`⚠️ Invalid tier in customer metadata: ${tier}`);
      }
    } else {
      console.log('ℹ️ Customer updated but no tier change needed');
    }
  } catch (error) {
    console.error('Error handling customer updated:', error);
  }
}

async function handleOrderPaid(event: PolarWebhookEvent) {
  try {
    const userId = extractUserId(event);
    const metadata = extractMetadata(event);
    
    if (!userId) {
      console.error('❌ No userId in order paid metadata');
      return;
    }

    // Order paid - ensure subscription is active
    const tier = determineTierFromProduct(event.data.product_id, metadata);
    console.log('🔍 Order paid - userId:', userId, 'tier:', tier);
    
    await UserService.updateUserTier(userId, tier, {
      polarCustomerId: event.data.customer_id,
      status: 'active'
    });

    console.log(`Order paid for user ${userId}, tier: ${tier}`);
  } catch (error) {
    console.error('Error handling order paid:', error);
  }
}

async function handleOrderUpdated(event: PolarWebhookEvent) {
  try {
    const userId = extractUserId(event);
    const metadata = extractMetadata(event);
    
    if (!userId) {
      console.error('❌ No userId in order updated metadata');
      return;
    }

    const tier = determineTierFromProduct(event.data.product_id, metadata);
    console.log('🔍 Order updated - userId:', userId, 'tier:', tier, 'status:', event.data.status);
    
    // Update tier based on order status
    await UserService.updateUserTier(userId, tier, {
      polarCustomerId: event.data.customer_id,
      status: event.data.status
    });

    console.log(`Order updated for user ${userId}, status: ${event.data.status}`);
  } catch (error) {
    console.error('Error handling order updated:', error);
  }
}

// Helper function to extract userId from either metadata location
function extractUserId(event: PolarWebhookEvent): string | null {
  // Based on the actual Polar payload, userId is in customer.metadata
  const userId = event.data.customer?.metadata?.userId || event.data.metadata?.userId || event.data.customer_metadata?.userId;
  console.log('🔍 Extracted userId:', userId);
  return userId as string | null;
}

// Helper function to extract metadata (prioritize customer_metadata)
function extractMetadata(event: PolarWebhookEvent): Record<string, unknown> {
  return event.data.customer_metadata || event.data.metadata || {};
}

function determineTierFromProduct(productId: string, metadata?: Record<string, unknown>): UserTier {
  // If tier is explicitly in metadata, use it
  if (metadata?.tier) {
    return metadata.tier as UserTier;
  }

  // Otherwise, map product ID to tier
  const productTierMap: Record<string, UserTier> = {
    '2939287a-ef9c-41de-9d8b-e89dad1be367': 'free',
    'd465ee17-1a85-480b-99e7-28c23947f4d1': 'founding', // Production Founding Member product
    '0fe230a4-23ff-4d19-a78a-1e2ba57d10c1': 'founding', // Sandbox Founding Member product
    // Legacy product IDs (mapped to founding)
    '2d078db5-1c02-43ae-bf7a-8b763fd26140': 'founding', // was starter monthly
    'bda6be16-5294-4b12-8973-6ccdd0bf05e7': 'founding'  // was pro monthly
  };

  return productTierMap[productId] || 'free';
}