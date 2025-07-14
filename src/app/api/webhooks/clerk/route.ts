import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/user-service';

export async function POST(request: NextRequest) {
  try {
    const { type, data } = await request.json();
    
    console.log('🔍 Clerk webhook received:', type);
    
    if (type === 'user.created') {
      console.log('🔍 Setting up new user:', data.id);
      
      // Initialize new user with free tier
      await UserService.updateUserTier(data.id, 'free', {
        status: 'active'
      });
      
      console.log(`✅ User ${data.id} initialized with free tier`);
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('❌ Clerk webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}