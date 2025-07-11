import { NextRequest, NextResponse } from 'next/server';
import { UsageTracker } from '@/lib/usage-tracking';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');

    if (!sessionId && !userId) {
      return NextResponse.json(
        { error: 'Session ID or User ID is required' },
        { status: 400 }
      );
    }

    const stats = await UsageTracker.getUserStats(
      sessionId || '',
      userId || undefined
    );

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting usage stats:', error);
    return NextResponse.json(
      { error: 'Failed to get usage statistics' },
      { status: 500 }
    );
  }
}