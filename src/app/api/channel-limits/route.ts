import { NextRequest, NextResponse } from 'next/server';
import { UsageTracker } from '@/lib/usage-tracking';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Get authentication info (required)
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;

    // Get channel count and limits
    const channelCount = await UsageTracker.getUserChannelCount('', userId);
    const userTier = await UsageTracker.getUserTier(userId);
    
    const response = {
      channelCount,
      channelLimit: userTier === 'free' ? 3 : -1, // -1 means unlimited
      userTier,
      canAddMoreChannels: userTier === 'free' ? channelCount < 3 : true
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting channel limits:', error);
    return NextResponse.json(
      { error: 'Failed to get channel limits' },
      { status: 500 }
    );
  }
}