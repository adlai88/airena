import { NextRequest, NextResponse } from 'next/server';
import { UsageTracker } from '@/lib/usage-tracking';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Get authentication info (optional for free users)
    let userId: string | undefined = undefined;
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      userId = session?.user?.id || undefined;
    } catch {
      // No authentication required for free users
      userId = undefined;
    }
    
    // Get session ID for usage tracking - don't generate new one  
    const sessionId = req.headers.get('x-session-id') || 
                     req.cookies.get('airena_session_id')?.value;
    
    if (!sessionId && !userId) {
      // No session ID and no user ID - return default limits without counting
      return NextResponse.json({
        channelCount: 0,
        channelLimit: 3,
        userTier: 'free',
        canAddMoreChannels: true
      });
    }

    // Get channel count and limits (sessionId could be undefined for authenticated users)
    const channelCount = await UsageTracker.getUserChannelCount(sessionId || '', userId);
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