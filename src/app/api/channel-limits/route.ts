import { NextRequest, NextResponse } from 'next/server';
import { UsageTracker } from '@/lib/usage-tracking';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  try {
    // Get authentication info (optional for free users)
    let userId: string | undefined = undefined;
    try {
      const authResult = await auth();
      userId = authResult.userId || undefined;
    } catch {
      // No authentication required for free users
      userId = undefined;
    }
    
    // Get or use session ID for usage tracking
    const sessionId = req.headers.get('x-session-id') || 
                     req.cookies.get('airena_session_id')?.value ||
                     `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get channel count and limits
    const channelCount = await UsageTracker.getUserChannelCount(sessionId, userId);
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