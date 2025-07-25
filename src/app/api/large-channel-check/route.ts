import { NextRequest, NextResponse } from 'next/server';
import { UsageTracker } from '@/lib/usage-tracking';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
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
    
    const { channelBlocks } = await req.json();
    
    if (!channelBlocks || typeof channelBlocks !== 'number') {
      return NextResponse.json(
        { error: 'Channel blocks count is required' },
        { status: 400 }
      );
    }
    
    // Get or use session ID for usage tracking
    const sessionId = req.headers.get('x-session-id') || 
                     req.cookies.get('airena_session_id')?.value ||
                     `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check for large channel warning
    const warningResult = await UsageTracker.checkLargeChannelWarning(
      channelBlocks,
      sessionId,
      userId
    );

    return NextResponse.json(warningResult);
  } catch (error) {
    console.error('Error checking large channel warning:', error);
    return NextResponse.json(
      { error: 'Failed to check large channel warning' },
      { status: 500 }
    );
  }
}