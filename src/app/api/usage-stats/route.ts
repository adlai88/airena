import { NextResponse } from 'next/server';
import { UsageTracker } from '@/lib/usage-tracking';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const stats = await UsageTracker.getUserStats('', userId);
    
    // Add tier info to the response
    const tierInfo = UsageTracker.getTierInfo(stats.tier);
    
    return NextResponse.json({
      ...stats,
      tierInfo
    });
  } catch (error) {
    console.error('Error getting usage stats:', error);
    return NextResponse.json(
      { error: 'Failed to get usage statistics' },
      { status: 500 }
    );
  }
}