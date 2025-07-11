import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Checkout } from '@polar-sh/nextjs';

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tier } = body;

    if (!tier) {
      return NextResponse.json(
        { error: 'Tier is required' },
        { status: 400 }
      );
    }

    // Map tiers to actual Polar.sh product IDs
    const PRODUCT_IDS = {
      starter: '2d078db5-1c02-43ae-bf7a-8b763fd26140',
      pro: 'bda6be16-5294-4b12-8973-6ccdd0bf05e7'
    };

    const productId = PRODUCT_IDS[tier as keyof typeof PRODUCT_IDS];
    
    if (!productId) {
      return NextResponse.json(
        { error: 'Invalid tier specified' },
        { status: 400 }
      );
    }

    // Create Polar checkout session
    const checkout = await Checkout({
      accessToken: process.env.POLAR_ACCESS_TOKEN!,
      productId: productId,
      successUrl: process.env.NEXT_PUBLIC_SUCCESS_URL || `${process.env.NEXT_PUBLIC_APP_URL}/success`,
      customerEmail: '', // Will be populated by Clerk user data
      metadata: {
        userId,
        tier,
        source: 'airena'
      }
    });

    return NextResponse.json({
      checkoutUrl: checkout.url,
      checkoutId: checkout.id
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

// Alternative: Direct checkout handler
export const GET = Checkout({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  successUrl: process.env.NEXT_PUBLIC_SUCCESS_URL!,
});