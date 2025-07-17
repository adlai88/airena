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
    console.error('🔍 DEBUG: Error getting usage stats:', error);
    console.error('🔍 DEBUG: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('🔍 DEBUG: Error message:', error instanceof Error ? error.message : error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get usage statistics',
        debug: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}