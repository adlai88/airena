import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { auth as betterAuth } from '@/lib/auth';
import { headers } from 'next/headers';
import { UserService } from '@/lib/user-service';
import { UserServiceV2 } from '@/lib/user-service-v2';

export async function GET() {
  try {
    const isNewAuth = process.env.NEXT_PUBLIC_USE_BETTER_AUTH === 'true';
    let userId: string | null = null;
    
    if (isNewAuth) {
      const session = await betterAuth.api.getSession({
        headers: headers()
      });
      userId = session?.user?.id || null;
    } else {
      const { userId: clerkUserId } = await auth();
      userId = clerkUserId;
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has an API key stored
    const arenaApiKey = isNewAuth 
      ? await UserServiceV2.getArenaApiKey(userId)
      : await UserService.getUserArenaApiKey(userId);
    const hasApiKey = !!arenaApiKey;
    
    const tier = isNewAuth
      ? await UserServiceV2.getUserTier(userId)
      : (await UserService.getUserSubscription(userId)).tier;

    return NextResponse.json({
      hasApiKey,
      tier
    });

  } catch (error) {
    console.error('Error getting user settings:', error);
    return NextResponse.json(
      { error: 'Failed to get user settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const isNewAuth = process.env.NEXT_PUBLIC_USE_BETTER_AUTH === 'true';
    let userId: string | null = null;
    
    if (isNewAuth) {
      const session = await betterAuth.api.getSession({
        headers: headers()
      });
      userId = session?.user?.id || null;
    } else {
      const { userId: clerkUserId } = await auth();
      userId = clerkUserId;
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { arenaApiKey } = await request.json();

    if (!arenaApiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // Store the API key in user metadata
    await UserService.updateUserSettings(userId, { arenaApiKey });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error saving user settings:', error);
    return NextResponse.json(
      { error: 'Failed to save user settings' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Remove the API key from user metadata
    await UserService.updateUserSettings(userId, { arenaApiKey: null });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error removing user settings:', error);
    return NextResponse.json(
      { error: 'Failed to remove user settings' },
      { status: 500 }
    );
  }
}