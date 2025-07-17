import { NextResponse } from 'next/server';
import { UsageTracker } from '@/lib/usage-tracking';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    console.log('🔍 DEBUG: userId from auth:', userId);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('🔍 DEBUG: Calling getUserStats with sessionId="", userId=', userId);
    const stats = await UsageTracker.getUserStats('', userId);
    console.log('🔍 DEBUG: getUserStats result:', {
      tier: stats.tier,
      monthlyUsage: stats.monthly,
      channelCount: stats.channels.length,
      totalBlocks: stats.totalBlocksProcessed
    });
    
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