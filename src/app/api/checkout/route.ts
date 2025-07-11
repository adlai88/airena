import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Checkout API called');
    
    const { userId } = await auth();
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
    const { tier } = body;

    if (!tier || !['starter', 'pro'].includes(tier)) {
      console.log('❌ Invalid tier:', tier);
      return NextResponse.json(
        { error: 'Invalid tier' },
        { status: 400 }
      );
    }

    // Map tier to product ID
    const PRODUCT_IDS = {
      starter: '2d078db5-1c02-43ae-bf7a-8b763fd26140',
      pro: 'bda6be16-5294-4b12-8973-6ccdd0bf05e7'
    };

    const productId = PRODUCT_IDS[tier as keyof typeof PRODUCT_IDS];
    console.log('🔍 Product ID for tier', tier, ':', productId);
    
    if (!productId) {
      console.log('❌ Product not found for tier:', tier);
      return NextResponse.json(
        { error: 'Product not found for tier' },
        { status: 400 }
      );
    }

    // Create checkout session using Polar.sh SDK
    const successUrl = process.env.NEXT_PUBLIC_SUCCESS_URL || `${process.env.NEXT_PUBLIC_APP_URL}/success`;
    console.log('🔍 Success URL:', successUrl);
    console.log('🔍 Product ID:', productId);
    console.log('🔍 Using Polar API Key:', process.env.POLAR_API_KEY ? 'Present' : 'Missing');
    
    try {
      // Create checkout session with Polar API
      const checkoutResponse = await fetch('https://api.polar.sh/v1/checkouts/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.POLAR_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: productId,
          success_url: successUrl,
          customer_metadata: {
            userId,
            tier,
            source: 'airena'
          },
          embed: true  // Request embeddable checkout
        }),
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