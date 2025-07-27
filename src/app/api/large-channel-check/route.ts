import { NextRequest, NextResponse } from 'next/server';
import { UsageTracker } from '@/lib/usage-tracking';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
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
    const { channelBlocks } = await req.json();
    
    if (!channelBlocks || typeof channelBlocks !== 'number') {
      return NextResponse.json(
        { error: 'Channel blocks count is required' },
        { status: 400 }
      );
    }

    // Check for large channel warning
    const warningResult = await UsageTracker.checkLargeChannelWarning(
      channelBlocks,
      '', // Empty session ID since we're using userId
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