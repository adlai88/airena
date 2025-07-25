import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Get session using Better Auth
    const session = await auth.api.getSession({
      headers: headers()
    });
    
    if (!session) {
      return NextResponse.json({
        authenticated: false,
        message: 'No session found'
      });
    }
    
    return NextResponse.json({
      authenticated: true,
      session: {
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name,
        emailVerified: session.user.emailVerified,
        createdAt: session.user.createdAt
      },
      sessionExpires: session.session.expiresAt
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({
      authenticated: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}