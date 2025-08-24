import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Checkout API called');
    
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id;
    console.log('🔍 Auth successful, userId:', userId);
    
    if (!userId) {
      console.log('❌ No userId found after auth');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('🔍 Request body:', body);
    const { tier, billing = 'monthly' } = body;

    if (!tier || !['free', 'starter', 'pro'].includes(tier)) {
      console.log('❌ Invalid tier:', tier);
      return NextResponse.json(
        { error: 'Invalid tier' },
        { status: 400 }
      );
    }

    // Map tier and billing to product ID
    const PRODUCT_IDS = {
      free: '2939287a-ef9c-41de-9d8b-e89dad1be367',
      starter_monthly: '2d078db5-1c02-43ae-bf7a-8b763fd26140',
      starter_annual: '3fff0f35-d90b-4f2d-bad9-6901128e5f28',
      pro_monthly: 'bda6be16-5294-4b12-8973-6ccdd0bf05e7',
      pro_annual: 'dc8f5557-4783-4226-970a-7e1f200a1f8c'
    };

    const productKey = tier === 'free' ? 'free' : `${tier}_${billing}`;
    const productId = PRODUCT_IDS[productKey as keyof typeof PRODUCT_IDS];
    console.log('🔍 Product key:', productKey, 'Product ID:', productId);
    
    if (!productId || productId.startsWith('PLACEHOLDER_')) {
      console.log('❌ Product not found for tier:', tier, 'billing:', billing);
      return NextResponse.json(
        { error: `Product not found for ${tier} ${billing}. Please create the annual products in Polar first.` },
        { status: 400 }
      );
    }

    // Create checkout session using Polar.sh SDK
    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pricing?success=true&tier=${tier}`;
    console.log('🔍 Success URL:', successUrl);
    console.log('🔍 Product ID:', productId);
    console.log('🔍 Using Polar API Key:', process.env.POLAR_API_KEY ? 'Present' : 'Missing');
    
    try {
      // Get user's current tier to determine if this is an upgrade/downgrade
      let currentUserTier = 'free';
      try {
        const tierResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/user-tier`, {
          headers: { 'cookie': request.headers.get('cookie') || '' }
        });
        if (tierResponse.ok) {
          const tierData = await tierResponse.json();
          currentUserTier = tierData.tier;
        }
      } catch (error) {
        console.log('⚠️ Could not fetch current tier:', error);
      }

    console.log('🔍 Current tier:', currentUserTier, 'Target tier:', tier);

    // For upgrades/downgrades, we might need to handle differently
    // Let's try with customer_email to link to existing customer
    const checkoutPayload: {
      product_id: string;
      success_url: string;
      customer_metadata: Record<string, unknown>;
      customer_email?: string;
    } = {
      product_id: productId,
      success_url: successUrl,
      customer_metadata: {
        userId,
        tier,
        source: 'aryn',
        previousTier: currentUserTier,
        action: currentUserTier === 'free' ? 'subscribe' : 
               currentUserTier === tier ? 'renew' : 'upgrade'
      }
    };

    // For existing customers (upgrades), try to link by email
    if (currentUserTier !== 'free') {
      try {
        // Get user email from session
        if (session?.user?.email) {
          checkoutPayload.customer_email = session.user.email;
          console.log('🔍 Adding customer_email for existing customer:', session.user.email);
        }
      } catch (error) {
        console.log('⚠️ Could not get user email:', error);
      }
    }

    console.log('🔍 Checkout payload:', JSON.stringify(checkoutPayload, null, 2));

    // Create checkout session with Polar API
      const checkoutResponse = await fetch('https://api.polar.sh/v1/checkouts/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.POLAR_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutPayload),
      });

      console.log('🔍 Polar API response status:', checkoutResponse.status);
      
      if (!checkoutResponse.ok) {
        const errorText = await checkoutResponse.text();
        console.error('❌ Polar API error:', errorText);
        throw new Error(`Polar API error: ${checkoutResponse.status} - ${errorText}`);
      }

      const checkoutData = await checkoutResponse.json();
      console.log('🔍 Polar checkout data:', checkoutData);
      
      return NextResponse.json({
        checkoutUrl: checkoutData.url,
        productId
      });

    } catch (polarError) {
      console.error('❌ Polar checkout error:', polarError);
      throw new Error(`Failed to create Polar checkout: ${polarError instanceof Error ? polarError.message : 'Unknown error'}`);
    }

  } catch (error) {
    console.error('❌ Checkout error details:', error);
    console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}