import { NextResponse } from 'next/server';
import { SimpleUsageTracker } from '@/lib/simple-usage';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
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
    
    // Get lifetime usage stats
    const stats = await SimpleUsageTracker.getUserStats(userId);
    
    return NextResponse.json({
      blocksUsed: stats.blocksUsed,
      blocksRemaining: stats.blocksRemaining,
      percentUsed: stats.percentUsed,
      tier: stats.tier,
      // Add limit info for UI display
      limit: stats.tier === 'free' ? 50 : null,
      hasLifetimeLimit: stats.tier === 'free'
    });
  } catch (error) {
    console.error('Error getting lifetime usage:', error);
    return NextResponse.json(
      { error: 'Failed to get usage statistics' },
      { status: 500 }
    );
  }
}