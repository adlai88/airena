import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { UserService } from '@/lib/user-service';

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    const userId = session?.user?.id || null;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has an API key stored
    const arenaApiKey = await UserService.getArenaApiKey(userId);
    const hasApiKey = !!arenaApiKey;
    
    const tier = await UserService.getUserTier(userId);

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
    const session = await auth.api.getSession({
      headers: await headers()
    });
    const userId = session?.user?.id || null;
    
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
    const session = await auth.api.getSession({
      headers: await headers()
    });
    const userId = session?.user?.id || null;
    
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