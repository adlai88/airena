import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { UserService } from '@/lib/user-service';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Cancel subscription request for user:', userId);

    // Get user's current subscription info
    const { clerkClient } = await import('@clerk/nextjs/server');
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    
    const metadata = user.privateMetadata as any;
    const subscriptionId = metadata?.subscriptionId;
    const polarCustomerId = metadata?.polarCustomerId;

    if (!subscriptionId) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
    }

    console.log('🔍 Canceling subscription:', subscriptionId);

    // Cancel subscription via Polar API
    const cancelResponse = await fetch(`https://api.polar.sh/v1/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.POLAR_API_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    if (!cancelResponse.ok) {
      const errorText = await cancelResponse.text();
      console.error('❌ Polar cancellation error:', errorText);
      throw new Error(`Failed to cancel subscription: ${cancelResponse.status} - ${errorText}`);
    }

    const cancelData = await cancelResponse.json();
    console.log('✅ Subscription canceled:', cancelData);

    // Immediately downgrade user to free tier
    await UserService.updateUserTier(userId, 'free', {
      subscriptionId: null,
      polarCustomerId: polarCustomerId,
      status: 'cancelled'
    });

    console.log(`✅ User ${userId} downgraded to free tier`);

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription canceled successfully. You have been downgraded to the free tier.' 
    });

  } catch (error) {
    console.error('❌ Subscription cancellation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to cancel subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}