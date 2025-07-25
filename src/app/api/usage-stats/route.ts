import { NextResponse } from 'next/server';
import { UsageTracker } from '@/lib/usage-tracking';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id;
    
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