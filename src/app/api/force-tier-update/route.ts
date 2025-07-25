import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { UserService } from '@/lib/user-service';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tier } = await request.json();
    
    if (!tier || !['free', 'starter', 'pro'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    console.log(`🔧 Manual tier update for user ${userId} to ${tier}`);

    // Update user tier manually
    await UserService.updateUserTier(userId, tier as 'free' | 'starter' | 'pro', {
      status: 'active'
    });

    console.log(`✅ Successfully updated user ${userId} to ${tier}`);

    return NextResponse.json({ 
      success: true, 
      message: `User tier updated to ${tier}` 
    });

  } catch (error) {
    console.error('❌ Manual tier update error:', error);
    return NextResponse.json(
      { error: 'Failed to update tier' },
      { status: 500 }
    );
  }
}