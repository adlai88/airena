import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Try to create a test user directly
    const testUser = {
      email: body.email || 'test@example.com',
      password: body.password || 'testpassword123',
      name: body.name || 'Test User'
    };
    
    console.log('Testing Better Auth with:', testUser);
    
    // Check if Better Auth is initialized
    console.log('Auth object exists:', !!auth);
    console.log('Auth methods:', Object.keys(auth || {}));
    
    return NextResponse.json({
      success: true,
      message: 'Better Auth test endpoint',
      authExists: !!auth,
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasBetterAuthSecret: !!process.env.BETTER_AUTH_SECRET,
        hasPolarApiKey: !!process.env.POLAR_API_KEY
      }
    });
  } catch (error) {
    console.error('Test Better Auth error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}