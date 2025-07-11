import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { tier } = await request.json();

    if (!tier || !['starter', 'pro'].includes(tier)) {
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
    
    if (!productId) {
      return NextResponse.json(
        { error: 'Product not found for tier' },
        { status: 400 }
      );
    }

    // Create checkout URL with Polar.sh
    const baseUrl = process.env.NODE_ENV === 'production' ? 'https://api.polar.sh' : 'https://sandbox-api.polar.sh';
    const successUrl = process.env.NEXT_PUBLIC_SUCCESS_URL || `${process.env.NEXT_PUBLIC_APP_URL}/success`;
    
    const metadata = encodeURIComponent(JSON.stringify({
      userId,
      tier,
      source: 'airena'
    }));

    // Build the Polar.sh checkout URL
    const checkoutUrl = `${baseUrl}/checkout?products=${productId}&successUrl=${encodeURIComponent(successUrl)}&metadata=${metadata}`;

    return NextResponse.json({
      checkoutUrl,
      productId
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}