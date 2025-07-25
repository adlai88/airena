import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { UserService } from '@/lib/user-service';

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id;
    
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