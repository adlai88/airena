import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { UserService } from '@/lib/user-service';

export async function GET() {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ tier: 'free' });
    }

    const tier = await UserService.getUserTier(userId);
    
    return NextResponse.json({ tier });
  } catch (error) {
    console.error('Error getting user tier:', error);
    return NextResponse.json({ tier: 'free' });
  }
}